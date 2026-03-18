const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const learningLogCollection = db.collection('learning_log')
const achievementsCollection = db.collection('user_achievements')
const pointsLogCollection = db.collection('points_log')
const cardsCollection = db.collection('cards')
const categoriesCollection = db.collection('categories')
const { getAuthUserContext } = require('custom-auth')
const {
  appendPointsLog,
  incrementUserFieldsAndGetUser,
} = require('cloud-shared')
const CARD_LOOKUP_CHUNK_SIZE = 100

const ACHIEVEMENTS = [
  { id: 'first_card', name: '初次探索', icon: '🌟', description: '学习第一张卡片', condition: { type: 'cards_learned', count: 1 }, points: 10 },
  { id: 'cards_10', name: '小小学霸', icon: '📚', description: '学习10张卡片', condition: { type: 'cards_learned', count: 10 }, points: 50 },
  { id: 'cards_50', name: '知识达人', icon: '🎓', description: '学习50张卡片', condition: { type: 'cards_learned', count: 50 }, points: 100 },
  { id: 'cards_100', name: '学习大师', icon: '👑', description: '学习100张卡片', condition: { type: 'cards_learned', count: 100 }, points: 200 },
  { id: 'category_complete', name: '分类专家', icon: '🏆', description: '完成一个分类的所有卡片', condition: { type: 'category_complete', count: 1 }, points: 80 },
  { id: 'sign_7', name: '坚持一周', icon: '📅', description: '连续签到7天', condition: { type: 'sign_streak', count: 7 }, points: 70 },
  { id: 'sign_30', name: '月度达人', icon: '🌙', description: '连续签到30天', condition: { type: 'sign_streak', count: 30 }, points: 300 },
  { id: 'favorites_10', name: '收藏家', icon: '❤️', description: '收藏10张卡片', condition: { type: 'favorites', count: 10 }, points: 30 },
  { id: 'invite_3', name: '小小推广员', icon: '🎁', description: '邀请3位好友', condition: { type: 'invites', count: 3 }, points: 100 },
  { id: 'invite_10', name: '超级推广员', icon: '🚀', description: '邀请10位好友', condition: { type: 'invites', count: 10 }, points: 300 }
]

function buildLearningLogRecordId(uid, cardId) {
  return `learn:${uid}:${cardId}`
}

function buildAchievementRecordId(uid, achievementId) {
  return `achievement:${uid}:${achievementId}`
}

function buildAchievementPointsLogId(uid, achievementId) {
  return `points:achievement:${uid}:${achievementId}`
}

function parseAchievementIdFromPointsLogId(pointsLogId) {
  if (typeof pointsLogId !== 'string') {
    return ''
  }

  const prefix = 'points:achievement:'
  if (!pointsLogId.startsWith(prefix)) {
    return ''
  }

  const parts = pointsLogId.split(':')
  return parts[parts.length - 1] || ''
}

function buildAchievementPointsDescription(achievementName) {
  return `解锁成就奖励：${achievementName}`
}

function getErrorMessage(error) {
  if (!error) {
    return ''
  }

  if (error instanceof Error) {
    return error.message
  }

  return typeof error === 'string' ? error : JSON.stringify(error)
}

function isDuplicateRecordError(error) {
  const rawCode = Number(error?.code ?? error?.errCode ?? error?.errno ?? 0)
  const message = getErrorMessage(error).toLowerCase()

  return (
    rawCode === 11000 ||
    message.includes('duplicate') ||
    message.includes('e11000') ||
    message.includes('already exists')
  )
}

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

function chunkArray(list, chunkSize) {
  const result = []

  for (let index = 0; index < list.length; index += chunkSize) {
    result.push(list.slice(index, index + chunkSize))
  }

  return result
}

function buildLoggedAchievementIdSet(pointsLogs) {
  const loggedAchievementIds = new Set()

  for (const pointsLog of pointsLogs) {
    const achievementId =
      pointsLog.related_id || parseAchievementIdFromPointsLogId(pointsLog._id)

    if (achievementId) {
      loggedAchievementIds.add(achievementId)
    }
  }

  return loggedAchievementIds
}

