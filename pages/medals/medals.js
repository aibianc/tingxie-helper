const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    medals: [],
    countByType: {},
    userTitle: '',
    nextMilestone: null
  },

  milestones: [
    { count: 10, title: '听写小能手' },
    { count: 20, title: '听写大师' },
    { count: 50, title: '听写王者' }
  ],

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    try {
      const [medalsRes, userRes] = await Promise.all([
        db.collection('medals')
          .where({ _openid: app.globalData.openid })
          .orderBy('createTime', 'desc')
          .get(),
        db.collection('users')
          .where({ _openid: app.globalData.openid })
          .get()
      ])

      const medals = medalsRes.data
      const countByType = {}
      medals.forEach(m => {
        countByType[m.type] = (countByType[m.type] || 0) + 1
      })

      const userTitle = userRes.data[0]?.title || ''
      const nextMilestone = this.calculateNextMilestone(medals.length)

      this.setData({
        medals,
        countByType,
        userTitle,
        nextMilestone
      })
    } catch (error) {
      console.error('加载数据失败', error)
    }
  },

  calculateNextMilestone(currentCount) {
    for (const milestone of this.milestones) {
      if (currentCount < milestone.count) {
        return {
          need: milestone.count - currentCount,
          title: milestone.title,
          progress: (currentCount / milestone.count) * 100
        }
      }
    }
    return null
  },

  formatTime(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }
})
