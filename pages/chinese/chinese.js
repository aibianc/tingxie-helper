const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    currentTab: 0,
    grades: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
    gradeIndex: 0,
    wordbookName: '',
    unit: '',
    newWord: '',
    words: [],
    wordbooks: [],
    presetWordbooks: []
  },
  
  presetData: [
    {
      name: '一年级上册生字',
      type: 'chinese',
      grade: '一年级',
      unit: '上册',
      icon: '📝',
      words: ['一', '二', '三', '十', '木', '禾', '上', '下', '土', '个', '入', '大', '天', '人', '火', '文', '六', '七', '儿', '九']
    },
    {
      name: '常用词语',
      type: 'chinese',
      icon: '📚',
      words: ['我们', '你们', '他们', '天空', '大地', '树木', '花朵', '太阳', '月亮', '星星', '学校', '同学', '老师', '读书', '写字']
    },
    {
      name: '颜色词语',
      type: 'chinese',
      icon: '🎨',
      words: ['红色', '黄色', '蓝色', '绿色', '白色', '黑色', '橙色', '紫色', '粉色', '金色', '银色', '灰色', '棕色', '青色']
    },
    {
      name: '动物词语',
      type: 'chinese',
      icon: '🐾',
      words: ['小狗', '小猫', '小鸟', '小鱼', '兔子', '熊猫', '老虎', '狮子', '大象', '猴子', '狐狸', '松鼠', '蝴蝶', '蜜蜂']
    },
    {
      name: '家庭称谓',
      type: 'chinese',
      icon: '👨‍👩‍👧‍👦',
      words: ['爸爸', '妈妈', '爷爷', '奶奶', '哥哥', '姐姐', '弟弟', '妹妹', '叔叔', '阿姨', '伯伯', '姑姑', '舅舅', '姨妈']
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
                grade: preset.grade || '',
                unit: preset.unit || '',
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

  onGradeChange(e) {
    this.setData({ gradeIndex: parseInt(e.detail.value) })
  },

  onUnitInput(e) {
    this.setData({ unit: e.detail.value })
  },

  onWordInput(e) {
    this.setData({ newWord: e.detail.value })
  },

  addWord() {
    const word = this.data.newWord.trim()
    if (!word) {
      wx.showToast({ title: '请输入词语', icon: 'none' })
      return
    }
    if (this.data.words.includes(word)) {
      wx.showToast({ title: '已存在', icon: 'none' })
      return
    }
    this.setData({
      words: [...this.data.words, word],
      newWord: ''
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
      wx.showToast({ title: '请添加词语', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      await db.collection('wordbooks').add({
        data: {
          name: this.data.wordbookName,
          type: 'chinese',
          grade: this.data.grades[this.data.gradeIndex],
          unit: this.data.unit,
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
      gradeIndex: 0,
      unit: '',
      newWord: '',
      words: []
    })
  },

  async loadWordbooks() {
    try {
      const res = await db.collection('wordbooks')
        .where({
          _openid: app.globalData.openid,
          type: 'chinese'
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

    const words = wordbook.words
    // 使用 app.globalData 传递数据，避免 URL 编码问题
    app.globalData.pendingDictation = {
      type: 'chinese',
      words: words,
      name: wordbook.name
    }
    
    wx.navigateTo({
      url: `/pages/dictation/dictation`
    })
  }
})
