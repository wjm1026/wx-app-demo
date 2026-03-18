// 积分服务云对象
const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const pointsLogCollection = db.collection('points_log')
const achievementsCollection = db.collection('user_achievements')
const { getAuthUserContext } = require('custom-auth')
const {
  DAY_IN_MS,
  appendPointsLog,
  getDayRange,
  incrementUserFieldsAndGetUser,
  isDuplicateRecordError,
  unlockAchievementsForStats,
} = require('cloud-shared')

const AD_REWARD_POINTS = {
  banner: 1,
  video: 10,
}

const SIGN_IN_REWARD_POINTS = 5
const FREE_VIEW_REWARD_COUNT = 3
const SIGN_IN_PENDING_TIMEOUT_MS = 15 * 1000

function buildSignInQuery(uid) {
  const { startTime, endTime } = getDayRange()

  return {
    user_id: uid,
    type: 'sign_in',
    create_time: dbCmd.gte(startTime).and(dbCmd.lt(endTime)),
  }
}

function buildSignInLogId(uid, dayStartTime) {
  return `points:sign_in:${uid}:${dayStartTime}`
}

function getLastSignInDay(user) {
  return Number(user?.last_sign_in_day || 0)
}

function calculateNextSignStreak(user, dayStartTime) {
  const lastSignInDay = getLastSignInDay(user)
  if (lastSignInDay === dayStartTime - DAY_IN_MS) {
    return Number(user?.sign_streak || 0) + 1
  }

  return 1
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
    let currentUser = authResult.user || {}

    const { startTime } = getDayRange()
    if (getLastSignInDay(currentUser) === startTime) {
      return { code: 400, msg: '今日已签到' }
    }

    const signInLogId = buildSignInLogId(uid, startTime)
    const todaySignInLogsRes = await pointsLogCollection
      .where(buildSignInQuery(uid))
      .field({ _id: true, balance: true, create_time: true })
      .limit(5)
      .get()
    const todaySignInLogs = todaySignInLogsRes.data || []
    const deterministicTodayLog = todaySignInLogs.find((item) => item?._id === signInLogId) || null

    if (todaySignInLogs.length > 0 && !deterministicTodayLog) {
      return { code: 400, msg: '今日已签到' }
    }

    if (deterministicTodayLog) {
      if (typeof deterministicTodayLog.balance === 'number') {
        return { code: 400, msg: '今日已签到' }
      }

      const pendingTime = Number(deterministicTodayLog.create_time || 0)
      if (pendingTime && Date.now() - pendingTime < SIGN_IN_PENDING_TIMEOUT_MS) {
        return { code: 409, msg: '签到处理中，请稍后重试' }
      }
    }

    try {
      await appendPointsLog(pointsLogCollection, {
        _id: signInLogId,
        user_id: uid,
        type: 'sign_in',
        amount: SIGN_IN_REWARD_POINTS,
        description: '每日签到奖励',
        related_id: String(startTime),
      })
    } catch (error) {
      if (!isDuplicateRecordError(error)) {
        throw error
      }

      const [latestUserRes, signInLogRes] = await Promise.all([
        usersCollection.doc(uid).field({ sign_streak: true, last_sign_in_day: true }).get(),
        pointsLogCollection.doc(signInLogId).get(),
      ])
      const latestUser = latestUserRes.data[0] || {}
      const signInLog = signInLogRes.data[0] || {}

      if (getLastSignInDay(latestUser) === startTime) {
        return { code: 400, msg: '今日已签到' }
      }

      const pendingTime = Number(signInLog?.create_time || 0)
      if (pendingTime && Date.now() - pendingTime < SIGN_IN_PENDING_TIMEOUT_MS) {
        return { code: 409, msg: '签到处理中，请稍后重试' }
      }

      currentUser = latestUser
    }

    const nextSignStreak = calculateNextSignStreak(currentUser, startTime)
    const updatedUser = await incrementUserFieldsAndGetUser(
      usersCollection,
      dbCmd,
      uid,
      {
        points: SIGN_IN_REWARD_POINTS,
      },
      {
        last_sign_in_day: startTime,
        sign_streak: nextSignStreak,
      },
    )
    const nextBalance = Number(updatedUser?.points || 0)

    await pointsLogCollection.doc(signInLogId).update({
      balance: nextBalance,
    })
    const newAchievements = await unlockAchievementsForStats({
      uid,
      stats: {
        sign_streak: nextSignStreak,
      },
      types: ['sign_streak'],
      usersCollection,
      achievementsCollection,
      pointsLogCollection,
      dbCmd,
    })

    return {
      code: 0,
      msg: `签到成功，获得${SIGN_IN_REWARD_POINTS}积分`,
      data: {
        earnPoints: SIGN_IN_REWARD_POINTS,
        balance: nextBalance,
        signStreak: nextSignStreak,
        newAchievements,
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
    const user = authResult.user || {}

    const { startTime } = getDayRange()
    let hasSigned = getLastSignInDay(user) === startTime

    if (!hasSigned) {
      const signedRes = await pointsLogCollection.where(buildSignInQuery(uid)).limit(1).get()
      hasSigned = signedRes.data.length > 0
    }

    return {
      code: 0,
      msg: 'success',
      data: {
        hasSigned,
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
