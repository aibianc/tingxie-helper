const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    wordbookId: '',
    wordbookType: '',
    wordbookName: '',
    gradeIndex: 0,
    grades: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
    unit: '',
    words: [],
    showAddForm: false,
    newWord: '',
    newDefinition: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ wordbookId: options.id })
      this.loadWordbook()
    }
  },

  async loadWordbook() {
    try {
      wx.showLoading({ title: '加载中...' })
      const res = await db.collection('wordbooks').doc(this.data.wordbookId).get()
      const wordbook = res.data
      
      const gradeIndex = this.data.grades.indexOf(wordbook.grade)
      
      // 预处理词语数据用于显示
      const displayWords = wordbook.words.map((item, index) => ({
        index,
        word: typeof item === 'string' ? item : item.word,
        definition: typeof item === 'string' ? '' : item.definition || '',
        // 保存原始项用于保存
        original: item
      }))
      
      this.setData({
        wordbookType: wordbook.type,
        wordbookName: wordbook.name,
        gradeIndex: gradeIndex >= 0 ? gradeIndex : 0,
        unit: wordbook.unit || '',
        words: wordbook.words,
        displayWords: displayWords
      })
      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '加载失败', icon: 'none' })
      console.error(error)
    }
  },

  onNameInput(e) {
    this.setData({ wordbookName: e.detail.value })
  },

  onGradeChange(e) {
    this.setData({ gradeIndex: parseInt(e.detail.value) })
  },

  onUnitInput(e) {
    this.setData({ unit: e.detail.value })
  },

  onWordInput(e) {
    this.setData({ newWord: e.detail.value })
  },

  onDefinitionInput(e) {
    this.setData({ newDefinition: e.detail.value })
  },

  addWord() {
    this.setData({ showAddForm: true })
  },

  cancelAdd() {
    this.setData({
      showAddForm: false,
      newWord: '',
      newDefinition: ''
    })
  },

  confirmAdd() {
    const word = this.data.newWord.trim()
    if (!word) {
      wx.showToast({ title: '请输入词语', icon: 'none' })
      return
    }

    const exists = this.data.words.some(w => {
      const wText = typeof w === 'string' ? w : w.word
      return wText === word
    })

    if (exists) {
      wx.showToast({ title: '已存在', icon: 'none' })
      return
    }

    let newWordItem
    if (this.data.wordbookType === 'english') {
      newWordItem = {
        word,
        definition: this.data.newDefinition.trim()
      }
    } else {
      newWordItem = word
    }

    const newWords = [...this.data.words, newWordItem]
    const newDisplayWords = newWords.map((item, index) => ({
      index,
      word: typeof item === 'string' ? item : item.word,
      definition: typeof item === 'string' ? '' : item.definition || '',
      original: item
    }))

    this.setData({
      words: newWords,
      displayWords: newDisplayWords,
      showAddForm: false,
      newWord: '',
      newDefinition: ''
    })
  },

  removeWord(e) {
    const index = e.currentTarget.dataset.index
    const newWords = [...this.data.words]
    newWords.splice(index, 1)
    
    const newDisplayWords = newWords.map((item, i) => ({
      index: i,
      word: typeof item === 'string' ? item : item.word,
      definition: typeof item === 'string' ? '' : item.definition || '',
      original: item
    }))
    
    this.setData({ 
      words: newWords, 
      displayWords: newDisplayWords 
    })
  },

  async saveWordbook() {
    if (!this.data.wordbookName.trim()) {
      wx.showToast({ title: '请输入词库名称', icon: 'none' })
      return
    }
    if (!this.data.words.length) {
      wx.showToast({ title: '请添加词语', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      
      const updateData = {
        name: this.data.wordbookName,
        words: this.data.words,
        updateTime: db.serverDate()
      }

      if (this.data.wordbookType === 'chinese') {
        updateData.grade = this.data.grades[this.data.gradeIndex]
        updateData.unit = this.data.unit
      }

      await db.collection('wordbooks').doc(this.data.wordbookId).update({
        data: updateData
      })
      
      wx.hideLoading()
      wx.showToast({ title: '保存成功' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
      console.error(error)
    }
  },

  goBack() {
    wx.navigateBack()
  }
})
