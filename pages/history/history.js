const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    historyList: []
  },

  onLoad() {
    this.loadHistory()
  },

  onShow() {
    this.loadHistory()
  },

  async loadHistory() {
    try {
      const res = await db.collection('dictation_history')
        .where({
          _openid: app.globalData.openid
        })
        .orderBy('createTime', 'desc')
        .limit(50)
        .get()
      
      // 在JS中预处理数据，处理不同格式的word
      const historyList = res.data.map(item => ({
        ...item,
        wordPreviewList: item.words.map(w => typeof w === 'string' ? w : w.word)
      }))
      
      this.setData({ historyList })
    } catch (error) {
      console.error('加载历史失败', error)
    }
  },

  formatTime(date) {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
    
    return `${d.getMonth() + 1}月${d.getDate()}日`
  },

  redoDictation(e) {
    const item = e.currentTarget.dataset.item
    const words = item.words.map(w => typeof w === 'string' ? w : w.word)
    
    // 使用 app.globalData 传递数据，避免 URL 编码问题
    app.globalData.pendingDictation = {
      type: item.type,
      words: words,
      name: item.wordbookName
    }
    
    wx.navigateTo({
      url: `/pages/dictation/dictation`
    })
  },

  copyWords(e) {
    const words = e.currentTarget.dataset.words
    const text = words.map(w => typeof w === 'string' ? w : w.word).join('\n')
    
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制' })
      }
    })
  }
})
