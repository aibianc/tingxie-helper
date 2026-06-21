const cloud = require('wx-server-sdk')
const https = require('https')
const querystring = require('querystring')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

let accessToken = ''
let tokenExpireTime = 0

async function getAccessToken(apiKey, secretKey) {
  const now = Date.now()
  if (accessToken && now < tokenExpireTime) {
    return accessToken
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'aip.baidubce.com',
      path: `/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
      method: 'GET'
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.access_token) {
            accessToken = result.access_token
            tokenExpireTime = now + (result.expires_in - 60) * 1000
            resolve(accessToken)
          } else {
            reject(new Error(result.error_description || '获取token失败'))
          }
        } catch (e) {
          reject(e)
        }
      })
    })
    
    req.on('error', (e) => {
      reject(e)
    })
    
    req.end()
  })
}

exports.main = async (event, context) => {
  const { text, apiKey, secretKey, lang = 'zh', spd = 5, pit = 5, vol = 5 } = event
  
  try {
    const token = await getAccessToken(apiKey, secretKey)
    
    const postData = querystring.stringify({
      tex: text,
      lan: lang,
      tok: token,
      ctp: 1,
      cuid: 'tingxie-miniprogram',
      spd: spd,
      pit: pit,
      vol: vol,
      aue: 6
    })
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'tsn.baidu.com',
        path: '/text2audio',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      }
      
      const req = https.request(options, (res) => {
        let chunks = []
        res.on('data', (chunk) => {
          chunks.push(chunk)
        })
        res.on('end', () => {
          const buffer = Buffer.concat(chunks)
          
          if (res.headers['content-type'] && res.headers['content-type'].includes('json')) {
            try {
              const errorResult = JSON.parse(buffer.toString())
              resolve({
                success: false,
                error: errorResult.err_msg || 'TTS转换失败'
              })
              return
            } catch (e) {
            }
          }
          
          const base64Audio = buffer.toString('base64')
          resolve({
            success: true,
            audio: base64Audio
          })
        })
      })
      
      req.on('error', (e) => {
        resolve({
          success: false,
          error: e.message
        })
      })
      
      req.write(postData)
      req.end()
    })
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
