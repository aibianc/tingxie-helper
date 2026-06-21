const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    wordbookId: '',
    wordbook: {},
    newWord: '',
    newDefinition: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ wordbookId: options.id })
      this.loadWordbook()
    }
  },

  onShow() {
    if (this.data.wordbookId) {
      this.loadWordbook()
    }
  },

  async loadWordbook() {
    try {
      wx.showLoading({ title: '加载中...' })
      const res = await db.collection('wordbooks').doc(this.data.wordbookId).get()
      const wordbook = res.data
      
      // 预处理词语数据，方便WXML显示
      wordbook.displayWords = wordbook.words.map((item, index) => ({
        index,
        word: typeof item === 'string' ? item : item.word,
        definition: typeof item === 'string' ? '' : item.definition || ''
      }))
      
      this.setData({ wordbook })
      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '加载失败', icon: 'none' })
      console.error(error)
    }
  },

  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  },

  onWordInput(e) {
    this.setData({ newWord: e.detail.value })
  },

  onDefinitionInput(e) {
    this.setData({ newDefinition: e.detail.value })
  },

  async addWord() {
    if (!this.data.newWord.trim()) {
      wx.showToast({ title: '请输入词语', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '添加中...' })
      
      let newWordItem
      if (this.data.wordbook.type === 'english') {
        newWordItem = {
          word: this.data.newWord.trim(),
          definition: this.data.newDefinition.trim()
        }
      } else {
        newWordItem = this.data.newWord.trim()
      }

      const updatedWords = [...this.data.wordbook.words, newWordItem]
      
      await db.collection('wordbooks').doc(this.data.wordbookId).update({
        data: {
          words: updatedWords,
          updateTime: db.serverDate()
        }
      })

      // 更新词语数据和显示数据
      const updatedDisplayWords = updatedWords.map((item, index) => ({
        index,
        word: typeof item === 'string' ? item : item.word,
        definition: typeof item === 'string' ? '' : item.definition || ''
      }))
      
      this.setData({
        'wordbook.words': updatedWords,
        'wordbook.displayWords': updatedDisplayWords,
        newWord: '',
        newDefinition: ''
      })
      
      wx.hideLoading()
      wx.showToast({ title: '添加成功' })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '添加失败', icon: 'none' })
      console.error(error)
    }
  },

  async deleteWord(e) {
    const index = e.currentTarget.dataset.index
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个词语吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            const updatedWords = [...this.data.wordbook.words]
            updatedWords.splice(index, 1)
            
            await db.collection('wordbooks').doc(this.data.wordbookId).update({
              data: {
                words: updatedWords,
                updateTime: db.serverDate()
              }
            })

            // 更新词语数据和显示数据
            const updatedDisplayWords = updatedWords.map((item, index) => ({
              index,
              word: typeof item === 'string' ? item : item.word,
              definition: typeof item === 'string' ? '' : item.definition || ''
            }))
            
            this.setData({
              'wordbook.words': updatedWords,
              'wordbook.displayWords': updatedDisplayWords
            })
            wx.hideLoading()
            wx.showToast({ title: '删除成功' })
          } catch (error) {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
            console.error(error)
          }
        }
      }
    })
  },

  copyAllWords() {
    const words = this.data.wordbook.words.map(item => 
      typeof item === 'string' ? item : item.word + (item.definition ? ` - ${item.definition}` : '')
    ).join('\n')
    
    wx.setClipboardData({
      data: words,
      success: () => {
        wx.showToast({ title: '复制成功' })
      }
    })
  },

  startDictation() {
    const words = this.data.wordbook.words.map(item => 
      typeof item === 'string' ? item : item.word
    )
    
    // 使用 app.globalData 传递数据，避免 URL 编码问题
    app.globalData.pendingDictation = {
      type: this.data.wordbook.type,
      words: words,
      name: this.data.wordbook.name
    }
    
    wx.navigateTo({
      url: `/pages/dictation/dictation`
    })
  },

  editWordbook() {
    wx.navigateTo({ url: `/pages/wordbooks/edit?id=${this.data.wordbookId}` })
  },

  deleteWordbook() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个词库吗？删除后无法恢复！',
      confirmText: '删除',
      confirmColor: '#dc2626',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            await db.collection('wordbooks').doc(this.data.wordbookId).remove()
            wx.hideLoading()
            wx.showToast({ title: '删除成功' })
            setTimeout(() => {
              wx.navigateBack()
            }, 1000)
          } catch (error) {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
            console.error(error)
          }
        }
      }
    })
  }
})