async function appendAchievementPointsLog({
  uid,
  achievement,
  amount,
  unlockTime,
  balance,
}) {
  const rewardAmount = Number(
    typeof amount === 'number' ? amount : achievement.points || 0,
  )

  try {
    await appendPointsLog(pointsLogCollection, {
      _id: buildAchievementPointsLogId(uid, achievement.id),
      user_id: uid,
      type: 'achievement',
      amount: rewardAmount,
      ...(typeof balance === 'number' ? { balance } : {}),
      description: buildAchievementPointsDescription(achievement.name),
      related_id: achievement.id,
      create_time: typeof unlockTime === 'number' ? unlockTime : Date.now(),
    })

    return true
  } catch (error) {
    if (isDuplicateRecordError(error)) {
      return false
    }

    throw error
  }
}

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

    const achievement = ACHIEVEMENTS.find((item) => item.id === achievementId)
    if (!achievement) {
      continue
    }

    const created = await appendAchievementPointsLog({
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

async function checkAchievements(uid) {
  const [userRes, progressSnapshot, favCount, existingAchievements, achievementPointsLogs] = await Promise.all([
    usersCollection.doc(uid).get(),
    buildLearningProgressSnapshot(uid),
    db.collection('favorites').where({ user_id: uid }).count(),
    achievementsCollection.where({ user_id: uid }).get(),
    pointsLogCollection
      .where({ user_id: uid, type: 'achievement' })
      .field({ _id: true, related_id: true })
      .get(),
  ])

  const user = userRes.data[0] || {}
  const unlockedAchievementRecords = existingAchievements.data || []
  const loggedAchievementIds = await syncAchievementPointsLogs(
    uid,
    unlockedAchievementRecords,
    buildLoggedAchievementIdSet(achievementPointsLogs.data || []),
  )
  const unlockedIds = new Set(unlockedAchievementRecords.map(a => a.achievement_id))
  const newAchievements = []

  const stats = {
    cards_learned: progressSnapshot.cardsLearned,
    favorites: favCount.total,
    invites: user.invite_count || 0,
    sign_streak: user.sign_streak || 0,
    category_complete: progressSnapshot.categoryProgress.filter(c => c.isComplete).length
  }

  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.id)) continue

    const { type, count } = achievement.condition
    if (stats[type] >= count) {
      const unlockTime = Date.now()
      const achievementRecordId = buildAchievementRecordId(uid, achievement.id)
      let created = false

      try {
        await achievementsCollection.add({
          _id: achievementRecordId,
          user_id: uid,
          achievement_id: achievement.id,
          points: achievement.points,
          unlock_time: unlockTime,
          create_time: unlockTime
        })
        created = true
      } catch (error) {
        if (isDuplicateRecordError(error)) {
          console.warn('[achievement-service] duplicate achievement unlock skipped', {
            uid,
            achievementId: achievement.id,
            achievementRecordId,
          })
        } else {
          throw error
        }
      }

      if (!created) {
        continue
      }

      const updatedUser = await incrementUserFieldsAndGetUser(
        usersCollection,
        dbCmd,
        uid,
        { points: achievement.points },
      )
      const nextBalance = Number(updatedUser?.points || 0)

      await appendAchievementPointsLog({
        uid,
        achievement,
        unlockTime,
        balance: nextBalance,
      })
      loggedAchievementIds.add(achievement.id)

      newAchievements.push({
        ...achievement,
        unlocked: true,
        unlockTime
      })
    }
  }

  return newAchievements
}

module.exports = {
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
        await usersCollection.doc(uid).update({
          cards_learned: dbCmd.inc(1)
        })
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

    const newAchievements = isNewCard ? await checkAchievements(uid) : []

    return {
      code: 0,
      msg: 'success',
      data: {
        isNewCard,
        newAchievements
      }
    }
  },

  async getLearningProgress(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const [userRes, progressSnapshot] = await Promise.all([
      usersCollection.doc(uid).field({ cards_learned: true, sign_streak: true }).get(),
      buildLearningProgressSnapshot(uid)
    ])

    const user = userRes.data[0] || {}
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
        signStreak: user.sign_streak || 0,
        categoryProgress: progressSnapshot.categoryProgress
      }
    }
  },

  async getAchievements(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const [userAchievements, achievementPointsLogs] = await Promise.all([
      achievementsCollection
        .where({ user_id: uid })
        .get(),
      pointsLogCollection
        .where({ user_id: uid, type: 'achievement' })
        .field({ _id: true, related_id: true })
        .get(),
    ])

    await syncAchievementPointsLogs(
      uid,
      userAchievements.data || [],
      buildLoggedAchievementIdSet(achievementPointsLogs.data || []),
    )

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
