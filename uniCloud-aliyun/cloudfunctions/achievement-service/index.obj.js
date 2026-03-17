const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const learningLogCollection = db.collection('learning_log')
const achievementsCollection = db.collection('user_achievements')
const cardsCollection = db.collection('cards')
const categoriesCollection = db.collection('categories')
const { getAuthContext } = require('custom-auth')

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

async function getCategoryProgress(uid) {
  const categories = await categoriesCollection.where({ status: 1 }).get()
  const userLogs = await learningLogCollection.where({ user_id: uid }).get()

  const learnedCardIds = new Set(userLogs.data.map(log => log.card_id))

  const result = []
  for (const cat of categories.data) {
    const catCards = await cardsCollection
      .where({ category_id: cat._id, status: 1 })
      .field({ _id: true })
      .get()

    const total = catCards.data.length
    const learned = catCards.data.filter(card => learnedCardIds.has(card._id)).length

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

  return result
}

async function checkAchievements(uid) {
  const [userRes, logCount, favCount, categoryProgress, existingAchievements] = await Promise.all([
    usersCollection.doc(uid).get(),
    learningLogCollection.where({ user_id: uid }).count(),
    db.collection('favorites').where({ user_id: uid }).count(),
    getCategoryProgress(uid),
    achievementsCollection.where({ user_id: uid }).get()
  ])

  const user = userRes.data[0] || {}
  const unlockedIds = new Set(existingAchievements.data.map(a => a.achievement_id))
  const newAchievements = []

  const stats = {
    cards_learned: logCount.total,
    favorites: favCount.total,
    invites: user.invite_count || 0,
    sign_streak: user.sign_streak || 0,
    category_complete: categoryProgress.filter(c => c.isComplete).length
  }

  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.id)) continue

    const { type, count } = achievement.condition
    if (stats[type] >= count) {
      await achievementsCollection.add({
        user_id: uid,
        achievement_id: achievement.id,
        unlock_time: Date.now()
      })

      await usersCollection.doc(uid).update({
        points: dbCmd.inc(achievement.points)
      })

      newAchievements.push({
        ...achievement,
        unlocked: true,
        unlockTime: Date.now()
      })
    }
  }

  return newAchievements
}

module.exports = {
  async recordLearning(params) {
    const authResult = getAuthContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const { cardId, duration = 0 } = authResult.params

    if (!cardId) {
      return { code: 400, msg: '缺少卡片ID' }
    }

    const existLog = await learningLogCollection
      .where({ user_id: uid, card_id: cardId })
      .get()

    const isNewCard = existLog.data.length === 0

    if (isNewCard) {
      await learningLogCollection.add({
        user_id: uid,
        card_id: cardId,
        duration,
        learn_count: 1,
        first_learn_time: Date.now(),
        last_learn_time: Date.now()
      })

      await usersCollection.doc(uid).update({
        cards_learned: dbCmd.inc(1)
      })
    } else {
      await learningLogCollection.doc(existLog.data[0]._id).update({
        duration: dbCmd.inc(duration),
        learn_count: dbCmd.inc(1),
        last_learn_time: Date.now()
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
    const authResult = getAuthContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const [userRes, logCount, totalCards, categoryStats] = await Promise.all([
      usersCollection.doc(uid).field({ cards_learned: true, sign_streak: true }).get(),
      learningLogCollection.where({ user_id: uid }).count(),
      cardsCollection.where({ status: 1 }).count(),
      getCategoryProgress(uid)
    ])

    const user = userRes.data[0] || {}
    const cardsLearned = logCount.total
    const totalCardsCount = totalCards.total
    const progress = totalCardsCount > 0 ? Math.round((cardsLearned / totalCardsCount) * 100) : 0

    return {
      code: 0,
      msg: 'success',
      data: {
        cardsLearned,
        totalCards: totalCardsCount,
        progress,
        signStreak: user.sign_streak || 0,
        categoryProgress: categoryStats
      }
    }
  },

  async getAchievements(params) {
    const authResult = getAuthContext(params)
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

  async checkAndUnlockAchievements(params) {
    const authResult = getAuthContext(params)
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
