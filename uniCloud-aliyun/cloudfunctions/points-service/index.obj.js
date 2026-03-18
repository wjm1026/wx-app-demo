// 积分服务云对象
const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const pointsLogCollection = db.collection('points_log')
const { getAuthUserContext } = require('custom-auth')
const {
  appendPointsLog,
  getDayRange,
  incrementUserFieldsAndGetUser,
} = require('cloud-shared')

const AD_REWARD_POINTS = {
  banner: 1,
  video: 10,
}

const SIGN_IN_REWARD_POINTS = 5
const FREE_VIEW_REWARD_COUNT = 3

function buildSignInQuery(uid) {
  const { startTime, endTime } = getDayRange()

  return {
    user_id: uid,
    type: 'sign_in',
    create_time: dbCmd.gte(startTime).and(dbCmd.lt(endTime)),
  }
}

// 积分发放和扣减都走同一条更新链路，保证余额计算和流水描述不会越改越散。
async function applyPointsChange(options) {
  const {
    uid,
    amount,
    type,
    description,
    relatedId,
  } = options
  const updatedUser = await incrementUserFieldsAndGetUser(usersCollection, dbCmd, uid, {
    points: amount,
  })
  const nextBalance = Number(updatedUser?.points || 0)

  await appendPointsLog(pointsLogCollection, {
    user_id: uid,
    type,
    amount,
    balance: nextBalance,
    description,
    related_id: relatedId,
  })

  return nextBalance
}

module.exports = {
  // 看广告获得积分
  async earnByAd(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const { adType } = authResult.params // 'banner' | 'video'
    const earnPoints = AD_REWARD_POINTS[adType] || AD_REWARD_POINTS.banner
    const newBalance = await applyPointsChange({
      uid,
      amount: earnPoints,
      type: 'ad_reward',
      description: adType === 'video' ? '观看视频广告奖励' : '浏览广告奖励',
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
  async signIn(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    // 检查今日是否已签到
    const signedRes = await pointsLogCollection.where(buildSignInQuery(uid)).get()

    if (signedRes.data.length > 0) {
      return { code: 400, msg: '今日已签到' }
    }

    const newBalance = await applyPointsChange({
      uid,
      amount: SIGN_IN_REWARD_POINTS,
      type: 'sign_in',
      description: '每日签到奖励',
    })

    return {
      code: 0,
      msg: `签到成功，获得${SIGN_IN_REWARD_POINTS}积分`,
      data: {
        earnPoints: SIGN_IN_REWARD_POINTS,
        balance: newBalance,
      },
    }
  },

  // 消费积分（解锁卡片）
  async consumePoints(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const { cardId, points } = authResult.params

    if (!cardId || !points || points <= 0) {
      return { code: 400, msg: '参数错误' }
    }

    // 获取用户当前积分
    const user = authResult.user

    if (user.points < points) {
      return { code: 400, msg: '积分不足' }
    }

    const newBalance = await applyPointsChange({
      uid,
      user,
      amount: -points,
      type: 'consume',
      description: '解锁卡片消耗',
      relatedId: cardId,
    })

    return {
      code: 0,
      msg: '解锁成功',
      data: {
        consumedPoints: points,
        balance: newBalance,
      },
    }
  },

  // 检查今日签到状态
  async getSignInStatus(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const signedRes = await pointsLogCollection.where(buildSignInQuery(uid)).get()

    return {
      code: 0,
      msg: 'success',
      data: {
        hasSigned: signedRes.data.length > 0,
      },
    }
  },

  // 增加免费查看次数（看广告后）
  async addFreeViews(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const updatedUser = await incrementUserFieldsAndGetUser(
      usersCollection,
      dbCmd,
      uid,
      {
        free_views: FREE_VIEW_REWARD_COUNT,
      },
    )

    return {
      code: 0,
      msg: `获得${FREE_VIEW_REWARD_COUNT}次免费查看机会`,
      data: {
        addViews: FREE_VIEW_REWARD_COUNT,
        freeViews: updatedUser?.free_views || 0,
      },
    }
  },

  // 消费免费查看次数
  async consumeFreeView(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const user = authResult.user

    if (user.free_views <= 0) {
      return { code: 400, msg: '免费次数已用完' }
    }

    await usersCollection.doc(uid).update({
      free_views: dbCmd.inc(-1),
    })

    return {
      code: 0,
      msg: 'success',
      data: {
        remaining: user.free_views - 1,
      },
    }
  },
}
