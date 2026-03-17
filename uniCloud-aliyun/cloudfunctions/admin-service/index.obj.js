// 管理员服务云对象
const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const cardsCollection = db.collection('cards')
const categoriesCollection = db.collection('categories')
const favoritesCollection = db.collection('favorites')
const pointsLogCollection = db.collection('points_log')
const { getAuthContext } = require('custom-auth')

// 管理员openid列表（需要配置）
const ADMIN_OPENIDS = [
  // 在这里添加管理员的openid
]

async function resolveAdmin(params) {
  const authResult = getAuthContext(params, { message: '未登录' })
  if (!authResult.ok) {
    return authResult
  }

  const { uid } = authResult.auth
  const userRes = await usersCollection.doc(uid).get()
  if (userRes.data.length === 0) {
    return { ok: false, response: { code: 404, msg: '用户不存在' } }
  }

  const user = userRes.data[0]
  if (user.role !== 'admin' && !ADMIN_OPENIDS.includes(user.openid)) {
    return { ok: false, response: { code: 403, msg: '无管理员权限' } }
  }

  return {
    ok: true,
    params: authResult.params,
    adminId: uid,
    adminUser: user,
  }
}

module.exports = {
  _before: function() {
    this.clientInfo = this.getClientInfo()
  },

  // 验证管理员身份（前端调用检查）
  async checkAdmin(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    return {
      code: 0,
      msg: 'success',
      data: {
        isAdmin: true,
        nickname: adminResult.adminUser.nickname,
        avatar: adminResult.adminUser.avatar
      }
    }
  },

  // 获取统计数据
  async getStats(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const [userCount, cardCount, categoryCount, todayNewUsers, todayActiveUsers] = await Promise.all([
      usersCollection.count(),
      cardsCollection.count(),
      categoriesCollection.count(),
      // 今日新增用户
      usersCollection.where({
        create_time: dbCmd.gte(new Date(new Date().setHours(0, 0, 0, 0)).getTime())
      }).count(),
      // 今日活跃用户
      usersCollection.where({
        last_login_time: dbCmd.gte(new Date(new Date().setHours(0, 0, 0, 0)).getTime())
      }).count()
    ])

    // 获取积分发放统计
    const pointsStats = await pointsLogCollection.aggregate()
      .match({
        create_time: dbCmd.gte(new Date(new Date().setHours(0, 0, 0, 0)).getTime())
      })
      .group({
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      })
      .end()

    return {
      code: 0,
      msg: 'success',
      data: {
        userCount: userCount.total,
        cardCount: cardCount.total,
        categoryCount: categoryCount.total,
        todayNewUsers: todayNewUsers.total,
        todayActiveUsers: todayActiveUsers.total,
        todayPointsStats: pointsStats.data
      }
    }
  },

  // 获取用户列表
  async getUserList(params = {}) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const { page = 1, pageSize = 20, status, keyword } = adminResult.params

    // 构建查询条件
    const where = {}
    if (status !== undefined) {
      where.status = status
    }
    if (keyword) {
      where.nickname = new RegExp(keyword, 'i')
    }

    const [listRes, countRes] = await Promise.all([
      usersCollection
        .where(where)
        .orderBy('create_time', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .field({
          openid: false,
          unionid: false
        })
        .get(),
      usersCollection.where(where).count()
    ])

    return {
      code: 0,
      msg: 'success',
      data: {
        list: listRes.data,
        total: countRes.total,
        page,
        pageSize
      }
    }
  },

  // 获取用户详情
  async getUserDetail(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const { userId } = adminResult.params

    if (!userId) {
      return { code: 400, msg: '缺少用户ID' }
    }

    const userRes = await usersCollection.doc(userId).field({
      openid: false,
      unionid: false
    }).get()

    if (userRes.data.length === 0) {
      return { code: 404, msg: '用户不存在' }
    }

    const user = userRes.data[0]

    // 获取用户收藏数
    const favoriteCount = await favoritesCollection.where({ user_id: userId }).count()

    // 获取用户邀请数据
    const invitedCount = await usersCollection.where({ inviter_id: userId }).count()

    // 获取最近积分记录
    const recentPoints = await pointsLogCollection
      .where({ user_id: userId })
      .orderBy('create_time', 'desc')
      .limit(10)
      .get()

    return {
      code: 0,
      msg: 'success',
      data: {
        user,
        favoriteCount: favoriteCount.total,
        invitedCount: invitedCount.total,
        recentPoints: recentPoints.data
      }
    }
  },

  // 更新用户状态（封禁/解封）
  async updateUserStatus(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const { userId, status } = adminResult.params

    if (!userId) {
      return { code: 400, msg: '缺少用户ID' }
    }

    if (![0, 1, 2].includes(status)) {
      return { code: 400, msg: '无效的状态值' }
    }

    await usersCollection.doc(userId).update({
      status,
      update_time: Date.now()
    })

    const statusText = status === 2 ? '封禁' : '解封'

    return {
      code: 0,
      msg: `用户已${statusText}`
    }
  },

  // 给用户增加/扣除积分
  async adjustUserPoints(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const { userId, amount, reason } = adminResult.params

    if (!userId || !amount) {
      return { code: 400, msg: '参数不完整' }
    }

    // 获取当前用户积分
    const userRes = await usersCollection.doc(userId).get()
    if (userRes.data.length === 0) {
      return { code: 404, msg: '用户不存在' }
    }

    const user = userRes.data[0]
    const newBalance = (user.points || 0) + amount

    if (newBalance < 0) {
      return { code: 400, msg: '积分不足' }
    }

    // 更新积分
    await usersCollection.doc(userId).update({
      points: newBalance,
      update_time: Date.now()
    })

    // 记录积分日志
    await pointsLogCollection.add({
      user_id: userId,
      type: amount > 0 ? 'admin_add' : 'admin_deduct',
      amount,
      balance: newBalance,
      description: reason || (amount > 0 ? '管理员添加积分' : '管理员扣除积分'),
      operator_id: adminResult.adminId,
      create_time: Date.now()
    })

    return {
      code: 0,
      msg: '积分调整成功',
      data: { newBalance }
    }
  },

  // 设置/取消管理员
  async setUserRole(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const { userId, role } = adminResult.params

    if (!userId) {
      return { code: 400, msg: '缺少用户ID' }
    }

    if (!['user', 'admin'].includes(role)) {
      return { code: 400, msg: '无效的角色' }
    }

    await usersCollection.doc(userId).update({
      role,
      update_time: Date.now()
    })

    return {
      code: 0,
      msg: `已设置为${role === 'admin' ? '管理员' : '普通用户'}`
    }
  },

  // 获取卡片列表（管理用）
  async getCardList(params = {}) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const { page = 1, pageSize = 20, categoryId, keyword, status } = adminResult.params

    const where = {}
    if (categoryId) {
      where.category_id = categoryId
    }
    if (keyword) {
      where.name = new RegExp(keyword, 'i')
    }
    if (status !== undefined) {
      where.status = status
    }

    const [listRes, countRes] = await Promise.all([
      cardsCollection
        .where(where)
        .orderBy('create_time', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get(),
      cardsCollection.where(where).count()
    ])

    return {
      code: 0,
      msg: 'success',
      data: {
        list: listRes.data,
        total: countRes.total,
        page,
        pageSize
      }
    }
  },

  // 添加/更新卡片
  async saveCard(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const { _id, ...cardData } = adminResult.params

    if (!cardData.name || !cardData.category_id || !cardData.image) {
      return { code: 400, msg: '卡片信息不完整' }
    }

    if (_id) {
      // 更新
      await cardsCollection.doc(_id).update({
        ...cardData,
        update_time: Date.now()
      })
      return { code: 0, msg: '更新成功' }
    } else {
      // 新增
      const addRes = await cardsCollection.add({
        ...cardData,
        view_count: 0,
        favorite_count: 0,
        status: 1,
        create_time: Date.now()
      })

      // 更新分类的卡片数量
      await categoriesCollection.doc(cardData.category_id).update({
        card_count: dbCmd.inc(1)
      })

      return { code: 0, msg: '添加成功', data: { id: addRes.id } }
    }
  },

  // 删除卡片
  async deleteCard(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const { cardId } = adminResult.params

    if (!cardId) {
      return { code: 400, msg: '缺少卡片ID' }
    }

    const cardRes = await cardsCollection.doc(cardId).get()
    if (cardRes.data.length === 0) {
      return { code: 404, msg: '卡片不存在' }
    }

    const card = cardRes.data[0]

    // 删除卡片
    await cardsCollection.doc(cardId).remove()

    // 更新分类的卡片数量
    await categoriesCollection.doc(card.category_id).update({
      card_count: dbCmd.inc(-1)
    })

    // 删除相关收藏
    await favoritesCollection.where({ card_id: cardId }).remove()

    return { code: 0, msg: '删除成功' }
  },

  // 获取分类列表（管理用）
  async getCategoryList(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const res = await categoriesCollection.orderBy('sort_order', 'asc').get()

    return {
      code: 0,
      msg: 'success',
      data: res.data
    }
  },

  // 添加/更新分类
  async saveCategory(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const { _id, ...categoryData } = adminResult.params

    if (!categoryData.name) {
      return { code: 400, msg: '分类名称不能为空' }
    }

    if (_id) {
      await categoriesCollection.doc(_id).update({
        ...categoryData,
        update_time: Date.now()
      })
      return { code: 0, msg: '更新成功' }
    } else {
      const addRes = await categoriesCollection.add({
        ...categoryData,
        card_count: 0,
        sort_order: 0,
        create_time: Date.now()
      })
      return { code: 0, msg: '添加成功', data: { id: addRes.id } }
    }
  },

  // 删除分类
  async deleteCategory(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const { categoryId } = adminResult.params

    if (!categoryId) {
      return { code: 400, msg: '缺少分类ID' }
    }

    // 检查分类下是否有卡片
    const cardCount = await cardsCollection.where({ category_id: categoryId }).count()
    if (cardCount.total > 0) {
      return { code: 400, msg: '该分类下还有卡片，无法删除' }
    }

    await categoriesCollection.doc(categoryId).remove()

    return { code: 0, msg: '删除成功' }
  }
}
