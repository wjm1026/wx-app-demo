const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const learningLogCollection = db.collection('learning_log')
const achievementsCollection = db.collection('user_achievements')
const pointsLogCollection = db.collection('points_log')
const cardsCollection = db.collection('cards')
const categoriesCollection = db.collection('categories')
const favoritesCollection = db.collection('favorites')
const { getAuthUserContext } = require('custom-auth')
const {
  ACHIEVEMENTS,
  DAY_IN_MS,
  appendAchievementPointsLog,
  buildLoggedAchievementIdSet,
  getAchievementById,
  incrementUserFieldsAndGetUser,
  isDuplicateRecordError,
  unlockAchievementsForStats,
} = require('cloud-shared')
const CARD_LOOKUP_CHUNK_SIZE = 100

/** 构建学习日志记录ID */
function buildLearningLogRecordId(uid, cardId) {
  return `learn:${uid}:${cardId}`
}

/** 查找学习日志记录 */
async function findLearningLogRecord(uid, cardId) {
  const recordId = buildLearningLogRecordId(uid, cardId)
  const deterministicRes = await learningLogCollection.doc(recordId).get()
  const deterministicRecord = deterministicRes.data[0] || null

  if (deterministicRecord) {
    return {
      record: deterministicRecord,
      recordId,
      source: 'deterministic',
      duplicateCount: 1,
    }
  }

  const legacyRes = await learningLogCollection.where({ user_id: uid, card_id: cardId }).get()
  const legacyRecord = legacyRes.data[0] || null

  if (legacyRes.data.length > 1) {
    console.warn('[achievement-service] duplicate learning logs detected', {
      uid,
      cardId,
      duplicateCount: legacyRes.data.length,
    })
  }

  return {
    record: legacyRecord,
    recordId: legacyRecord?._id || recordId,
    source: legacyRecord ? 'legacy' : 'missing',
    duplicateCount: legacyRes.data.length,
  }
}

/** 拆分数组 */
function chunkArray(list, chunkSize) {
  const result = []

  for (let index = 0; index < list.length; index += chunkSize) {
    result.push(list.slice(index, index + chunkSize))
  }

  return result
}

/** 同步成就积分日志列表 */
async function syncAchievementPointsLogs(uid, achievementRecords, loggedAchievementIds) {
  if (!achievementRecords.length) {
    return loggedAchievementIds
  }

  const nextLoggedAchievementIds =
    loggedAchievementIds instanceof Set
      ? loggedAchievementIds
      : new Set(loggedAchievementIds || [])

  for (const record of achievementRecords) {
    const achievementId = record?.achievement_id

    if (!achievementId || nextLoggedAchievementIds.has(achievementId)) {
      continue
    }

    const achievement = getAchievementById(achievementId)
    if (!achievement) {
      continue
    }

    const created = await appendAchievementPointsLog(pointsLogCollection, {
      uid,
      achievement,
      amount: Number(record.points || achievement.points || 0),
      unlockTime: Number(record.unlock_time || record.create_time || Date.now()),
    })

    if (created || created === false) {
      nextLoggedAchievementIds.add(achievementId)
    }
  }

  return nextLoggedAchievementIds
}

/** 按分类获取已学习卡片列表 */
async function getLearnedCardsByCategory(cardIds) {
  if (!cardIds.length) {
    return {
      learnedByCategory: new Map(),
      validLearnedCardIds: new Set(),
    }
  }

  const chunks = chunkArray(cardIds, CARD_LOOKUP_CHUNK_SIZE)
  const cardResults = await Promise.all(
    chunks.map((chunk) =>
      cardsCollection
        .where({
          _id: dbCmd.in(chunk),
          status: 1,
        })
        .field({ _id: true, category_id: true })
        .get(),
    ),
  )

  const learnedByCategory = new Map()
  const validLearnedCardIds = new Set()

  for (const cardResult of cardResults) {
    for (const card of cardResult.data) {
      validLearnedCardIds.add(card._id)
      learnedByCategory.set(
        card.category_id,
        (learnedByCategory.get(card.category_id) || 0) + 1,
      )
    }
  }

  return {
    learnedByCategory,
    validLearnedCardIds,
  }
}

