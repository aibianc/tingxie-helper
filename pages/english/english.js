const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    currentTab: 0,
    wordbookName: '',
    newWord: '',
    newDefinition: '',
    words: [],
    wordbooks: [],
    presetWordbooks: []
  },
  
  presetData: [
    {
      name: '数字1-10',
      type: 'english',
      icon: '🔢',
      words: [
        { word: 'one', definition: '一' },
        { word: 'two', definition: '二' },
        { word: 'three', definition: '三' },
        { word: 'four', definition: '四' },
        { word: 'five', definition: '五' },
        { word: 'six', definition: '六' },
        { word: 'seven', definition: '七' },
        { word: 'eight', definition: '八' },
        { word: 'nine', definition: '九' },
        { word: 'ten', definition: '十' }
      ]
    },
    {
      name: '颜色词汇',
      type: 'english',
      icon: '🌈',
      words: [
        { word: 'red', definition: '红色' },
        { word: 'blue', definition: '蓝色' },
        { word: 'green', definition: '绿色' },
        { word: 'yellow', definition: '黄色' },
        { word: 'white', definition: '白色' },
        { word: 'black', definition: '黑色' },
        { word: 'orange', definition: '橙色' },
        { word: 'purple', definition: '紫色' }
      ]
    },
    {
      name: '家庭成员',
      type: 'english',
      icon: '👨‍👩‍👧‍👦',
      words: [
        { word: 'father', definition: '爸爸' },
        { word: 'mother', definition: '妈妈' },
        { word: 'brother', definition: '兄弟' },
        { word: 'sister', definition: '姐妹' },
        { word: 'grandpa', definition: '爷爷' },
        { word: 'grandma', definition: '奶奶' }
      ]
    },
    {
      name: '动物单词',
      type: 'english',
      icon: '🐾',
      words: [
        { word: 'dog', definition: '狗' },
        { word: 'cat', definition: '猫' },
        { word: 'bird', definition: '鸟' },
        { word: 'fish', definition: '鱼' },
        { word: 'rabbit', definition: '兔子' },
        { word: 'panda', definition: '熊猫' }
      ]
    },
    {
      name: '水果单词',
      type: 'english',
      icon: '🍎',
      words: [
        { word: 'apple', definition: '苹果' },
        { word: 'banana', definition: '香蕉' },
        { word: 'orange', definition: '橙子' },
        { word: 'grape', definition: '葡萄' },
        { word: 'watermelon', definition: '西瓜' },
        { word: 'strawberry', definition: '草莓' }
      ]
    }
  ],

  onLoad() {
    this.initPresetWordbooks()
    this.loadWordbooks()
  },

  onShow() {
    if (this.data.currentTab === 1) {
      this.loadWordbooks()
    }
  },
  
  initPresetWordbooks() {
    this.setData({ presetWordbooks: this.presetData })
  },

  async importPreset(e) {
    const preset = e.currentTarget.dataset.preset
    
    wx.showModal({
      title: '导入词库',
      content: `确定要导入"${preset.name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '导入中...' })
            
            await db.collection('wordbooks').add({
              data: {
                name: preset.name,
                type: preset.type,
                words: preset.words,
                createTime: db.serverDate(),
                updateTime: db.serverDate()
              }
            })
            
            wx.hideLoading()
            wx.showToast({ title: '导入成功' })
            this.loadWordbooks()
          } catch (error) {
            wx.hideLoading()
            wx.showToast({ title: '导入失败', icon: 'none' })
            console.error(error)
          }
        }
      }
    })
  },

  switchTab(e) {
    const tab = parseInt(e.currentTarget.dataset.tab)
    this.setData({ currentTab: tab })
    if (tab === 1) {
      this.loadWordbooks()
    }
  },

  onNameInput(e) {
    this.setData({ wordbookName: e.detail.value })
  },

  onWordInput(e) {
    this.setData({ newWord: e.detail.value })
  },

  onDefinitionInput(e) {
    this.setData({ newDefinition: e.detail.value })
  },

  addWord() {
    const word = this.data.newWord.trim()
    if (!word) {
      wx.showToast({ title: '请输入单词', icon: 'none' })
      return
    }
    if (this.data.words.some(w => w.word === word)) {
      wx.showToast({ title: '已存在', icon: 'none' })
      return
    }
    this.setData({
      words: [...this.data.words, {
        word,
        definition: this.data.newDefinition.trim()
      }],
      newWord: '',
      newDefinition: ''
    })
  },

  removeWord(e) {
    const index = e.currentTarget.dataset.index
    const words = [...this.data.words]
    words.splice(index, 1)
    this.setData({ words })
  },

  async saveWordbook() {
    if (!this.data.wordbookName.trim()) {
      wx.showToast({ title: '请输入词库名称', icon: 'none' })
      return
    }
    if (!this.data.words.length) {
      wx.showToast({ title: '请添加单词', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      await db.collection('wordbooks').add({
        data: {
          name: this.data.wordbookName,
          type: 'english',
          words: this.data.words,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      wx.hideLoading()
      wx.showToast({ title: '保存成功' })
      this.resetForm()
      this.switchTab({ currentTarget: { dataset: { tab: 1 } } })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  resetForm() {
    this.setData({
      wordbookName: '',
      newWord: '',
      newDefinition: '',
      words: []
    })
  },

  async loadWordbooks() {
    try {
      const res = await db.collection('wordbooks')
        .where({
          _openid: app.globalData.openid,
          type: 'english'
        })
        .orderBy('createTime', 'desc')
        .get()
      this.setData({ wordbooks: res.data })
    } catch (error) {
      console.error('加载词库失败', error)
    }
  },

  viewWordbook(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/wordbooks/detail?id=${id}` })
  },

  editWordbook(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/wordbooks/edit?id=${id}` })
  },

  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  },

  startDictation(e) {
    const id = e.currentTarget.dataset.id
    const wordbook = this.data.wordbooks.find(w => w._id === id)
    if (!wordbook || !wordbook.words.length) {
      wx.showToast({ title: '没有可听写的内容', icon: 'none' })
      return
    }

    const words = wordbook.words.map(w => w.word || w)
    // 使用 app.globalData 传递数据，避免 URL 编码问题
    app.globalData.pendingDictation = {
      type: 'english',
      words: words,
      name: wordbook.name
    }
    
    wx.navigateTo({
      url: `/pages/dictation/dictation`
    })
  }
})
