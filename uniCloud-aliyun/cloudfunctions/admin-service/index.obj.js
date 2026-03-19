// 管理员服务云对象
const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const cardsCollection = db.collection('cards')
const categoriesCollection = db.collection('categories')
const favoritesCollection = db.collection('favorites')
const learningLogCollection = db.collection('learning_log')
const inviteTaskConfigsCollection = db.collection('invite_task_configs')
const pointsLogCollection = db.collection('points_log')
const { getAuthUserContext } = require('custom-auth')
const {
  appendPointsLog,
  buildPagedData,
  loadInviteTaskConfigs,
  mergeInviteTaskConfigs,
  getDayRange,
  incrementUserFieldsAndGetUser,
} = require('cloud-shared')

// 管理员openid列表（需要配置）
const ADMIN_OPENIDS = [
  // 在这里添加管理员的openid
]

const LEARNING_LOG_RESET_CONFIRM_TEXT = 'RESET_LEARNING_LOG'

/** 解析后台 */
async function resolveAdmin(params) {
  const authResult = await getAuthUserContext(params, { message: '未登录' })
  if (!authResult.ok) {
    return authResult
  }

  const { uid } = authResult.auth
  const user = authResult.user
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

/** 构建用户列表查询条件 */
function buildUserListWhere(params) {
  const { status, keyword } = params
  const where = {}

  if (status === 1) {
    // 兼容历史脏数据：老用户可能没有 status 字段，但业务上应视为正常用户。
    where.status = dbCmd.neq(2)
  } else if (status !== undefined) {
    where.status = status
  }

  if (keyword) {
    const keywordRegExp = new RegExp(keyword, 'i')
    where.$or = [
      { nickname: keywordRegExp },
      { _id: keywordRegExp },
    ]
  }

  return where
}

/** 规范化用户记录 */
function normalizeUserRecord(user) {
  if (!user || typeof user !== 'object') {
    return user
  }

  return {
    ...user,
    role: user.role || 'user',
    status: user.status === 2 ? 2 : 1,
  }
}

/** 构建卡片列表查询条件 */
function buildCardListWhere(params) {
  const { categoryId, keyword, status } = params
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

  return where
}

/** 规范化分类排序值 */
function normalizeCategorySort(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

/** 规范化分类状态值 */
function normalizeCategoryStatus(value) {
  return Number(value) === 0 ? 0 : 1
}

/** 规范化分类记录 */
function normalizeCategoryRecord(category, countMap) {
  if (!category || typeof category !== 'object') {
    return category
  }

  const sort = normalizeCategorySort(category.sort ?? category.sort_order)
  const cardCount = countMap?.has(category._id)
    ? Number(countMap.get(category._id) || 0)
    : Number(category.card_count || 0)

  return {
    ...category,
    sort,
    status: normalizeCategoryStatus(category.status),
    card_count: cardCount,
  }
}

/** 构建分类保存 payload */
function buildCategorySavePayload(input = {}) {
  return {
    name: String(input.name || '').trim(),
    icon: String(input.icon || '').trim(),
    cover: String(input.cover || '').trim(),
    color: String(input.color || '').trim(),
    gradient: String(input.gradient || '').trim(),
    description: String(input.description || '').trim(),
    sort: normalizeCategorySort(input.sort ?? input.sort_order),
    status: normalizeCategoryStatus(input.status),
  }
}

/** 构建分类卡片数量映射（管理员口径：统计所有状态卡片） */
async function buildCategoryCountMapForAdmin() {
  const aggregateRes = await cardsCollection
    .aggregate()
    .group({
      _id: '$category_id',
      total: { $sum: 1 },
    })
    .end()

  const countMap = new Map()
  for (const item of aggregateRes.data || []) {
    if (!item?._id) {
      continue
    }
    countMap.set(item._id, Number(item.total || 0))
  }
  return countMap
}

/** 持久化保存邀请任务配置 */
async function persistInviteTaskConfigs(taskConfigs) {
  const nextConfigs = mergeInviteTaskConfigs(taskConfigs)
  const existingRes = await inviteTaskConfigsCollection.get()
  const existingMap = new Map()
  const now = Date.now()

  for (const item of existingRes.data || []) {
    if (!item?.key || existingMap.has(item.key)) {
      continue
    }

    existingMap.set(item.key, item)
  }

  await Promise.all(
    nextConfigs.map((item) => {
      const existing = existingMap.get(item.key)
      const payload = {
        ...item,
        update_time: now,
      }

      if (existing?._id) {
        return inviteTaskConfigsCollection.doc(existing._id).update(payload)
      }

      return inviteTaskConfigsCollection.add({
        ...payload,
        create_time: now,
      })
    }),
  )

  const validKeys = new Set(nextConfigs.map((item) => item.key))
  const duplicateDocs = (existingRes.data || []).filter(
    (item) => item?._id && (!validKeys.has(item.key) || existingMap.get(item.key)?._id !== item._id),
  )

  if (duplicateDocs.length > 0) {
    await Promise.all(
      duplicateDocs.map((item) =>
        inviteTaskConfigsCollection.doc(item._id).remove(),
      ),
    )
  }

  return nextConfigs
}

module.exports = {
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

    const { startTime } = getDayRange()

    const [userCount, cardCount, categoryCount, todayNewUsers, todayActiveUsers] = await Promise.all([
      usersCollection.count(),
      cardsCollection.count(),
      categoriesCollection.count(),
      // 今日新增用户
      usersCollection.where({
        create_time: dbCmd.gte(startTime)
      }).count(),
      // 今日活跃用户
      usersCollection.where({
        last_login_time: dbCmd.gte(startTime)
      }).count()
    ])

    // 获取积分发放统计
    const pointsStats = await pointsLogCollection.aggregate()
      .match({
        create_time: dbCmd.gte(startTime)
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

  // 获取积分任务配置
  async getInviteTaskConfigs(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const tasks = await loadInviteTaskConfigs(inviteTaskConfigsCollection)

    return {
      code: 0,
      msg: 'success',
      data: tasks,
    }
  },

  // 保存积分任务配置
  async saveInviteTaskConfigs(params = {}) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const configs = Array.isArray(adminResult.params?.configs)
      ? adminResult.params.configs
      : []

    if (configs.length === 0) {
      return { code: 400, msg: '缺少任务配置数据' }
    }

    const tasks = await persistInviteTaskConfigs(configs)

    return {
      code: 0,
      msg: '任务配置已保存',
      data: {
        tasks,
      },
    }
  },

  // 获取用户列表
  async getUserList(params = {}) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const { page = 1, pageSize = 20, status, keyword } = adminResult.params

    const where = buildUserListWhere({ status, keyword })

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
      data: buildPagedData(
        (listRes.data || []).map(normalizeUserRecord),
        countRes.total,
        page,
        pageSize,
      ),
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

    const user = normalizeUserRecord(userRes.data[0])

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

    // 管理员调整积分会同时影响余额和流水，统一使用共享 helper，避免别的后台入口再各写一遍。
    const updatedUser = await incrementUserFieldsAndGetUser(
      usersCollection,
      dbCmd,
      userId,
      { points: amount },
      {},
    )

    // 记录积分日志
    await appendPointsLog(pointsLogCollection, {
      user_id: userId,
      type: amount > 0 ? 'admin_add' : 'admin_deduct',
      amount,
      balance: Number(updatedUser?.points || 0),
      description: reason || (amount > 0 ? '管理员添加积分' : '管理员扣除积分'),
      operator_id: adminResult.adminId,
    })

    return {
      code: 0,
      msg: '积分调整成功',
      data: { newBalance: Number(updatedUser?.points || 0) }
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

    const where = buildCardListWhere({ categoryId, keyword, status })

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
      data: buildPagedData(listRes.data, countRes.total, page, pageSize),
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
      const cardRes = await cardsCollection.doc(_id).get()
      if (cardRes.data.length === 0) {
        return { code: 404, msg: '卡片不存在' }
      }

      const previousCard = cardRes.data[0] || {}
      const previousCategoryId = previousCard.category_id
      const nextCategoryId = cardData.category_id

      // 更新
      await cardsCollection.doc(_id).update({
        ...cardData,
        update_time: Date.now()
      })

      // 卡片在编辑时可能被迁移到其他分类，这里同步修正分类计数，避免统计值漂移。
      if (
        previousCategoryId &&
        nextCategoryId &&
        previousCategoryId !== nextCategoryId
      ) {
        await Promise.all([
          categoriesCollection.doc(previousCategoryId).update({
            card_count: dbCmd.inc(-1)
          }),
          categoriesCollection.doc(nextCategoryId).update({
            card_count: dbCmd.inc(1)
          }),
        ])
      }

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

    const [res, countMap] = await Promise.all([
      categoriesCollection
        .limit(500)
        .get(),
      buildCategoryCountMapForAdmin(),
    ])

    const categories = (res.data || [])
      .map((item) => normalizeCategoryRecord(item, countMap))
      .sort((left, right) => {
        const sortDiff = normalizeCategorySort(right?.sort) - normalizeCategorySort(left?.sort)
        if (sortDiff !== 0) {
          return sortDiff
        }

        return Number(left?.create_time || 0) - Number(right?.create_time || 0)
      })

    return {
      code: 0,
      msg: 'success',
      data: categories
    }
  },

  // 添加/更新分类
  async saveCategory(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const { _id, ...categoryData } = adminResult.params
    const payload = buildCategorySavePayload(categoryData)

    if (!payload.name) {
      return { code: 400, msg: '分类名称不能为空' }
    }

    if (_id) {
      await categoriesCollection.doc(_id).update({
        ...payload,
        update_time: Date.now()
      })
      return { code: 0, msg: '更新成功' }
    } else {
      const addRes = await categoriesCollection.add({
        ...payload,
        card_count: 0,
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
  },

  // 清空学习记录（仅管理员维护）
  async clearLearningLog(params) {
    const adminResult = await resolveAdmin(params)
    if (!adminResult.ok) {
      return adminResult.response
    }

    const { confirmText } = adminResult.params

    if (confirmText !== LEARNING_LOG_RESET_CONFIRM_TEXT) {
      return {
        code: 400,
        msg: `危险操作，请传入 confirmText=${LEARNING_LOG_RESET_CONFIRM_TEXT}`,
      }
    }

    const [logCountRes, affectedUsersRes] = await Promise.all([
      learningLogCollection.count(),
      usersCollection.where({ cards_learned: dbCmd.gt(0) }).count(),
    ])

    await Promise.all([
      learningLogCollection.where({ _id: dbCmd.exists(true) }).remove(),
      usersCollection.where({ cards_learned: dbCmd.gt(0) }).update({
        cards_learned: 0,
        update_time: Date.now(),
      }),
    ])

    return {
      code: 0,
      msg: 'learning_log 已清空，用户学习计数已重置',
      data: {
        removedLearningLogCount: logCountRes.total,
        resetUserCount: affectedUsersRes.total,
        achievementsUntouched: true,
      },
    }
  }
}