/** 构建学习进度快照 */
async function buildLearningProgressSnapshot(uid) {
  const [categoriesRes, userLogsRes] = await Promise.all([
    categoriesCollection
      .where({ status: 1 })
      .field({ _id: true, name: true, icon: true, card_count: true })
      .get(),
    learningLogCollection.where({ user_id: uid }).field({ card_id: true }).get(),
  ])

  const learnedCardIds = Array.from(
    new Set(
      userLogsRes.data
        .map((log) => log.card_id)
        .filter(Boolean),
    ),
  )
  const { learnedByCategory, validLearnedCardIds } = await getLearnedCardsByCategory(
    learnedCardIds,
  )

  const result = []
  let totalCards = 0

  for (const cat of categoriesRes.data) {
    const total = Number(cat.card_count || 0)
    const learned = Math.min(learnedByCategory.get(cat._id) || 0, total || 0)
    totalCards += total

    result.push({
      categoryId: cat._id,
      name: cat.name,
      icon: cat.icon,
      total,
      learned,
      progress: total > 0 ? Math.round((learned / total) * 100) : 0,
      isComplete: total > 0 && learned >= total
    })
  }

  return {
    cardsLearned: validLearnedCardIds.size,
    totalCards,
    categoryProgress: result,
  }
}

/** 获取当前连续签到天数 */
async function getCurrentSignStreak(uid, now = Date.now()) {
  if (!uid) {
    return 0
  }

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const todayStartTime = today.getTime()
  const signLogsRes = await pointsLogCollection
    .where({
      user_id: uid,
      type: 'sign_in',
      create_time: dbCmd.lt(todayStartTime + DAY_IN_MS),
    })
    .field({ create_time: true })
    .orderBy('create_time', 'desc')
    .limit(365)
    .get()
  const signedDaySet = new Set()

  for (const record of signLogsRes.data || []) {
    const signTime = Number(record?.create_time || 0)
    if (!signTime) {
      continue
    }

    const signDate = new Date(signTime)
    signDate.setHours(0, 0, 0, 0)
    signedDaySet.add(signDate.getTime())
  }

  let streak = 0
  let expectedDay = signedDaySet.has(todayStartTime)
    ? todayStartTime
    : todayStartTime - DAY_IN_MS

  while (signedDaySet.has(expectedDay)) {
    streak += 1
    expectedDay -= DAY_IN_MS
  }

  return streak
}

/** 统计分类下已学习卡片数量 */
async function countLearnedCardsInCategory(uid, categoryId) {
  if (!uid || !categoryId) {
    return 0
  }

  const categoryCardsRes = await cardsCollection
    .where({
      category_id: categoryId,
      status: 1,
    })
    .field({ _id: true })
    .get()
  const categoryCardIds = Array.from(
    new Set(
      (categoryCardsRes.data || [])
        .map((item) => item._id)
        .filter(Boolean),
    ),
  )

  if (categoryCardIds.length === 0) {
    return 0
  }

  const chunks = chunkArray(categoryCardIds, CARD_LOOKUP_CHUNK_SIZE)
  const learnedResults = await Promise.all(
    chunks.map((chunk) =>
      learningLogCollection
        .where({
          user_id: uid,
          card_id: dbCmd.in(chunk),
        })
        .field({ card_id: true })
        .get(),
    ),
  )
  const learnedCardIds = new Set()

  for (const learnedResult of learnedResults) {
    for (const record of learnedResult.data || []) {
      if (record?.card_id) {
        learnedCardIds.add(record.card_id)
      }
    }
  }

  return learnedCardIds.size
}

/** 构建学习成就统计数据 */
async function buildLearningAchievementStats(uid, cardId, updatedUser) {
  const stats = {
    cards_learned: Number(updatedUser?.cards_learned || 0),
    category_complete: 0,
  }

  if (!cardId) {
    return stats
  }

  const cardRes = await cardsCollection
    .doc(cardId)
    .field({ category_id: true })
    .get()
  const currentCard = cardRes.data[0]
  const categoryId = currentCard?.category_id

  if (!categoryId) {
    return stats
  }

  const [categoryRes, learnedCount] = await Promise.all([
    categoriesCollection
      .doc(categoryId)
      .field({ card_count: true })
      .get(),
    countLearnedCardsInCategory(uid, categoryId),
  ])
  const category = categoryRes.data[0] || {}
  const totalCards = Number(category.card_count || 0)

  if (totalCards > 0 && learnedCount >= totalCards) {
    stats.category_complete = 1
  }

  return stats
}

/** 检查学习成就列表 */
async function checkLearningAchievements(uid, cardId, updatedUser) {
  const stats = await buildLearningAchievementStats(uid, cardId, updatedUser)

  return unlockAchievementsForStats({
    uid,
    stats,
    types: ['cards_learned', 'category_complete'],
    usersCollection,
    achievementsCollection,
    pointsLogCollection,
    dbCmd,
  })
}

