const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  const { OPENID } = wxContext
  
  const userRes = await db.collection('users').where({
    _openid: OPENID
  }).get()
  
  if (userRes.data.length === 0) {
    await db.collection('users').add({
      data: {
        createTime: db.serverDate(),
        medalCount: 0,
        title: ''
      }
    })
  }
  
  return {
    openid: OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}
