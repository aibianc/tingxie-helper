const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    currentFilter: 'all',
    wordbooks: [],
    filteredWordbooks: [],
    presetWordbooks: []
  },

  presetData: {
    pinyin: [
      {
        name: '一年级拼音基础',
        type: 'pinyin',
        icon: '🎵',
        words: ['ba', 'pa', 'ma', 'fa', 'da', 'ta', 'na', 'la', 'ga', 'ka', 'ha', 'jia', 'qia', 'xia']
      },
      {
        name: '常用复韵母',
        type: 'pinyin',
        icon: '🎼',
        words: ['bai', 'pai', 'mai', 'dai', 'tai', 'nai', 'lai', 'gai', 'kai', 'hai', 'zhai', 'chai']
      }
    ],
    chinese: [
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
      }
    ],
    english: [
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
      }
    ]
  },

  onLoad() {
    this.initPresetWordbooks()
    this.loadWordbooks()
  },

  onShow() {
    this.loadWordbooks()
  },

  initPresetWordbooks() {
    const allPresets = [
      ...this.presetData.pinyin,
      ...this.presetData.chinese,
      ...this.presetData.english
    ]
    this.setData({ presetWordbooks: allPresets })
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

  async loadWordbooks() {
    try {
      const res = await db.collection('wordbooks')
        .where({
          _openid: app.globalData.openid
        })
        .orderBy('createTime', 'desc')
        .get()
      this.setData({ wordbooks: res.data })
      this.applyFilter()
    } catch (error) {
      console.error('加载词库失败', error)
    }
  },

  setFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ currentFilter: filter })
    this.applyFilter()
  },

  applyFilter() {
    const { wordbooks, currentFilter } = this.data
    const filtered = currentFilter === 'all' 
      ? wordbooks 
      : wordbooks.filter(w => w.type === currentFilter)
    this.setData({ filteredWordbooks: filtered })
  },

  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  },

  viewWordbook(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/wordbooks/detail?id=${id}` })
  },

  startDictation(e) {
    const id = e.currentTarget.dataset.id
    const wordbook = this.data.wordbooks.find(w => w._id === id)
    if (!wordbook || !wordbook.words.length) {
      wx.showToast({ title: '没有可听写的内容', icon: 'none' })
      return
    }

    const words = wordbook.type === 'english' 
      ? wordbook.words.map(w => w.word || w)
      : wordbook.words

    wx.navigateTo({
      url: `/pages/dictation/dictation?type=${wordbook.type}&words=${encodeURIComponent(JSON.stringify(words))}&name=${encodeURIComponent(wordbook.name)}`
    })
  },

  editWordbook(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/wordbooks/edit?id=${id}` })
  },

  deleteWordbook(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个词库吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            await db.collection('wordbooks').doc(id).remove()
            wx.hideLoading()
            wx.showToast({ title: '删除成功' })
            this.loadWordbooks()
          } catch (error) {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