/** 检查成就列表 */
async function checkAchievements(uid) {
  const [userRes, progressSnapshot, signStreak, favCount, existingAchievements, achievementPointsLogs] = await Promise.all([
    usersCollection.doc(uid).get(),
    buildLearningProgressSnapshot(uid),
    getCurrentSignStreak(uid),
    favoritesCollection.where({ user_id: uid }).count(),
    achievementsCollection.where({ user_id: uid }).get(),
    pointsLogCollection
      .where({ user_id: uid, type: 'achievement' })
      .field({ _id: true, related_id: true })
      .get(),
  ])

  const user = userRes.data[0] || {}
  const unlockedAchievementRecords = existingAchievements.data || []
  await syncAchievementPointsLogs(
    uid,
    unlockedAchievementRecords,
    buildLoggedAchievementIdSet(achievementPointsLogs.data || []),
  )

  const stats = {
    cards_learned: progressSnapshot.cardsLearned,
    favorites: favCount.total,
    invites: user.invite_count || 0,
    sign_streak: signStreak,
    category_complete: progressSnapshot.categoryProgress.filter(c => c.isComplete).length
  }

  return unlockAchievementsForStats({
    uid,
    stats,
    types: ['cards_learned', 'category_complete', 'favorites', 'invites', 'sign_streak'],
    usersCollection,
    achievementsCollection,
    pointsLogCollection,
    dbCmd,
  })
}

module.exports = {
  /** 记录学习 */
  async recordLearning(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const { cardId, duration = 0 } = authResult.params

    if (!cardId) {
      return { code: 400, msg: '缺少卡片ID' }
    }

    let learningLogState = await findLearningLogRecord(uid, cardId)
    let isNewCard = !learningLogState.record

    let updatedUser = null

    if (isNewCard) {
      const recordTime = Date.now()
      let created = false

      try {
        await learningLogCollection.add({
          _id: buildLearningLogRecordId(uid, cardId),
          user_id: uid,
          card_id: cardId,
          duration,
          learn_count: 1,
          first_learn_time: recordTime,
          last_learn_time: recordTime,
          create_time: recordTime,
          update_time: recordTime
        })
        created = true
      } catch (error) {
        if (isDuplicateRecordError(error)) {
          console.warn('[achievement-service] duplicate learning record skipped', {
            uid,
            cardId,
            learningLogId: buildLearningLogRecordId(uid, cardId),
          })
        } else {
          throw error
        }
      }

      if (created) {
        updatedUser = await incrementUserFieldsAndGetUser(
          usersCollection,
          dbCmd,
          uid,
          {
            cards_learned: 1,
          },
        )
      } else {
        learningLogState = await findLearningLogRecord(uid, cardId)
        isNewCard = false
      }
    }

    if (!isNewCard) {
      await learningLogCollection.doc(learningLogState.recordId).update({
        duration: dbCmd.inc(duration),
        learn_count: dbCmd.inc(1),
        last_learn_time: Date.now(),
        update_time: Date.now()
      })
    }

    const newAchievements =
      isNewCard && updatedUser
        ? await checkLearningAchievements(uid, cardId, updatedUser)
        : []

    return {
      code: 0,
      msg: 'success',
      data: {
        isNewCard,
        newAchievements
      }
    }
  },

  /** 获取学习进度 */
  async getLearningProgress(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const [progressSnapshot, signStreak] = await Promise.all([
      buildLearningProgressSnapshot(uid),
      getCurrentSignStreak(uid),
    ])
    const cardsLearned = progressSnapshot.cardsLearned
    const totalCardsCount = progressSnapshot.totalCards
    const progress = totalCardsCount > 0 ? Math.round((cardsLearned / totalCardsCount) * 100) : 0

    return {
      code: 0,
      msg: 'success',
      data: {
        cardsLearned,
        totalCards: totalCardsCount,
        progress,
        signStreak,
        categoryProgress: progressSnapshot.categoryProgress
      }
    }
  },

  /** 获取成就列表 */
  async getAchievements(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const userAchievements = await achievementsCollection
      .where({ user_id: uid })
      .get()

    const unlockedIds = new Set(userAchievements.data.map(a => a.achievement_id))

    const allAchievements = ACHIEVEMENTS.map(achievement => ({
      ...achievement,
      unlocked: unlockedIds.has(achievement.id),
      unlockTime: userAchievements.data.find(a => a.achievement_id === achievement.id)?.unlock_time
    }))

    return {
      code: 0,
      msg: 'success',
      data: {
        achievements: allAchievements,
        unlockedCount: unlockedIds.size,
        totalCount: ACHIEVEMENTS.length
      }
    }
  },

  /** 检查并解锁成就列表 */
  async checkAndUnlockAchievements(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const newAchievements = await checkAchievements(uid)

    return {
      code: 0,
      msg: 'success',
      data: { newAchievements }
    }
  }
}
