const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    userInfo: null,
    userTitle: '',
    stats: {
      wordbooks: 0,
      dictations: 0,
      medals: 0
    },
    showFeedbackModal: false,
    feedbackText: '',
    showEditModal: false, // 添加编辑用户信息弹窗
    editingName: '',
    editingGender: 0,
    genderOptions: ['保密', '男', '女'] // 性别选项
  },

  onLoad() {
    this.setData({ userInfo: app.globalData.userInfo })
    this.loadStats()
  },

  onShow() {
    this.setData({ userInfo: app.globalData.userInfo })
    this.loadStats()
  },

  doLogin() {
    wx.showLoading({ title: '登录中...' })
    app.login().then(userInfo => {
      this.setData({ userInfo })
      this.loadStats()
      wx.hideLoading()
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
    })
  },

  async loadStats() {
    if (!app.globalData.openid) return

    try {
      const [wordbooksRes, dictationsRes, medalsRes, userRes] = await Promise.all([
        db.collection('wordbooks').where({ _openid: app.globalData.openid }).count(),
        db.collection('dictation_history').where({ _openid: app.globalData.openid }).count(),
        db.collection('medals').where({ _openid: app.globalData.openid }).count(),
        db.collection('users').where({ _openid: app.globalData.openid }).get()
      ])

      this.setData({
        stats: {
          wordbooks: wordbooksRes.total,
          dictations: dictationsRes.total,
          medals: medalsRes.total
        },
        userTitle: userRes.data[0]?.title || ''
      })
    } catch (error) {
      console.error('加载统计失败', error)
    }
  },

  navigateTo(e) {
    const url = e.currentTarget.dataset.url
    if (!app.globalData.userInfo) {
      this.doLogin()
      return
    }
    wx.navigateTo({ url })
  },

  // 更新用户信息 - 支持修改姓名和性别
  updateUserInfo() {
    const userInfo = this.data.userInfo || { nickName: '', gender: 0 }
    this.setData({
      showEditModal: true,
      editingName: userInfo.nickName || '',
      editingGender: userInfo.gender !== undefined ? userInfo.gender : 0
    })
  },

  // 关闭编辑弹窗
  closeEditModal() {
    this.setData({ showEditModal: false })
  },

  // 输入姓名
  onNameInput(e) {
    this.setData({ editingName: e.detail.value })
  },

  // 选择性别
  onGenderChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({ editingGender: index })
  },

  // 保存用户信息
  async saveUserInfo() {
    const newName = this.data.editingName.trim()
    const newGender = this.data.editingGender

    if (!newName) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })

      const newUserInfo = {
        ...this.data.userInfo,
        nickName: newName,
        gender: newGender
      }

      // 更新全局和本地
      app.globalData.userInfo = newUserInfo
      wx.setStorageSync('userInfo', newUserInfo)

      // 更新数据库
      const userRes = await db.collection('users').where({ _openid: app.globalData.openid }).get()
      if (userRes.data.length > 0) {
        await db.collection('users').doc(userRes.data[0]._id).update({
          data: {
            nickName: newName,
            gender: newGender,
            updateTime: db.serverDate()
          }
        })
      } else {
        await db.collection('users').add({
          data: {
            nickName: newName,
            gender: newGender,
            avatarUrl: newUserInfo.avatarUrl || '',
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      }

      this.setData({
        userInfo: newUserInfo,
        showEditModal: false
      })

      wx.hideLoading()
      wx.showToast({ title: '保存成功' })
    } catch (error) {
      wx.hideLoading()
      console.error('保存用户信息失败', error)
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    }
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除小程序缓存吗？这会清空音频缓存和本地存储数据，不会影响云数据库中的内容。',
      confirmText: '确定清除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清除中...' })
          
          // 清除本地存储
          try {
            wx.clearStorageSync()
          } catch (e) {
            console.error('清除存储失败', e)
          }
          
          // 清除音频缓存对象
          app.globalData.pendingDictation = null
          
          setTimeout(() => {
            wx.hideLoading()
            wx.showToast({
              title: '清除成功',
              icon: 'success'
            })
          }, 500)
        }
      }
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          // 清除全局登录信息
          app.globalData.userInfo = null
          app.globalData.openid = null
          
          // 清除本地存储
          try {
            wx.clearStorageSync()
          } catch (e) {
            console.error('清除存储失败', e)
          }
          
          // 更新页面状态
          this.setData({
            userInfo: null,
            userTitle: '',
            stats: {
              wordbooks: 0,
              dictations: 0,
              medals: 0
            }
          })
          
          wx.showToast({
            title: '已退出',
            icon: 'success'
          })
        }
      }
    })
  },

  // 显示反馈弹窗
  showFeedback() {
    this.setData({
      showFeedbackModal: true,
      feedbackText: ''
    })
  },

  // 关闭反馈弹窗
  closeFeedback() {
    this.setData({
      showFeedbackModal: false,
      feedbackText: ''
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止弹窗点击事件冒泡
  },

  // 反馈输入
  onFeedbackInput(e) {
    this.setData({ feedbackText: e.detail.value })
  },

  // 提交反馈 - 更稳定的版本
  async submitFeedback() {
    const feedbackText = this.data.feedbackText.trim()
    if (!feedbackText) return

    try {
      wx.showLoading({ title: '提交中...' })
      
      // 先检查是否有该集合的权限，尝试多种方式保存
      let saveSuccess = false
      
      try {
        // 方式1：尝试保存到 feedback 集合
        await db.collection('feedback').add({
          data: {
            content: feedbackText,
            createTime: db.serverDate()
          }
        })
        saveSuccess = true
      } catch (err1) {
        console.warn('保存到 feedback 集合失败', err1)
        
        // 方式2：如果失败，尝试保存到一个通用的集合，比如 userdata
        try {
          await db.collection('userdata').add({
            data: {
              type: 'feedback',
              content: feedbackText,
              createTime: db.serverDate()
            }
          })
          saveSuccess = true
        } catch (err2) {
          console.warn('保存到 userdata 也失败', err2)
          
          // 方式3：如果都失败，至少保存到本地
          try {
            const feedbackList = wx.getStorageSync('feedbackList') || []
            feedbackList.push({
              content: feedbackText,
              createTime: new Date().toISOString()
            })
            wx.setStorageSync('feedbackList', feedbackList)
            saveSuccess = true
          } catch (err3) {
            console.error('连本地都保存失败', err3)
          }
        }
      }
      
      wx.hideLoading()
      
      if (saveSuccess) {
        wx.showToast({ title: '提交成功' })
        this.closeFeedback()
      } else {
        wx.showToast({
          title: '提交失败，请稍后重试',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('提交反馈整体失败', error)
      wx.showToast({
        title: '提交失败，请稍后重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 联系我们
  contactUs() {
    wx.showModal({
      title: '联系我们',
      content: '如有问题，请通过以下方式联系：\n\n邮箱：feedback@example.com\n我们会尽快回复您！',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})
