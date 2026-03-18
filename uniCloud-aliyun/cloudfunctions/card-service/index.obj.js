// 卡片服务云对象
const db = uniCloud.database()
const dbCmd = db.command
const cardsCollection = db.collection('cards')
const categoriesCollection = db.collection('categories')
const favoritesCollection = db.collection('favorites')
const pointsLogCollection = db.collection('points_log')
const achievementsCollection = db.collection('user_achievements')
const usersCollection = db.collection('users')
const { createSeedData } = require('./seed-data')
const {
  getCardImageUpdate,
  isLegacyPlaceholderUrl,
  normalizeCardRecord,
} = require('./image-data')
const { getAuthUserContext } = require('custom-auth')
const { isDuplicateRecordError, unlockAchievementsForStats } = require('cloud-shared')

const CATEGORY_COVER_MAP = createSeedData().categories.reduce((result, category) => {
  result[category.name] = category.cover
  return result
}, {})

/** 规范化分类记录 */
function normalizeCategoryRecord(category) {
  if (!category) {
    return category
  }

  const cover =
    category.cover && !isLegacyPlaceholderUrl(category.cover)
      ? category.cover
      : CATEGORY_COVER_MAP[category.name] || category.cover || ''

  return {
    ...category,
    cover,
  }
}

/** 规范化卡片列表 */
function normalizeCardList(cards = []) {
  return cards.map((item) => normalizeCardRecord(item))
}

/** 构建收藏记录ID */
function buildFavoriteRecordId(uid, cardId) {
  return `favorite:${uid}:${cardId}`
}

/** 查找收藏记录ID 列表 */
async function findFavoriteRecordIds(uid, cardId) {
  const recordIds = new Set()
  const deterministicId = buildFavoriteRecordId(uid, cardId)
  const [deterministicRes, legacyRes] = await Promise.all([
    favoritesCollection.doc(deterministicId).get(),
    favoritesCollection.where({ user_id: uid, card_id: cardId }).field({ _id: true }).get(),
  ])

  if (deterministicRes.data[0]?._id) {
    recordIds.add(deterministicRes.data[0]._id)
  }

  for (const item of legacyRes.data || []) {
    if (item?._id) {
      recordIds.add(item._id)
    }
  }

  return Array.from(recordIds)
}

/** 同步卡片收藏数量 */
async function syncCardFavoriteCount(cardId) {
  const countRes = await favoritesCollection.where({ card_id: cardId }).count()
  await cardsCollection.doc(cardId).update({
    favorite_count: Number(countRes.total || 0),
  })
}

