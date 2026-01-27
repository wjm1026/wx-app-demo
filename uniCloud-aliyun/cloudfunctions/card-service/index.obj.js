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
    await cardsCollection.where({ _id: cardId }).update({
      view_count: dbCmd.inc(1)
    })

    const res = await cardsCollection.where({ _id: cardId }).get()

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
  },

  // 初始化测试数据（仅限开发阶段使用）
  async initData() {
    // 1. 清理现有数据
    await Promise.all([
      categoriesCollection.where({ _id: dbCmd.exists(true) }).remove(),
      cardsCollection.where({ _id: dbCmd.exists(true) }).remove()
    ])

    // 2. 插入分类
    const categoryData = [
      { name: '动物', icon: '🦁', sort: 100, status: 1, color: '#FF9F7F', gradient: 'linear-gradient(135deg, #FF9F7F, #FFB347)', create_time: Date.now() },
      { name: '水果', icon: '🍎', sort: 90, status: 1, color: '#7ED321', gradient: 'linear-gradient(135deg, #7ED321, #B4E33D)', create_time: Date.now() },
      { name: '交通', icon: '🚗', sort: 80, status: 1, color: '#60A5FA', gradient: 'linear-gradient(135deg, #60A5FA, #A78BFA)', create_time: Date.now() }
    ]

    const categoriesRes = await Promise.all(categoryData.map(item => categoriesCollection.add(item)))
    const [catAnimal, catFruit, catTransport] = categoriesRes.map(r => r.id)

    // 3. 插入卡片
    const cardData = [
      // 动物
      { 
        category_id: catAnimal, 
        name: '老虎', 
        name_en: 'Tiger', 
        name_pinyin: 'lǎo hǔ', 
        image: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=600', 
        audio: 'https://dict.youdao.com/dictvoice?audio=%E8%80%81%E8%99%8E&le=zh',
        audio_en: 'https://dict.youdao.com/dictvoice?audio=tiger&type=2',
        sound: 'https://www.soundjay.com/animal/lion-roar-01.mp3', // 叫声
        description: '老虎是世界上最大的猫科动物，体型比狮子还要大。它们生活在亚洲的森林里，是非常厉害的捕猎者。老虎身上有漂亮的条纹，每只老虎的条纹都是独一无二的，就像人的指纹一样。',
        fun_fact: '老虎是游泳高手！它们喜欢在水里玩耍，而且可以游很长的距离。老虎的叫声可以传到3公里远的地方！',
        is_hot: true, 
        status: 1, 
        view_count: 1200, 
        create_time: Date.now() 
      },
      { 
        category_id: catAnimal, 
        name: '狮子', 
        name_en: 'Lion', 
        name_pinyin: 'shī zi', 
        image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=600', 
        audio: 'https://dict.youdao.com/dictvoice?audio=%E7%8B%AE%E5%AD%90&le=zh',
        audio_en: 'https://dict.youdao.com/dictvoice?audio=lion&type=2',
        sound: '',
        description: '狮子被称为“丛林之王”，它们是唯一一种喜欢群居的猫科动物。雄狮那漂亮的鬣毛能保护它们的脖子，并让它们看起来更威武。',
        fun_fact: '狮子的吼声非常大，在8公里外都能听到！',
        is_hot: true, 
        status: 1, 
        view_count: 800, 
        create_time: Date.now() 
      },
      { 
        category_id: catAnimal, 
        name: '大象', 
        name_en: 'Elephant', 
        name_pinyin: 'dà xiàng', 
        image: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=600', 
        audio: 'https://dict.youdao.com/dictvoice?audio=%E5%A4%A7%E8%B1%A1&le=zh',
        audio_en: 'https://dict.youdao.com/dictvoice?audio=elephant&type=2',
        sound: '',
        description: '大象是陆地上最大的动物。它们的长鼻子不仅能闻味，还能抓取食物、喝水，甚至互相打招呼。',
        fun_fact: '大象非常聪明，它们有着惊人的记忆力，可以记住很多年前的朋友！',
        is_hot: false, 
        status: 1, 
        view_count: 500, 
        create_time: Date.now() 
      },
      // 水果
      { 
        category_id: catFruit, 
        name: '苹果', 
        name_en: 'Apple', 
        name_pinyin: 'píng guǒ', 
        image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600', 
        audio: 'https://dict.youdao.com/dictvoice?audio=%E8%90%8D%E6%9E%9C&le=zh',
        audio_en: 'https://dict.youdao.com/dictvoice?audio=apple&type=2',
        description: '苹果是一种非常健康的水果，含有丰富的维生素和纤维。每天吃一个苹果，医生远离我！',
        fun_fact: '世界上有超过7500个品种的苹果！如果你每天尝试一种，需要20年才能全部尝遍。',
        is_hot: true, 
        status: 1, 
        view_count: 1500, 
        create_time: Date.now() 
      },
      { 
        category_id: catFruit, 
        name: '香蕉', 
        name_en: 'Banana', 
        name_pinyin: 'xiāng jiāo', 
        image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600', 
        audio: 'https://dict.youdao.com/dictvoice?audio=%E9%A6%99%E8%95%89&le=zh',
        audio_en: 'https://dict.youdao.com/dictvoice?audio=banana&type=2',
        description: '香蕉是神奇的“开心水果”，吃完能让人心情变好。它们生长在像大叶子一样的香蕉树上。',
        fun_fact: '香蕉实际上是一种浆果，而香蕉树其实是一种巨大的草本植物！',
        is_hot: false, 
        status: 1, 
        view_count: 900, 
        create_time: Date.now() 
      },
      // 交通
      { 
        category_id: catTransport, 
        name: '汽车', 
        name_en: 'Car', 
        name_pinyin: 'qì chē', 
        image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600', 
        audio: 'https://dict.youdao.com/dictvoice?audio=%E6%B1%BD%E8%BD%A6&le=zh',
        audio_en: 'https://dict.youdao.com/dictvoice?audio=car&type=2',
        sound: '',
        description: '汽车是我们日常生活中最常见的交通工具之一。它们有四个轮子，可以带我们去任何想去的地方。',
        fun_fact: '第一辆汽车在100多年前被发明出来，当时的最高速度还没你骑自行车快呢！',
        is_hot: true, 
        status: 1, 
        view_count: 2000, 
        create_time: Date.now() 
      }
    ]

    await Promise.all(cardData.map(item => cardsCollection.add(item)))

    return {
      code: 0,
      msg: '数据初始化成功！'
    }
  }
}
