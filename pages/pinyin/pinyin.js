const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    currentTab: 0,
    shengmu: ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w'],
    yunmu: ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er', 'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong', 'ia', 'iao', 'ian', 'iang', 'iong', 'uan', 'uang', 'uai', 'uo', 'üan', 'ueng'],
    selectedShengmu: '',
    selectedYunmu: '',
    canSelectYunmu: false,
    currentSyllable: '',
    hintText: '请先选择声母',
    generatedSyllables: [],
    wordbooks: [],
    showCreateModal: false,
    newWordbookName: '',
    presetWordbooks: []
  },
  
  presetData: [
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
    },
    {
      name: '前鼻音韵母',
      type: 'pinyin',
      icon: '🎹',
      words: ['ban', 'pan', 'man', 'fan', 'dan', 'tan', 'nan', 'lan', 'gan', 'kan', 'han']
    },
    {
      name: '后鼻音韵母',
      type: 'pinyin',
      icon: '🎸',
      words: ['bang', 'pang', 'mang', 'fang', 'dang', 'tang', 'nang', 'lang', 'gang', 'kang', 'hang']
    }
  ],

  validPinyinMap: {
    'b': ['a', 'o', 'i', 'u', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ian', 'iao', 'ie', 'in', 'iang', 'iong'],
    'p': ['a', 'o', 'i', 'u', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ian', 'iao', 'ie', 'in', 'iang', 'iong'],
    'm': ['a', 'o', 'e', 'i', 'u', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ian', 'iao', 'ie', 'in', 'iang', 'iong'],
    'f': ['a', 'o', 'u', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng'],
    'd': ['a', 'e', 'i', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ing', 'ong', 'ian', 'iao', 'ie', 'iu', 'in', 'iang', 'iong'],
    't': ['a', 'e', 'i', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ing', 'ong', 'ian', 'iao', 'ie', 'iu', 'in', 'iang', 'iong'],
    'n': ['a', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ao', 'ou', 'iu', 'ie', 'üe', 'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong', 'ia', 'ian', 'iao', 'iang', 'iong'],
    'l': ['a', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ao', 'ou', 'iu', 'ie', 'üe', 'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong', 'ia', 'ian', 'iao', 'iang', 'iong'],
    'g': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'uang', 'uai', 'uan'],
    'k': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'uang', 'uai', 'uan'],
    'h': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'uang', 'uai', 'uan'],
    'j': ['i', 'ü', 'ia', 'iao', 'iu', 'ie', 'ian', 'in', 'iang', 'ing', 'iong', 'üan', 'üe', 'ün'],
    'q': ['i', 'ü', 'ia', 'iao', 'iu', 'ie', 'ian', 'in', 'iang', 'ing', 'iong', 'üan', 'üe', 'ün'],
    'x': ['i', 'ü', 'ia', 'iao', 'iu', 'ie', 'ian', 'in', 'iang', 'ing', 'iong', 'üan', 'üe', 'ün'],
    'zh': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'ua', 'uai', 'uan', 'uang', 'uo'],
    'ch': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'ua', 'uai', 'uan', 'uang', 'uo'],
    'sh': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'ua', 'uai', 'uan', 'uang', 'uo'],
    'r': ['e', 'u', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'uan', 'un', 'uo'],
    'z': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'ua', 'uai', 'uan', 'uang', 'uo', 'un'],
    'c': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'ua', 'uai', 'uan', 'uang', 'uo', 'un'],
    's': ['a', 'e', 'u', 'ai', 'ei', 'ui', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'ua', 'uai', 'uan', 'uang', 'uo', 'un'],
    'y': ['a', 'e', 'i', 'u', 'ao', 'ou', 'an', 'en', 'ang', 'ing', 'ong', 'ia', 'ian', 'iang', 'iao', 'ie', 'in', 'ing', 'iong', 'uan', 'uo'],
    'w': ['a', 'o', 'u', 'ai', 'ei', 'an', 'en', 'ang', 'eng', 'ua', 'uai', 'uan', 'uang', 'uo']
  },

  onLoad() {
    console.log('[pinyin.js] 页面加载')
    this.initPresetWordbooks()
    this.loadWordbooks()
  },

  onShow() {
    console.log('[pinyin.js] 页面显示')
    if (this.data.currentTab === 1) {
      this.loadWordbooks()
    }
  },

  initPresetWordbooks() {
    this.setData({ presetWordbooks: this.presetData })
  },

  async importPreset(e) {
    const preset = e.currentTarget.dataset.preset
    console.log('[pinyin.js] 导入预设词库:', preset.name)
    
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
            console.error('[pinyin.js] 导入失败:', error)
          }
        }
      }
    })
  },

  switchTab(e) {
    const tab = parseInt(e.currentTarget.dataset.tab)
    console.log('[pinyin.js] 切换标签:', tab)
    this.setData({ currentTab: tab })
    if (tab === 1) {
      this.loadWordbooks()
    }
  },

  selectShengmu(e) {
    const item = e.currentTarget.dataset.item
    console.log('[pinyin.js] 选择声母:', item)
    
    this.setData({ 
      selectedShengmu: item,
      selectedYunmu: '',
      currentSyllable: '',
      canSelectYunmu: true,
      hintText: '已选择声母 ' + item + '，请选择韵母'
    })
    
    wx.vibrateShort({ type: 'light' })
  },

  selectYunmu(e) {
    if (!this.data.canSelectYunmu) {
      wx.showToast({
        title: '请先选择声母',
        icon: 'none'
      })
      return
    }
    
    const item = e.currentTarget.dataset.item
    console.log('[pinyin.js] 选择韵母:', item)
    
    const validYunmu = this.validPinyinMap[this.data.selectedShengmu] || []
    if (!validYunmu.includes(item)) {
      wx.showToast({
        title: this.data.selectedShengmu + ' 和 ' + item + ' 不能组合',
        icon: 'none'
      })
      return
    }
    
    const syllable = this.data.selectedShengmu + item
    this.setData({ 
      selectedYunmu: item,
      currentSyllable: syllable,
      hintText: '已选择 ' + syllable + '，点击"添加"加入列表'
    })
    
    wx.vibrateShort({ type: 'light' })
  },

  addSyllable() {
    if (!this.data.currentSyllable) {
      return
    }
    
    const syllable = this.data.currentSyllable
    const syllables = [...this.data.generatedSyllables]
    
    if (syllables.includes(syllable)) {
      wx.showToast({
        title: '该音节已存在',
        icon: 'none'
      })
      return
    }
    
    syllables.push(syllable)
    console.log('[pinyin.js] 添加音节:', syllable)
    
    this.setData({ 
      generatedSyllables: syllables,
      selectedShengmu: '',
      selectedYunmu: '',
      currentSyllable: '',
      canSelectYunmu: false,
      hintText: '请先选择声母'
    })
    
    wx.showToast({
      title: '已添加 ' + syllable,
      icon: 'success'
    })
  },

  deleteSyllable(e) {
    const index = e.currentTarget.dataset.index
    const syllables = [...this.data.generatedSyllables]
    const deleted = syllables.splice(index, 1)[0]
    console.log('[pinyin.js] 删除音节:', deleted)
    
    this.setData({ generatedSyllables: syllables })
    
    wx.showToast({
      title: '已删除 ' + deleted,
      icon: 'none'
    })
  },

  async loadWordbooks() {
    if (!app.globalData.openid) {
      console.log('[pinyin.js] 未登录，不加载词库')
      return
    }
    
    try {
      console.log('[pinyin.js] 加载词库')
      const res = await db.collection('wordbooks')
        .where({
          _openid: app.globalData.openid,
          type: 'pinyin'
        })
        .orderBy('createTime', 'desc')
        .get()
      console.log('[pinyin.js] 加载到词库:', res.data.length, '个')
      this.setData({ wordbooks: res.data })
    } catch (error) {
      console.error('[pinyin.js] 加载词库失败:', error)
    }
  },

  showCreateModal() {
    console.log('[pinyin.js] 显示创建词库弹窗')
    this.setData({ showCreateModal: true, newWordbookName: '' })
  },

  hideCreateModal() {
    console.log('[pinyin.js] 隐藏创建词库弹窗')
    this.setData({ showCreateModal: false })
  },

  onNameInput(e) {
    this.setData({ newWordbookName: e.detail.value })
  },

  async saveToWordbook() {
    if (!this.data.generatedSyllables.length) {
      wx.showToast({ title: '先生成音节', icon: 'none' })
      return
    }
    console.log('[pinyin.js] 保存到词库')
    this.showCreateModal()
  },

  async createWordbook() {
    if (!this.data.newWordbookName.trim()) {
      wx.showToast({ title: '请输入词库名称', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      await db.collection('wordbooks').add({
        data: {
          name: this.data.newWordbookName,
          type: 'pinyin',
          words: this.data.generatedSyllables,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      wx.hideLoading()
      wx.showToast({ title: '保存成功' })
      this.hideCreateModal()
      this.switchTab({ currentTarget: { dataset: { tab: 1 } } })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
      console.error('[pinyin.js] 保存失败:', error)
    }
  },

  viewWordbook(e) {
    const id = e.currentTarget.dataset.id
    console.log('[pinyin.js] 查看词库:', id)
    wx.navigateTo({ url: `/pages/wordbooks/detail?id=${id}` })
  },

  editWordbook(e) {
    const id = e.currentTarget.dataset.id;
    console.log('[pinyin.js] 编辑词库:', id);
    wx.navigateTo({ url: `/pages/wordbooks/edit?id=${id}` });
  },

  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  },

  startDictation(e) {
    const type = e.currentTarget.dataset.type
    let words = []
    let wordbookName = '临时词库'

    if (type === 'temp') {
      words = this.data.generatedSyllables
      console.log('[pinyin.js] 使用临时词库听写，音节:', words)
    } else {
      const id = e.currentTarget.dataset.id
      const wordbook = this.data.wordbooks.find(w => w._id === id)
      if (wordbook) {
        words = wordbook.words
        wordbookName = wordbook.name
        console.log('[pinyin.js] 使用词库听写:', wordbookName)
      }
    }

    if (!words.length) {
      wx.showToast({ title: '没有可听写的内容', icon: 'none' })
      return
    }

    // 使用 app.globalData 传递数据，避免 URL 编码问题
    app.globalData.pendingDictation = {
      type: 'pinyin',
      words: words,
      name: wordbookName
    }
    
    wx.navigateTo({
      url: `/pages/dictation/dictation`
    })
  }
})