module.exports = {
  // 获取分类列表
  async getCategories() {
    const res = await categoriesCollection
      .where({ status: 1 })
      .orderBy('sort', 'desc')
      .orderBy('create_time', 'asc')
      .get()

    return {
      code: 0,
      msg: 'success',
      data: res.data.map((item) => normalizeCategoryRecord(item))
    }
  },

  // 获取首页数据
  async getHomeData() {
    // 并行获取多个数据
    const [categoriesRes, hotCardsRes, recentCardsRes] = await Promise.all([
      // 获取分类（限制8个用于首页展示）
      categoriesCollection
        .where({ status: 1 })
        .orderBy('sort', 'desc')
        .limit(8)
        .get(),
      
      // 获取热门推荐卡片
      cardsCollection
        .where({ status: 1, is_hot: true })
        .orderBy('view_count', 'desc')
        .limit(6)
        .get(),
      
      // 获取最新卡片
      cardsCollection
        .where({ status: 1 })
        .orderBy('create_time', 'desc')
        .limit(10)
        .get()
    ])

    return {
      code: 0,
      msg: 'success',
      data: {
        categories: categoriesRes.data.map((item) => normalizeCategoryRecord(item)),
        hotCards: normalizeCardList(hotCardsRes.data),
        recentCards: normalizeCardList(recentCardsRes.data)
      }
    }
  },

  // 获取分类下的卡片列表
  async getCardsByCategory(params) {
    const { categoryId, page = 1, pageSize = 20 } = params

    if (!categoryId) {
      return { code: 400, msg: '缺少分类ID' }
    }

    const res = await cardsCollection
      .where({ category_id: categoryId, status: 1 })
      .orderBy('sort', 'desc')
      .orderBy('create_time', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // 获取总数
    const countRes = await cardsCollection
      .where({ category_id: categoryId, status: 1 })
      .count()

    return {
      code: 0,
      msg: 'success',
      data: {
        list: normalizeCardList(res.data),
        total: countRes.total,
        page,
        pageSize
      }
    }
  },

  // 搜索卡片
  async searchCards(params) {
    const { keyword, page = 1, pageSize = 20 } = params

    if (!keyword || keyword.trim().length === 0) {
      return { code: 400, msg: '请输入搜索关键词' }
    }

    const searchKeyword = keyword.trim()
    const keywordRegExp = new RegExp(searchKeyword, 'i')
    const categoryRes = await categoriesCollection
      .where({
        status: 1,
        name: keywordRegExp
      })
      .field({ _id: true })
      .get()

    const categoryIds = categoryRes.data.map((item) => item._id)
    const orConditions = [
      { name: keywordRegExp },
      { name_pinyin: keywordRegExp },
      { name_en: keywordRegExp },
      { tags: searchKeyword }
    ]

    if (categoryIds.length > 0) {
      orConditions.push({ category_id: dbCmd.in(categoryIds) })
    }

    const where = {
      status: 1,
      $or: orConditions
    }

    const [res, countRes] = await Promise.all([
      cardsCollection
        .where(where)
        .orderBy('view_count', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get(),
      cardsCollection.where(where).count()
    ])

    return {
      code: 0,
      msg: 'success',
      data: {
        list: normalizeCardList(res.data),
        total: countRes.total,
        keyword: searchKeyword,
        page,
        pageSize
      }
    }
  },

  // 获取卡片详情
  async getCardDetail(params) {
    const authResult = await getAuthUserContext(params, { required: false })
    const { cardId } = authResult.params

    if (!cardId) {
      return { code: 400, msg: '缺少卡片ID' }
    }

    // 增加浏览次数
    await cardsCollection.where({ _id: cardId }).update({
      view_count: dbCmd.inc(1)
    })

    const res = await cardsCollection.where({ _id: cardId }).get()

    if (res.data.length === 0) {
      return { code: 404, msg: '卡片不存在' }
    }

    const card = normalizeCardRecord(res.data[0])

    // 获取分类信息
    let category = null
    if (card.category_id) {
      const categoryRes = await categoriesCollection.doc(card.category_id).get()
      if (categoryRes.data.length > 0) {
        category = normalizeCategoryRecord(categoryRes.data[0])
      }
    }

    // 检查是否已收藏（如果已登录）
    let isFavorited = false
    if (authResult.auth?.uid) {
      const favoriteRes = await favoritesCollection
        .where({ user_id: authResult.auth.uid, card_id: cardId })
        .get()
      isFavorited = favoriteRes.data.length > 0
    }

    return {
      code: 0,
      msg: 'success',
      data: {
        ...card,
        category,
        isFavorited
      }
    }
  },

  // 收藏/取消收藏
  async toggleFavorite(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const { cardId } = authResult.params

    if (!cardId) {
      return { code: 400, msg: '缺少卡片ID' }
    }

    // 检查卡片是否存在
    const cardRes = await cardsCollection.doc(cardId).get()
    if (cardRes.data.length === 0) {
      return { code: 404, msg: '卡片不存在' }
    }

    // 检查是否已收藏
    const favoriteRecordIds = await findFavoriteRecordIds(uid, cardId)

    if (favoriteRecordIds.length > 0) {
      // 取消收藏
      await Promise.all(
        favoriteRecordIds.map((favoriteId) =>
          favoritesCollection
            .doc(favoriteId)
            .remove()
            .catch((error) => {
              console.warn('[card-service] favorite remove skipped', {
                uid,
                cardId,
                favoriteId,
                message: error?.message || String(error),
              })
            }),
        ),
      )
      await syncCardFavoriteCount(cardId)
      return { code: 0, msg: '已取消收藏', data: { isFavorited: false } }
    } else {
      // 添加收藏
      try {
        await favoritesCollection.add({
          _id: buildFavoriteRecordId(uid, cardId),
          user_id: uid,
          card_id: cardId,
          create_time: Date.now()
        })
      } catch (error) {
        if (!isDuplicateRecordError(error)) {
          throw error
        }
      }
      await syncCardFavoriteCount(cardId)
      const favoriteCountRes = await favoritesCollection.where({ user_id: uid }).count()
      const newAchievements = await unlockAchievementsForStats({
        uid,
        stats: {
          favorites: favoriteCountRes.total,
        },
        types: ['favorites'],
        usersCollection,
        achievementsCollection,
        pointsLogCollection,
        dbCmd,
      })
      return {
        code: 0,
        msg: '收藏成功',
        data: {
          isFavorited: true,
          newAchievements,
        },
      }
    }
  },

  // 获取收藏列表
  async getFavorites(params) {
    const authResult = await getAuthUserContext(params)
    if (!authResult.ok) {
      return authResult.response
    }
    const { uid } = authResult.auth

    const { page = 1, pageSize = 20 } = authResult.params || {}

    // 获取收藏记录 + 总数
    const [favoritesRes, totalRes] = await Promise.all([
      favoritesCollection
        .where({ user_id: uid })
        .orderBy('create_time', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get(),
      favoritesCollection.where({ user_id: uid }).count()
    ])

    // 获取卡片详情
    const cardIds = favoritesRes.data.map(f => f.card_id)
    let cards = []
    
    if (cardIds.length > 0) {
      const cardsRes = await cardsCollection
        .where({ _id: dbCmd.in(cardIds) })
        .get()
      cards = cardsRes.data
    }

    // 合并数据（返回卡片列表，附加收藏信息）
    const list = favoritesRes.data.map(fav => {
      const card = cards.find(c => c._id === fav.card_id)
      if (!card) return null
      return {
        ...normalizeCardRecord(card),
        favorite_id: fav._id,
        favorited_at: fav.create_time
      }
    }).filter(Boolean)

    return {
      code: 0,
      msg: 'success',
      data: {
        list,
        total: totalRes.total,
        page,
        pageSize
      }
    }
  },

  // 获取相关推荐
  async getRelatedCards(params) {
    const { cardId, categoryId, limit = 6 } = params

    const res = await cardsCollection
      .where({
        status: 1,
        category_id: categoryId,
        _id: dbCmd.neq(cardId)
      })
      .orderBy('view_count', 'desc')
      .limit(limit)
      .get()

    return {
      code: 0,
      msg: 'success',
      data: normalizeCardList(res.data)
    }
  },

  /** 修复卡片图片 */
  async repairCardImages() {
    const [cardsRes, categoriesRes] = await Promise.all([
      cardsCollection.where({ _id: dbCmd.exists(true) }).limit(500).get(),
      categoriesCollection.where({ _id: dbCmd.exists(true) }).limit(100).get()
    ])

    const cardUpdates = cardsRes.data
      .map((card) => ({
        id: card._id,
        update: getCardImageUpdate(card)
      }))
      .filter((item) => item.update)

    const categoryUpdates = categoriesRes.data
      .map((category) => {
        const cover = CATEGORY_COVER_MAP[category.name]

        if (!cover || (category.cover && !isLegacyPlaceholderUrl(category.cover))) {
          return null
        }

        return {
          id: category._id,
          update: { cover }
        }
      })
      .filter(Boolean)

    await Promise.all([
      ...cardUpdates.map((item) => cardsCollection.doc(item.id).update(item.update)),
      ...categoryUpdates.map((item) => categoriesCollection.doc(item.id).update(item.update))
    ])

    return {
      code: 0,
      msg: `图片修复完成，已更新 ${cardUpdates.length} 张卡片和 ${categoryUpdates.length} 个分类`,
      data: {
        cardCount: cardUpdates.length,
        categoryCount: categoryUpdates.length
      }
    }
  },

  // 初始化测试数据（仅限开发阶段使用）
  async initData() {
    const seedData = createSeedData()

    // 1. 清理现有数据
    await Promise.all([
      categoriesCollection.where({ _id: dbCmd.exists(true) }).remove(),
      cardsCollection.where({ _id: dbCmd.exists(true) }).remove(),
      favoritesCollection.where({ _id: dbCmd.exists(true) }).remove()
    ])

    // 2. 插入分类
    const categoriesRes = await Promise.all(
      seedData.categories.map((item) => categoriesCollection.add(item))
    )
    const categoryIds = seedData.categories.reduce((result, category, index) => {
      result[category.name] = categoriesRes[index].id
      return result
    }, {})

    // 3. 插入卡片
    const cardData = seedData.buildCards(categoryIds)
    await Promise.all(cardData.map((item) => cardsCollection.add(item)))

    return {
      code: 0,
      msg: `数据初始化成功，已创建 ${seedData.categories.length} 个分类和 ${cardData.length} 张卡片`,
      data: {
        categoryCount: seedData.categories.length,
        cardCount: cardData.length
      }
    }
  }
}
