// 卡片服务云对象
const db = uniCloud.database()
const dbCmd = db.command
const cardsCollection = db.collection('cards')
const categoriesCollection = db.collection('categories')
const favoritesCollection = db.collection('favorites')
const usersCollection = db.collection('users')

module.exports = {
  _before: function() {
    this.clientInfo = this.getClientInfo()
  },

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
      data: res.data
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
        categories: categoriesRes.data,
        hotCards: hotCardsRes.data,
        recentCards: recentCardsRes.data
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
        list: res.data,
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

    // 使用正则搜索名称、拼音、标签
    const res = await cardsCollection
      .where({
        status: 1,
        $or: [
          { name: new RegExp(searchKeyword, 'i') },
          { name_pinyin: new RegExp(searchKeyword, 'i') },
          { name_en: new RegExp(searchKeyword, 'i') },
          { tags: searchKeyword }
        ]
      })
      .orderBy('view_count', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      msg: 'success',
      data: {
        list: res.data,
        keyword: searchKeyword,
        page,
        pageSize
      }
    }
  },

  // 获取卡片详情
  async getCardDetail(params) {
    const { cardId } = params

    if (!cardId) {
      return { code: 400, msg: '缺少卡片ID' }
    }

    // 增加浏览次数
    await cardsCollection.doc(cardId).update({
      view_count: dbCmd.inc(1)
    })

    const res = await cardsCollection.doc(cardId).get()

    if (res.data.length === 0) {
      return { code: 404, msg: '卡片不存在' }
    }

    const card = res.data[0]

    // 获取分类信息
    let category = null
    if (card.category_id) {
      const categoryRes = await categoriesCollection.doc(card.category_id).get()
      if (categoryRes.data.length > 0) {
        category = categoryRes.data[0]
      }
    }

    // 检查是否已收藏（如果已登录）
    let isFavorited = false
    try {
      const tokenInfo = this.getUniIdToken && await this.getUniIdToken()
      if (tokenInfo?.uid) {
        const favoriteRes = await favoritesCollection
          .where({ user_id: tokenInfo.uid, card_id: cardId })
          .get()
        isFavorited = favoriteRes.data.length > 0
      }
    } catch (e) {
      // 未登录忽略
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
    const { uid } = this.getUniIdToken && await this.getUniIdToken() || {}
    
    if (!uid) {
      return { code: 401, msg: '请先登录' }
    }

    const { cardId } = params

    if (!cardId) {
      return { code: 400, msg: '缺少卡片ID' }
    }

    // 检查卡片是否存在
    const cardRes = await cardsCollection.doc(cardId).get()
    if (cardRes.data.length === 0) {
      return { code: 404, msg: '卡片不存在' }
    }

    // 检查是否已收藏
    const existRes = await favoritesCollection
      .where({ user_id: uid, card_id: cardId })
      .get()

    if (existRes.data.length > 0) {
      // 取消收藏
      await favoritesCollection.doc(existRes.data[0]._id).remove()
      await cardsCollection.doc(cardId).update({
        favorite_count: dbCmd.inc(-1)
      })
      return { code: 0, msg: '已取消收藏', data: { isFavorited: false } }
    } else {
      // 添加收藏
      await favoritesCollection.add({
        user_id: uid,
        card_id: cardId,
        create_time: Date.now()
      })
      await cardsCollection.doc(cardId).update({
        favorite_count: dbCmd.inc(1)
      })
      return { code: 0, msg: '收藏成功', data: { isFavorited: true } }
    }
  },

  // 获取收藏列表
  async getFavorites(params) {
    const { uid } = this.getUniIdToken && await this.getUniIdToken() || {}
    
    if (!uid) {
      return { code: 401, msg: '请先登录' }
    }

    const { page = 1, pageSize = 20 } = params || {}

    // 获取收藏记录
    const favoritesRes = await favoritesCollection
      .where({ user_id: uid })
      .orderBy('create_time', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // 获取卡片详情
    const cardIds = favoritesRes.data.map(f => f.card_id)
    let cards = []
    
    if (cardIds.length > 0) {
      const cardsRes = await cardsCollection
        .where({ _id: dbCmd.in(cardIds) })
        .get()
      cards = cardsRes.data
    }

    // 合并数据
    const list = favoritesRes.data.map(fav => {
      const card = cards.find(c => c._id === fav.card_id)
      return {
        ...fav,
        card
      }
    }).filter(item => item.card)

    return {
      code: 0,
      msg: 'success',
      data: {
        list,
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
      data: res.data
    }
  }
}
