// 积分服务云对象
const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const pointsLogCollection = db.collection('points_log')

module.exports = {
  _before: function() {
    this.clientInfo = this.getClientInfo()
  },

  // 看广告获得积分
  async earnByAd(params) {
    const { uid } = this.getUniIdToken && await this.getUniIdToken() || {}
    
    if (!uid) {
      return { code: 401, msg: '请先登录' }
    }

    const { adType } = params // 'banner' | 'video'
    
    // 不同广告类型给不同积分
    const pointsMap = {
      banner: 1,
      video: 10
    }
    
    const earnPoints = pointsMap[adType] || 1

    // 获取用户当前积分
    const userRes = await usersCollection.doc(uid).get()
    const user = userRes.data[0]
    const newBalance = user.points + earnPoints

    // 更新用户积分
    await usersCollection.doc(uid).update({
      points: dbCmd.inc(earnPoints)
    })

    // 记录积分流水
    await pointsLogCollection.add({
      user_id: uid,
      type: 'ad_reward',
      amount: earnPoints,
      balance: newBalance,
      description: adType === 'video' ? '观看视频广告奖励' : '浏览广告奖励',
      create_time: Date.now()
    })

    return {
      code: 0,
      msg: `获得${earnPoints}积分`,
      data: {
        earnPoints,
        balance: newBalance
      }
    }
  },

  // 每日签到
  async signIn() {
    const { uid } = this.getUniIdToken && await this.getUniIdToken() || {}
    
    if (!uid) {
      return { code: 401, msg: '请先登录' }
    }

    // 检查今日是否已签到
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()
    const todayEnd = todayStart + 24 * 60 * 60 * 1000

    const signedRes = await pointsLogCollection
      .where({
        user_id: uid,
        type: 'sign_in',
        create_time: dbCmd.gte(todayStart).and(dbCmd.lt(todayEnd))
      })
      .get()

    if (signedRes.data.length > 0) {
      return { code: 400, msg: '今日已签到' }
    }

    const earnPoints = 5

    // 获取用户当前积分
    const userRes = await usersCollection.doc(uid).get()
    const user = userRes.data[0]
    const newBalance = user.points + earnPoints

    // 更新用户积分
    await usersCollection.doc(uid).update({
      points: dbCmd.inc(earnPoints)
    })

    // 记录积分流水
    await pointsLogCollection.add({
      user_id: uid,
      type: 'sign_in',
      amount: earnPoints,
      balance: newBalance,
      description: '每日签到奖励',
      create_time: Date.now()
    })

    return {
      code: 0,
      msg: `签到成功，获得${earnPoints}积分`,
      data: {
        earnPoints,
        balance: newBalance
      }
    }
  },

  // 消费积分（解锁卡片）
  async consumePoints(params) {
    const { uid } = this.getUniIdToken && await this.getUniIdToken() || {}
    
    if (!uid) {
      return { code: 401, msg: '请先登录' }
    }

    const { cardId, points } = params

    if (!cardId || !points || points <= 0) {
      return { code: 400, msg: '参数错误' }
    }

    // 获取用户当前积分
    const userRes = await usersCollection.doc(uid).get()
    const user = userRes.data[0]

    if (user.points < points) {
      return { code: 400, msg: '积分不足' }
    }

    const newBalance = user.points - points

    // 扣减积分
    await usersCollection.doc(uid).update({
      points: dbCmd.inc(-points)
    })

    // 记录积分流水
    await pointsLogCollection.add({
      user_id: uid,
      type: 'consume',
      amount: -points,
      balance: newBalance,
      description: '解锁卡片消耗',
      related_id: cardId,
      create_time: Date.now()
    })

    return {
      code: 0,
      msg: '解锁成功',
      data: {
        consumedPoints: points,
        balance: newBalance
      }
    }
  },

  // 检查今日签到状态
  async getSignInStatus() {
    const { uid } = this.getUniIdToken && await this.getUniIdToken() || {}
    
    if (!uid) {
      return { code: 401, msg: '请先登录' }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()
    const todayEnd = todayStart + 24 * 60 * 60 * 1000

    const signedRes = await pointsLogCollection
      .where({
        user_id: uid,
        type: 'sign_in',
        create_time: dbCmd.gte(todayStart).and(dbCmd.lt(todayEnd))
      })
      .get()

    return {
      code: 0,
      msg: 'success',
      data: {
        hasSigned: signedRes.data.length > 0
      }
    }
  },

  // 增加免费查看次数（看广告后）
  async addFreeViews() {
    const { uid } = this.getUniIdToken && await this.getUniIdToken() || {}
    
    if (!uid) {
      return { code: 401, msg: '请先登录' }
    }

    const addViews = 3

    await usersCollection.doc(uid).update({
      free_views: dbCmd.inc(addViews)
    })

    const userRes = await usersCollection.doc(uid).get()

    return {
      code: 0,
      msg: `获得${addViews}次免费查看机会`,
      data: {
        addViews,
        freeViews: userRes.data[0].free_views
      }
    }
  },

  // 消费免费查看次数
  async consumeFreeView() {
    const { uid } = this.getUniIdToken && await this.getUniIdToken() || {}
    
    if (!uid) {
      return { code: 401, msg: '请先登录' }
    }

    const userRes = await usersCollection.doc(uid).get()
    const user = userRes.data[0]

    if (user.free_views <= 0) {
      return { code: 400, msg: '免费次数已用完' }
    }

    await usersCollection.doc(uid).update({
      free_views: dbCmd.inc(-1)
    })

    return {
      code: 0,
      msg: 'success',
      data: {
        remaining: user.free_views - 1
      }
    }
  }
}
