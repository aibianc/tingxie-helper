const app = getApp()
const db = wx.cloud.database()
const config = require('../../config.js')

Page({
  data: {
    dictationType: 'pinyin',
    wordbookName: '',
    words: [],
    displayWords: [],
    isRandom: true,
    repeatCount: 2,
    interval: 3,
    accent: 'us',
    
    isPlaying: false,
    isFinished: false,
    currentIndex: 0,
    currentWord: '准备好了吗？',
    progress: 0,
    
    showMedalModal: false,
    medalInfo: {}
  },
  
  // 内部状态，不放到 data 中
  audioContext: null,
  timer: null,
  repeatInterval: null,
  isAudioPlaying: false,
  audioCache: {}, // 音频缓存对象

  medalTypes: {
    pinyin: { emoji: '🎵', name: '拼音之星', desc: '完成一次拼音听写！' },
    chinese: { emoji: '📝', name: '汉字之星', desc: '完成一次中文听写！' },
    english: { emoji: '🌍', name: '单词达人', desc: '完成一次英文听写！' }
  },

  onLoad(options) {
    console.log('[dictation.js] 页面加载')
    
    // 优先从 app.globalData 读取数据，避免 URL 编码问题
    let dictationData = app.globalData.pendingDictation
    
    if (!dictationData) {
      // 降级方案：从 URL 参数读取
      console.log('[dictation.js] 从 URL 参数读取数据')
      try {
        const rawWords = JSON.parse(decodeURIComponent(options.words || '[]'))
        // 预处理词语，统一格式
        const words = rawWords.map(w => typeof w === 'string' ? w : w.word)
        dictationData = {
          type: options.type || 'pinyin',
          name: options.name || '听写',
          words: words
        }
      } catch (e) {
        console.error('[dictation.js] URL 参数解析失败:', e)
        dictationData = {
          type: 'pinyin',
          name: '听写',
          words: []
        }
      }
    } else {
      console.log('[dictation.js] 从 app.globalData 读取数据')
      // 清空已使用的数据
      app.globalData.pendingDictation = null
    }
    
    this.setData({
      dictationType: dictationData.type,
      wordbookName: dictationData.name,
      words: dictationData.words,
      displayWords: [...dictationData.words]
    })
    console.log('[dictation.js] 听写类型:', dictationData.type, '词语数:', dictationData.words.length)
    
    // 加载缓存
    this.loadAudioCache()
    
    this.shuffleWords()
  },

  onUnload() {
    console.log('[dictation.js] 页面卸载，清理资源')
    this.stopAllAudio()
    this.clearAllTimers()
    // 保存缓存
    this.saveAudioCache()
  },

  onHide() {
    console.log('[dictation.js] 页面隐藏，暂停播放')
    this.stopAllAudio()
    this.clearAllTimers()
  },

  // 加载音频缓存
  loadAudioCache() {
    try {
      const cachedData = wx.getStorageSync('tts_audio_cache')
      if (cachedData) {
        this.audioCache = cachedData
        console.log('[dictation.js] 加载音频缓存成功，缓存数量:', Object.keys(this.audioCache).length)
      }
    } catch (e) {
      console.error('[dictation.js] 加载音频缓存失败:', e)
      this.audioCache = {}
    }
  },

  // 延时函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  // 保存音频缓存
  saveAudioCache() {
    try {
      // 只保留最近 100 条缓存，防止占用过多空间
      const keys = Object.keys(this.audioCache)
      if (keys.length > 100) {
        const newCache = {}
        const recentKeys = keys.slice(-100)
        recentKeys.forEach(key => {
          newCache[key] = this.audioCache[key]
        })
        this.audioCache = newCache
      }
      
      wx.setStorageSync('tts_audio_cache', this.audioCache)
      console.log('[dictation.js] 音频缓存已保存')
    } catch (e) {
      console.error('[dictation.js] 保存音频缓存失败:', e)
    }
  },

  // 生成缓存 key
  getCacheKey(text, type, per = 4) {
    return `${type}_${per}_${text}`
  },

  stopAllAudio() {
    console.log('[dictation.js] 停止所有音频')
    if (this.audioContext) {
      try {
        this.audioContext.stop()
        this.audioContext.destroy()
      } catch (e) {
        console.error('[dictation.js] 停止音频失败:', e)
      }
      this.audioContext = null
    }
    this.isAudioPlaying = false
  },

  clearAllTimers() {
    console.log('[dictation.js] 清除所有定时器')
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.repeatInterval) {
      clearInterval(this.repeatInterval)
      this.repeatInterval = null
    }
  },

  shuffleWords() {
    if (this.data.isRandom) {
      const shuffled = [...this.data.words].sort(() => Math.random() - 0.5)
      this.setData({ displayWords: shuffled })
    } else {
      this.setData({ displayWords: [...this.data.words] })
    }
  },

  toggleOrder() {
    this.setData({ isRandom: !this.data.isRandom })
    this.shuffleWords()
  },

  decrease(e) {
    const key = e.currentTarget.dataset.key
    let value = this.data[key]
    if (value > 1) {
      this.setData({ [key]: value - 1 })
    }
  },

  increase(e) {
    const key = e.currentTarget.dataset.key
    let value = this.data[key]
    if (key === 'repeatCount' && value < 5) {
      this.setData({ [key]: value + 1 })
    } else if (key === 'interval' && value < 10) {
      this.setData({ [key]: value + 1 })
    }
  },

  setAccent(e) {
    this.setData({ accent: e.currentTarget.dataset.accent })
  },

  startDictation() {
    console.log('[dictation.js] 开始听写')
    // 先停止所有正在播放的音频
    this.stopAllAudio()
    this.clearAllTimers()
    
    this.setData({
      isPlaying: true,
      isFinished: false,
      currentIndex: 0,
      progress: 0
    })
    this.playCurrentWord()
  },

  async playCurrentWord() {
    const { displayWords, currentIndex, repeatCount } = this.data
    const word = displayWords[currentIndex]
    
    console.log('[dictation.js] 播放当前词语:', word, '索引:', currentIndex, '重复次数:', repeatCount)
    
    this.setData({
      currentWord: word,
      progress: ((currentIndex + 1) / displayWords.length) * 100
    })

    // 播放所有重复次数
    for (let i = 0; i < repeatCount; i++) {
      if (!this.data.isPlaying) {
        console.log('[dictation.js] 已停止，中断重复播放')
        break
      }
      console.log('[dictation.js] 第', i + 1, '次播放')
      await this.playWordAudio(word)
      
      // 如果不是最后一次，间隔一下再播放
      if (i < repeatCount - 1) {
        console.log('[dictation.js] 等待 1.5 秒后重复')
        await this.sleep(1500)
      }
    }
    
    // 安排下一个
    this.scheduleNext()
  },

  // 拼音拆分函数 - 将拼音拆分成声母和韵母
  splitPinyin(pinyin) {
    console.log('[dictation.js] 拆分拼音:', pinyin)
    const shengmuList = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w']
    const yunmuList = ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er', 'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong', 'ia', 'iao', 'ian', 'iang', 'iong', 'uan', 'uang', 'uai', 'uo', 'üan', 'ueng']
    
    // 先尝试双声母
    for (let sm of ['zh', 'ch', 'sh']) {
      if (pinyin.startsWith(sm)) {
        const yunmu = pinyin.slice(sm.length)
        if (yunmuList.includes(yunmu)) {
          console.log('[dictation.js] 双声母拼音:', sm, yunmu)
          return { shengmu: sm, yunmu: yunmu }
        }
      }
    }
    
    // 单声母
    for (let sm of shengmuList) {
      if (sm.length === 1 && pinyin.startsWith(sm)) {
        const yunmu = pinyin.slice(1)
        if (yunmuList.includes(yunmu)) {
          console.log('[dictation.js] 单声母拼音:', sm, yunmu)
          return { shengmu: sm, yunmu: yunmu }
        }
      }
    }
    
    // 零声母
    if (yunmuList.includes(pinyin)) {
      console.log('[dictation.js] 零声母拼音:', pinyin)
      return { shengmu: '', yunmu: pinyin }
    }
    
    console.log('[dictation.js] 拼音拆分失败，返回原样')
    return { shengmu: '', yunmu: pinyin }
  },

  async playWordAudio(word) {
    console.log('[dictation.js] playWordAudio 播放词语:', word)
    
    // 如果已经在播放，先停止
    if (this.isAudioPlaying) {
      console.log('[dictation.js] 已有音频在播放，先停止')
      this.stopAllAudio()
    }
    
    this.isAudioPlaying = true
    
    try {
      // 创建新的音频实例
      this.audioContext = wx.createInnerAudioContext()
      
      if (this.data.dictationType === 'english') {
        // 英文用有道词典
        const lang = this.data.accent === 'us' ? 'en' : 'en-uk'
        this.audioContext.src = `https://dict.youdao.com/dictvoice?type=${lang === 'en' ? 0 : 1}&audio=${encodeURIComponent(word)}`
        console.log('[dictation.js] 英文发音 URL:', this.audioContext.src)
        
        await this.playAndWaitAudio()
      } else if (this.data.dictationType === 'pinyin') {
        // 拼音特殊朗读格式：声母b，韵母a，b，a，ba
        const pinyinParts = this.splitPinyin(word)
        let ttsParts = []
        
        if (pinyinParts.shengmu) {
          ttsParts.push(`声母${pinyinParts.shengmu}`)
        }
        if (pinyinParts.yunmu) {
          ttsParts.push(`韵母${pinyinParts.yunmu}`)
        }
        if (pinyinParts.shengmu) {
          ttsParts.push(pinyinParts.shengmu)
        }
        if (pinyinParts.yunmu) {
          ttsParts.push(pinyinParts.yunmu)
        }
        ttsParts.push(word)
        
        const ttsText = ttsParts.join('，')
        console.log('[dictation.js] 拼音朗读文本:', ttsText)
        
        // 缓存
        const cacheKey = this.getCacheKey(ttsText, this.data.dictationType, 4)
        const cachedAudio = this.audioCache[cacheKey]
        
        if (cachedAudio) {
          console.log('[dictation.js] 使用缓存的音频')
          const filePath = `${wx.env.USER_DATA_PATH}/tts_cached_${Date.now()}.mp3`
          const fs = wx.getFileSystemManager()
          fs.writeFileSync(filePath, cachedAudio, 'base64')
          this.audioContext.src = filePath
          await this.playAndWaitAudio()
        } else {
          console.log('[dictation.js] 调用百度 TTS（无缓存）')
          const res = await wx.cloud.callFunction({
            name: 'baiduTTS',
            data: {
              text: ttsText,
              apiKey: config.baiduTTS.apiKey,
              secretKey: config.baiduTTS.secretKey,
              lang: 'zh',
              spd: 3,
              pit: 5,
              vol: 8,
              per: 4
            }
          })
          
          console.log('[dictation.js] 百度 TTS 返回:', res)
          
          if (res.result && res.result.success) {
            this.audioCache[cacheKey] = res.result.audio
            const filePath = `${wx.env.USER_DATA_PATH}/tts_${Date.now()}.mp3`
            const fs = wx.getFileSystemManager()
            fs.writeFileSync(filePath, res.result.audio, 'base64')
            this.audioContext.src = filePath
            console.log('[dictation.js] 使用百度 TTS 音频')
            
            await this.playAndWaitAudio()
            this.saveAudioCache()
          } else {
            throw new Error('百度 TTS 调用失败')
          }
        }
      } else {
        // 中文
        let ttsText = word
        
        // 先查缓存
        const cacheKey = this.getCacheKey(ttsText, this.data.dictationType, 4)
        const cachedAudio = this.audioCache[cacheKey]
        
        if (cachedAudio) {
          console.log('[dictation.js] 使用缓存的音频')
          const filePath = `${wx.env.USER_DATA_PATH}/tts_cached_${Date.now()}.mp3`
          const fs = wx.getFileSystemManager()
          fs.writeFileSync(filePath, cachedAudio, 'base64')
          this.audioContext.src = filePath
          await this.playAndWaitAudio()
        } else {
          console.log('[dictation.js] 调用百度 TTS（无缓存）')
          const res = await wx.cloud.callFunction({
            name: 'baiduTTS',
            data: {
              text: ttsText,
              apiKey: config.baiduTTS.apiKey,
              secretKey: config.baiduTTS.secretKey,
              lang: 'zh',
              spd: 3,
              pit: 5,
              vol: 8,
              per: 4
            }
          })
          
          console.log('[dictation.js] 百度 TTS 返回:', res)
          
          if (res.result && res.result.success) {
            this.audioCache[cacheKey] = res.result.audio
            const filePath = `${wx.env.USER_DATA_PATH}/tts_${Date.now()}.mp3`
            const fs = wx.getFileSystemManager()
            fs.writeFileSync(filePath, res.result.audio, 'base64')
            this.audioContext.src = filePath
            console.log('[dictation.js] 使用百度 TTS 音频')
            
            await this.playAndWaitAudio()
            this.saveAudioCache()
          } else {
            throw new Error('百度 TTS 调用失败')
          }
        }
      }
    } catch (error) {
      console.error('[dictation.js] 播放失败', error)
      this.isAudioPlaying = false
    }
  },

  // 播放并等待音频结束
  playAndWaitAudio() {
    return new Promise((resolve) => {
      if (!this.audioContext) {
        resolve()
        return
      }
      
      const timeoutId = setTimeout(() => {
        console.warn('[dictation.js] 音频播放超时')
        resolve()
      }, 15000)
      
      this.audioContext.onEnded(() => {
        console.log('[dictation.js] 音频播放结束')
        clearTimeout(timeoutId)
        this.isAudioPlaying = false
        resolve()
      })
      
      this.audioContext.onError((err) => {
        console.error('[dictation.js] 音频播放错误:', err)
        clearTimeout(timeoutId)
        this.isAudioPlaying = false
        resolve() // 即使失败也继续
      })
      
      this.audioContext.onPlay(() => {
        console.log('[dictation.js] 音频开始播放')
      })
      
      this.audioContext.play()
    })
  },

  scheduleNext() {
    console.log('[dictation.js] scheduleNext 安排下一个')
    this.clearAllTimers()
    
    const { displayWords, currentIndex, interval } = this.data
    
    console.log('[dictation.js] 下一个将在', interval * 1000, 'ms 后播放')
    
    this.timer = setTimeout(() => {
      if (currentIndex < displayWords.length - 1 && this.data.isPlaying) {
        console.log('[dictation.js] 播放下一个')
        this.setData({ currentIndex: currentIndex + 1 })
        this.playCurrentWord()
      } else {
        console.log('[dictation.js] 听写完成')
        this.finishDictation()
      }
    }, interval * 1000)
  },

  prevWord() {
    console.log('[dictation.js] 上一个')
    if (this.data.currentIndex > 0 && this.data.isPlaying) {
      this.stopAllAudio()
      this.clearAllTimers()
      this.setData({ currentIndex: this.data.currentIndex - 1 })
      this.playCurrentWord()
    }
  },

  nextWord() {
    console.log('[dictation.js] 下一个')
    if (this.data.currentIndex < this.data.displayWords.length - 1 && this.data.isPlaying) {
      this.stopAllAudio()
      this.clearAllTimers()
      this.setData({ currentIndex: this.data.currentIndex + 1 })
      this.playCurrentWord()
    }
  },

  repeatWord() {
    console.log('[dictation.js] 重复当前')
    this.stopAllAudio()
    this.clearAllTimers()
    this.playWordAudio(this.data.currentWord).then(() => {
      // 重新安排后续
      if (this.data.isPlaying) {
        this.scheduleNext()
      }
    })
  },

  stopDictation() {
    console.log('[dictation.js] 停止听写')
    this.stopAllAudio()
    this.clearAllTimers()
    this.finishDictation()
  },

  async finishDictation() {
    console.log('[dictation.js] 完成听写')
    this.setData({
      isPlaying: false,
      isFinished: true
    })
    
    // 只在已登录时保存
    if (app.globalData.openid) {
      await this.saveHistory()
      await this.awardMedal()
    }
  },

  async saveHistory() {
    if (!app.globalData.openid) return
    
    try {
      console.log('[dictation.js] 保存历史记录')
      await db.collection('dictation_history').add({
        data: {
          type: this.data.dictationType,
          wordbookName: this.data.wordbookName,
          words: this.data.displayWords,
          createTime: db.serverDate()
        }
      })
      console.log('[dictation.js] 历史记录保存成功')
    } catch (e) {
      console.error('[dictation.js] 保存历史失败:', e)
    }
  },

  async awardMedal() {
    if (!app.globalData.openid) return
    
    try {
      console.log('[dictation.js] 发放奖牌')
      const medalType = this.medalTypes[this.data.dictationType]
      
      await db.collection('medals').add({
        data: {
          type: this.data.dictationType,
          name: medalType.name,
          emoji: medalType.emoji,
          desc: medalType.desc,
          wordbookName: this.data.wordbookName,
          createTime: db.serverDate()
        }
      })

      const medalCount = await db.collection('medals')
        .where({ _openid: app.globalData.openid })
        .count()

      if (medalCount.total === 10) {
        await this.unlockTitle('听写小能手')
      } else if (medalCount.total === 20) {
        await this.unlockTitle('听写大师')
      }

      this.setData({
        showMedalModal: true,
        medalInfo: medalType
      })
    } catch (e) {
      console.error('[dictation.js] 发放奖牌失败:', e)
    }
  },

  async unlockTitle(title) {
    try {
      const userRes = await db.collection('users')
        .where({ _openid: app.globalData.openid })
        .get()
      
      if (userRes.data.length > 0) {
        await db.collection('users').doc(userRes.data[0]._id).update({
          data: {
            title: title,
            updateTime: db.serverDate()
          }
        })
      }
    } catch (e) {
      console.error('[dictation.js] 解锁称号失败:', e)
    }
  },

  closeMedalModal() {
    this.setData({ showMedalModal: false })
  },

  copyWords() {
    const text = this.data.displayWords.join('\n')
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制' })
      }
    })
  },

  restart() {
    console.log('[dictation.js] 重新开始')
    this.stopAllAudio()
    this.clearAllTimers()
    this.shuffleWords()
    this.setData({
      isPlaying: false,
      isFinished: false,
      currentIndex: 0,
      currentWord: '准备好了吗？',
      progress: 0
    })
  },

  goBack() {
    console.log('[dictation.js] 返回')
    this.stopAllAudio()
    this.clearAllTimers()
    wx.navigateBack()
  }
})
