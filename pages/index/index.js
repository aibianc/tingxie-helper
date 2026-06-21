const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    userInfo: null,
    currentDate: '',
    medalCount: 0,
    dictationCount: 0,
    wordbookCount: 0,
    userTitle: '',
    recentMedal: null,
    isLoading: false,
    isLoggedIn: false
  },

  onLoad() {
    console.log('[index.js] 页面加载')
    this.setCurrentDate()
    this.checkLoginStatus()
  },

  onShow() {
    console.log('[index.js] 页面显示')
    if (app.globalData.openid) {
      console.log('[index.js] 已登录，加载统计数据')
      this.setData({ isLoggedIn: true, userInfo: app.globalData.userInfo })
      this.loadStats()
    }
  },

  setCurrentDate() {
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekday = weekdays[now.getDay()]
    const hour = now.getHours()
    
    // 根据时间确定问候语
    let greeting = '早上好'
    if (hour >= 12 && hour < 18) {
      greeting = '下午好'
    } else if (hour >= 18) {
      greeting = '晚上好'
    } else if (hour >= 5 && hour < 12) {
      greeting = '早上好'
    } else {
      greeting = '晚上好' // 凌晨也算晚上好
    }
    
    this.setData({
      currentDate: `${month}月${day}日 ${weekday}`,
      greeting: greeting
    })
  },

  checkLoginStatus() {
    console.log('[index.js] 检查登录状态')
    if (app.globalData.userInfo && app.globalData.openid) {
      console.log('[index.js] 已登录')
      this.setData({
        userInfo: app.globalData.userInfo,
        isLoggedIn: true
      })
      this.loadStats()
    } else {
      console.log('[index.js] 未登录')
      this.setData({ isLoggedIn: false })
    }
  },

  doLogin() {
    console.log('[index.js] doLogin 被调用')
    
    if (this.data.isLoading) {
      console.log('[index.js] 正在登录中，忽略重复调用')
      return
    }
    
    this.setData({ isLoading: true })
    
    app.login().then(userInfo => {
      console.log('[index.js] 登录成功！', userInfo)
      this.setData({
        userInfo,
        isLoggedIn: true,
        isLoading: false
      })
      this.loadStats()
    }).catch(err => {
      console.error('[index.js] 登录失败！', err)
      this.setData({ isLoading: false })
      
      wx.showModal({
        title: '登录提示',
        content: err.message || '暂时无法登录，可以先使用听写功能，需要保存记录时再登录',
        confirmText: '知道了',
        showCancel: false
      })
    })
  },

  async loadStats() {
    if (!app.globalData.openid) {
      console.log('[index.js] 未登录，不加载统计')
      return
    }
    
    console.log('[index.js] loadStats 开始加载统计数据')
    
    try {
      let medalCount = 0
      let dictationCount = 0
      let wordbookCount = 0
      let userTitle = ''
      
      try {
        console.log('[index.js] 加载奖牌统计...')
        const medalsRes = await db.collection('medals').where({ _openid: app.globalData.openid }).count()
        medalCount = medalsRes.total
        console.log('[index.js] 奖牌数:', medalCount)
      } catch (e) {
        console.error('[index.js] 加载奖牌失败:', e)
      }
      
      try {
        console.log('[index.js] 加载历史统计...')
        const historyRes = await db.collection('dictation_history').where({ _openid: app.globalData.openid }).count()
        dictationCount = historyRes.total
        console.log('[index.js] 历史数:', dictationCount)
      } catch (e) {
        console.error('[index.js] 加载历史失败:', e)
      }
      
      try {
        console.log('[index.js] 加载词库统计...')
        const wordbooksRes = await db.collection('wordbooks').where({ _openid: app.globalData.openid }).count()
        wordbookCount = wordbooksRes.total
        console.log('[index.js] 词库数:', wordbookCount)
      } catch (e) {
        console.error('[index.js] 加载词库失败:', e)
      }
      
      try {
        console.log('[index.js] 加载用户信息...')
        const userRes = await db.collection('users').where({ _openid: app.globalData.openid }).get()
        const user = userRes.data[0]
        userTitle = user?.title || ''
        console.log('[index.js] 用户称号:', userTitle)
      } catch (e) {
        console.error('[index.js] 加载用户信息失败:', e)
      }
      
      this.setData({
        medalCount,
        dictationCount,
        wordbookCount,
        userTitle
      })

      if (medalCount > 0) {
        try {
          console.log('[index.js] 加载最近获得的奖牌...')
          const recentMedalRes = await db.collection('medals')
            .where({ _openid: app.globalData.openid })
            .orderBy('createTime', 'desc')
            .limit(1)
            .get()
          
          if (recentMedalRes.data.length > 0) {
            const medal = recentMedalRes.data[0]
            console.log('[index.js] 最近奖牌:', medal)
            this.setData({
              recentMedal: {
                ...medal,
                timeText: this.formatTime(medal.createTime)
              }
            })
          }
        } catch (e) {
          console.error('[index.js] 加载最近奖牌失败:', e)
        }
      }
      
      console.log('[index.js] 统计数据加载完成！')
    } catch (error) {
      console.error('[index.js] 加载统计数据失败:', error)
    }
  },

  formatTime(date) {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      if (hours < 1) {
        return '刚刚获得'
      }
      return `${hours}小时前获得`
    }
    return `${d.getMonth() + 1}月${d.getDate()}日`
  },

  goToPinyin() {
    console.log('[index.js] 跳转拼音听写')
    wx.navigateTo({ url: '/pages/pinyin/pinyin' })
  },

  goToChinese() {
    console.log('[index.js] 跳转中文听写')
    wx.navigateTo({ url: '/pages/chinese/chinese' })
  },

  goToEnglish() {
    console.log('[index.js] 跳转英文听写')
    wx.navigateTo({ url: '/pages/english/english' })
  },

  goToWordbooks() {
    console.log('[index.js] 跳转词库')
    wx.navigateTo({ url: '/pages/wordbooks/wordbooks' })
  },

  goToHistory() {
    if (!app.globalData.openid) {
      console.log('[index.js] 未登录，需要登录')
      this.doLogin()
      return
    }
    console.log('[index.js] 跳转历史记录')
    wx.navigateTo({ url: '/pages/history/history' })
  },

  goToMedals() {
    if (!app.globalData.openid) {
      console.log('[index.js] 未登录，需要登录')
      this.doLogin()
      return
    }
    console.log('[index.js] 跳转奖牌')
    wx.navigateTo({ url: '/pages/medals/medals' })
  },

  goToProfile() {
    if (!app.globalData.openid) {
      console.log('[index.js] 未登录，需要登录')
      this.doLogin()
      return
    }
    console.log('[index.js] 跳转个人中心')
    wx.navigateTo({ url: '/pages/profile/profile' })
  },

  onLoginTap() {
    console.log('[index.js] 用户点击登录')
    if (!app.globalData.openid) {
      this.doLogin()
    }
  }
})
