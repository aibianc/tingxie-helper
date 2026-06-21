//app.js
App({
  onLaunch: function () {
    console.log('[app.js] 小程序启动（云开发模式）')
    
    if (!wx.cloud) {
      console.error('[app.js] 请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      console.log('[app.js] 初始化云开发，环境ID: cloud1-d8gcv4p3ma94907dc')
      try {
        wx.cloud.init({
          env: 'cloud1-d8gcv4p3ma94907dc',
          traceUser: true,
        })
        console.log('[app.js] 云开发初始化完成')
      } catch (e) {
        console.error('[app.js] 云开发初始化失败:', e)
      }
    }
    
    this.globalData = {
      userInfo: null,
      openid: null
    }
    
    // 先检查本地存储
    this.checkLogin()
    // 延迟2秒再静默登录，给云开发留足够时间
    setTimeout(() => {
      this.silentLogin()
    }, 2000)
  },

  checkLogin() {
    console.log('[app.js] 检查登录状态')
    try {
      const userInfo = wx.getStorageSync('userInfo')
      const openid = wx.getStorageSync('openid')
      console.log('[app.js] 本地存储 userInfo:', userInfo)
      console.log('[app.js] 本地存储 openid:', openid)
      
      if (userInfo && openid) {
        this.globalData.userInfo = userInfo
        this.globalData.openid = openid
        console.log('[app.js] 已恢复登录状态')
      }
    } catch (e) {
      console.error('[app.js] 读取本地存储失败:', e)
    }
  },

  // 静默登录 - 云开发模式
  async silentLogin() {
    console.log('[app.js] 开始静默登录')
    
    // 创建一个超时 Promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('静默登录超时'))
      }, 15000) // 15秒超时
    })
    
    // 创建云函数调用 Promise
    const loginPromise = wx.cloud.callFunction({
      name: 'login',
      data: {}
    })
    
    try {
      // 竞速：哪个先完成用哪个
      console.log('[app.js] 调用 login 云函数...')
      const res = await Promise.race([loginPromise, timeoutPromise])
      
      console.log('[app.js] 静默登录成功:', res)
      
      if (res.result && res.result.openid) {
        this.globalData.openid = res.result.openid
        wx.setStorageSync('openid', res.result.openid)
        
        // 如果没有用户信息，设置一个默认的
        if (!this.globalData.userInfo) {
          const defaultUserInfo = {
            nickName: '小朋友',
            avatarUrl: ''
          }
          this.globalData.userInfo = defaultUserInfo
          wx.setStorageSync('userInfo', defaultUserInfo)
        }
        
        console.log('[app.js] 静默登录完成，openid:', this.globalData.openid)
      }
    } catch (err) {
      console.warn('[app.js] 静默登录失败:', err.message)
      console.warn('[app.js] 不影响使用，可以手动登录')
    }
  },

  // 手动登录 - 带提示
  login() {
    console.log('[app.js] 开始手动登录流程')
    
    return new Promise((resolve, reject) => {
      // 先显示加载
      wx.showLoading({ title: '登录中...', mask: true })
      
      // 超时控制
      const timeout = setTimeout(() => {
        wx.hideLoading()
        reject(new Error('登录超时，请检查：\n1. 云开发环境是否开通\n2. 云函数 login 是否已部署\n3. 网络连接是否正常'))
      }, 20000)
      
      console.log('[app.js] 调用 login 云函数...')
      wx.cloud.callFunction({
        name: 'login',
        data: {},
        success: res => {
          clearTimeout(timeout)
          wx.hideLoading()
          
          console.log('[app.js] 云函数调用成功！', res)
          
          if (res.result && res.result.openid) {
            this.globalData.openid = res.result.openid
            wx.setStorageSync('openid', res.result.openid)
            console.log('[app.js] 已获取 openid:', res.result.openid)
            
            // 尝试获取用户信息或使用默认
            this.tryGetUserInfo().then(userInfo => {
              resolve(userInfo)
            }).catch(err => {
              console.warn('[app.js] 获取用户信息失败，使用默认', err)
              const defaultUserInfo = {
                nickName: '小朋友',
                avatarUrl: '',
                gender: 0
              }
              this.globalData.userInfo = defaultUserInfo
              wx.setStorageSync('userInfo', defaultUserInfo)
              resolve(defaultUserInfo)
            })
          } else {
            reject(new Error('登录失败，未获取到 openid，请检查云函数'))
          }
        },
        fail: err => {
          clearTimeout(timeout)
          wx.hideLoading()
          
          console.error('[app.js] 云函数调用失败！', err)
          
          // 给用户更明确的错误提示
          let errorMsg = '登录失败'
          if (err.errMsg && err.errMsg.includes('timeout')) {
            errorMsg = '云函数调用超时，请检查：\n1. 云开发环境是否开通\n2. 云函数 login 是否已部署\n3. 网络连接是否正常'
          } else if (err.errMsg && err.errMsg.includes('FunctionName')) {
            errorMsg = '找不到云函数，请确认 login 云函数已部署'
          } else if (err.errMsg) {
            errorMsg = err.errMsg
          }
          
          reject(new Error(errorMsg))
        }
      })
    })
  },
  
  // 尝试获取用户信息
  tryGetUserInfo() {
    return new Promise((resolve) => {
      // 先检查是否有本地用户信息
      const localUserInfo = wx.getStorageSync('userInfo')
      if (localUserInfo && localUserInfo.avatarUrl) {
        this.globalData.userInfo = localUserInfo
        resolve(localUserInfo)
        return
      }
      
      // 如果没有本地信息，尝试从数据库获取
      const db = wx.cloud.database()
      db.collection('users').where({
        _openid: this.globalData.openid
      }).get().then(res => {
        if (res.data && res.data.length > 0) {
          const userData = res.data[0]
          const userInfo = {
            nickName: userData.nickName || '小朋友',
            avatarUrl: userData.avatarUrl || '',
            gender: userData.gender || 0
          }
          this.globalData.userInfo = userInfo
          wx.setStorageSync('userInfo', userInfo)
          resolve(userInfo)
        } else {
          // 数据库也没有，用默认
          const defaultUserInfo = {
            nickName: '小朋友',
            avatarUrl: '',
            gender: 0
          }
          this.globalData.userInfo = defaultUserInfo
          wx.setStorageSync('userInfo', defaultUserInfo)
          resolve(defaultUserInfo)
        }
      }).catch(err => {
        console.warn('[app.js] 从数据库获取用户信息失败', err)
        const defaultUserInfo = {
          nickName: '小朋友',
          avatarUrl: '',
          gender: 0
        }
        this.globalData.userInfo = defaultUserInfo
        wx.setStorageSync('userInfo', defaultUserInfo)
        resolve(defaultUserInfo)
      })
    })
  },
})
