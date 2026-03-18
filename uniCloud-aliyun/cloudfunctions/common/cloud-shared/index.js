const DAY_IN_MS = 24 * 60 * 60 * 1000
const INVITE_TASK_KEYS = [
  'share-friend',
  'moments',
  'douyin',
  'xiaohongshu',
]
const ACHIEVEMENTS = Object.freeze([
  Object.freeze({
    id: 'first_card',
    name: '初次探索',
    icon: '🌟',
    description: '学习第一张卡片',
    condition: { type: 'cards_learned', count: 1 },
    points: 10,
  }),
  Object.freeze({
    id: 'cards_10',
    name: '小小学霸',
    icon: '📚',
    description: '学习10张卡片',
    condition: { type: 'cards_learned', count: 10 },
    points: 50,
  }),
  Object.freeze({
    id: 'cards_50',
    name: '知识达人',
    icon: '🎓',
    description: '学习50张卡片',
    condition: { type: 'cards_learned', count: 50 },
    points: 100,
  }),
  Object.freeze({
    id: 'cards_100',
    name: '学习大师',
    icon: '👑',
    description: '学习100张卡片',
    condition: { type: 'cards_learned', count: 100 },
    points: 200,
  }),
  Object.freeze({
    id: 'category_complete',
    name: '分类专家',
    icon: '🏆',
    description: '完成一个分类的所有卡片',
    condition: { type: 'category_complete', count: 1 },
    points: 80,
  }),
  Object.freeze({
    id: 'sign_7',
    name: '坚持一周',
    icon: '📅',
    description: '连续签到7天',
    condition: { type: 'sign_streak', count: 7 },
    points: 70,
  }),
  Object.freeze({
    id: 'sign_30',
    name: '月度达人',
    icon: '🌙',
    description: '连续签到30天',
    condition: { type: 'sign_streak', count: 30 },
    points: 300,
  }),
  Object.freeze({
    id: 'favorites_10',
    name: '收藏家',
    icon: '❤️',
    description: '收藏10张卡片',
    condition: { type: 'favorites', count: 10 },
    points: 30,
  }),
  Object.freeze({
    id: 'invite_3',
    name: '小小推广员',
    icon: '🎁',
    description: '邀请3位好友',
    condition: { type: 'invites', count: 3 },
    points: 100,
  }),
  Object.freeze({
    id: 'invite_10',
    name: '超级推广员',
    icon: '🚀',
    description: '邀请10位好友',
    condition: { type: 'invites', count: 10 },
    points: 300,
  }),
])
const DEFAULT_INVITE_TASK_CONFIGS = Object.freeze([
  {
    key: 'share-friend',
    channel: '微信好友',
    title: '分享给微信好友',
    desc: '直接发送小程序卡片，好友打开后会自动带上你的分享口令。',
    note: '这是当前已接通的真实邀请链路，转化会直接沉淀到战绩里。',
    points: 100,
    actionLabel: '立即分享',
    enabled: true,
    sortOrder: 10,
  },
  {
    key: 'moments',
    channel: '朋友圈',
    title: '发朋友圈',
    desc: '复制分享文案后，从右上角菜单分享到朋友圈做曝光。',
    note: '朋友圈分享同样会带上你的分享口令，适合做一次性扩散。',
    points: 60,
    actionLabel: '查看指引',
    enabled: true,
    sortOrder: 20,
  },
  {
    key: 'douyin',
    channel: '抖音',
    title: '发抖音',
    desc: '复制短视频传播文案和口令，到抖音发布你的内容。',
    note: '适合剪短视频、晒学习过程或展示孩子的使用体验。',
    points: 120,
    actionLabel: '复制素材',
    enabled: true,
    sortOrder: 30,
  },
  {
    key: 'xiaohongshu',
    channel: '小红书',
    title: '发小红书',
    desc: '复制图文种草文案和口令，到小红书发布图文或笔记。',
    note: '适合做学习清单、启蒙经验分享和好物推荐类内容。',
    points: 80,
    actionLabel: '复制素材',
    enabled: true,
    sortOrder: 40,
  },
])

/** 判断邀请任务键名是否满足条件 */
function isInviteTaskKey(value) {
  return INVITE_TASK_KEYS.includes(value)
}

/** 规范化邀请任务文本 */
function normalizeInviteTaskText(value, fallback) {
  if (typeof value !== 'string') {
    return fallback
  }

  const nextValue = value.trim()
  return nextValue || fallback
}

/** 规范化邀请任务数值 */
function normalizeInviteTaskNumber(value, fallback, min = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  return Math.max(min, parsed)
}

/** 获取默认邀请任务配置 */
function getDefaultInviteTaskConfigs() {
  return DEFAULT_INVITE_TASK_CONFIGS.map((item) => ({ ...item }))
}

/** 规范化邀请任务配置 */
function normalizeInviteTaskConfig(rawConfig, fallbackConfig) {
  const source = rawConfig && typeof rawConfig === 'object' ? rawConfig : {}
  const key = isInviteTaskKey(source.key) ? source.key : fallbackConfig.key

  return {
    key,
    channel: normalizeInviteTaskText(source.channel, fallbackConfig.channel),
    title: normalizeInviteTaskText(source.title, fallbackConfig.title),
    desc: normalizeInviteTaskText(source.desc, fallbackConfig.desc),
    note: normalizeInviteTaskText(source.note, fallbackConfig.note),
    points: normalizeInviteTaskNumber(source.points, fallbackConfig.points),
    actionLabel: normalizeInviteTaskText(
      source.actionLabel,
      fallbackConfig.actionLabel,
    ),
    enabled:
      typeof source.enabled === 'boolean'
        ? source.enabled
        : fallbackConfig.enabled,
    sortOrder: normalizeInviteTaskNumber(
      source.sortOrder,
      fallbackConfig.sortOrder,
    ),
  }
}

/** 合并邀请任务配置 */
function mergeInviteTaskConfigs(rawConfigs = []) {
  const configMap = new Map()

  for (const item of rawConfigs) {
    if (!isInviteTaskKey(item?.key)) {
      continue
    }

    configMap.set(item.key, item)
  }

  return getDefaultInviteTaskConfigs()
    .map((item) => normalizeInviteTaskConfig(configMap.get(item.key), item))
    .sort((left, right) => left.sortOrder - right.sortOrder)
}

/** 加载邀请任务配置 */
async function loadInviteTaskConfigs(collection) {
  const res = await collection.get()
  return mergeInviteTaskConfigs(res.data || [])
}

/** 按键名获取邀请任务配置 */
function getInviteTaskConfigByKey(taskConfigs, key) {
  return (taskConfigs || []).find((item) => item.key === key) || null
}

/** 获取日期范围 */
function getDayRange(now = Date.now()) {
  const startDate = new Date(now)
  startDate.setHours(0, 0, 0, 0)

  const startTime = startDate.getTime()

  return {
    startTime,
    endTime: startTime + DAY_IN_MS,
  }
}

/** 追加积分日志 */
async function appendPointsLog(pointsLogCollection, record, now = Date.now()) {
  return pointsLogCollection.add({
    ...record,
    create_time:
      typeof record.create_time === 'number' ? record.create_time : now,
  })
}

/** 构建成就记录ID */
function buildAchievementRecordId(uid, achievementId) {
  return `achievement:${uid}:${achievementId}`
}

/** 构建成就积分日志ID */
function buildAchievementPointsLogId(uid, achievementId) {
  return `points:achievement:${uid}:${achievementId}`
}

/** 从积分日志ID解析成就ID */
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

/** 构建成就积分说明 */
function buildAchievementPointsDescription(achievementName) {
  return `解锁成就奖励：${achievementName}`
}

/** 获取错误信息 */
function getErrorMessage(error) {
  if (!error) {
    return ''
  }

  if (error instanceof Error) {
    return error.message
  }

  return typeof error === 'string' ? error : JSON.stringify(error)
}

/** 判断重复记录错误是否满足条件 */
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

/** 按ID获取成就 */
function getAchievementById(achievementId) {
  return ACHIEVEMENTS.find((item) => item.id === achievementId) || null
}

/** 按类型列表获取成就列表 */
function getAchievementsByTypes(types = []) {
  if (!Array.isArray(types) || types.length === 0) {
    return [...ACHIEVEMENTS]
  }

  const typeSet = new Set(types)
  return ACHIEVEMENTS.filter((item) => typeSet.has(item.condition.type))
}

/** 构建已记录成就IDSet */
function buildLoggedAchievementIdSet(pointsLogs = []) {
  const loggedAchievementIds = new Set()

  for (const pointsLog of pointsLogs) {
    const achievementId =
      pointsLog?.related_id || parseAchievementIdFromPointsLogId(pointsLog?._id)

    if (achievementId) {
      loggedAchievementIds.add(achievementId)
    }
  }

  return loggedAchievementIds
}

/** 追加成就积分日志 */
async function appendAchievementPointsLog(pointsLogCollection, options = {}) {
  const {
    uid,
    achievement,
    amount,
    unlockTime,
    balance,
  } = options
  const rewardAmount = Number(
    typeof amount === 'number' ? amount : achievement?.points || 0,
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

/** 根据统计数据解锁成就列表 */
async function unlockAchievementsForStats(options = {}) {
  const {
    uid,
    stats = {},
    types = [],
    usersCollection,
    achievementsCollection,
    pointsLogCollection,
    dbCmd,
  } = options

  if (
    !uid ||
    !usersCollection ||
    !achievementsCollection ||
    !pointsLogCollection ||
    !dbCmd
  ) {
    return []
  }

  const relevantAchievements = getAchievementsByTypes(types)
  if (relevantAchievements.length === 0) {
    return []
  }

  const achievementIds = relevantAchievements.map((item) => item.id)
  const existingAchievementsRes = await achievementsCollection
    .where({
      user_id: uid,
      achievement_id: dbCmd.in(achievementIds),
    })
    .field({ achievement_id: true })
    .get()
  const unlockedIds = new Set(
    (existingAchievementsRes.data || []).map((item) => item.achievement_id),
  )
  const newAchievements = []

  for (const achievement of relevantAchievements) {
    if (unlockedIds.has(achievement.id)) {
      continue
    }

    const statValue = Number(stats[achievement.condition.type] || 0)
    if (statValue < Number(achievement.condition.count || 0)) {
      continue
    }

    const unlockTime = Date.now()
    let created = false

    try {
      await achievementsCollection.add({
        _id: buildAchievementRecordId(uid, achievement.id),
        user_id: uid,
        achievement_id: achievement.id,
        points: achievement.points,
        unlock_time: unlockTime,
        create_time: unlockTime,
      })
      created = true
    } catch (error) {
      if (isDuplicateRecordError(error)) {
        unlockedIds.add(achievement.id)
        continue
      }

      throw error
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

    await appendAchievementPointsLog(pointsLogCollection, {
      uid,
      achievement,
      unlockTime,
      balance: nextBalance,
    })

    unlockedIds.add(achievement.id)
    newAchievements.push({
      ...achievement,
      unlocked: true,
      unlockTime,
    })
  }

  return newAchievements
}

// 用户字段增量更新在多个云对象里都会出现，统一封装后可以避免 update_time 和 inc 写法漂移。
async function incrementUserFields(
  usersCollection,
  dbCmd,
  userId,
  increments = {},
  extraData = {},
) {
  const updateData = {
    ...extraData,
  }

  for (const [field, rawAmount] of Object.entries(increments)) {
    const amount = Number(rawAmount || 0)
    if (!amount) {
      continue
    }

    updateData[field] = dbCmd.inc(amount)
  }

  if (!('update_time' in updateData)) {
    updateData.update_time = Date.now()
  }

  return usersCollection.doc(userId).update(updateData)
}

/** 按ID获取用户 */
async function getUserById(usersCollection, userId) {
  const userRes = await usersCollection.doc(userId).get()
  return userRes.data[0] || null
}

/** 递增用户字段并获取用户 */
async function incrementUserFieldsAndGetUser(
  usersCollection,
  dbCmd,
  userId,
  increments = {},
  extraData = {},
) {
  await incrementUserFields(usersCollection, dbCmd, userId, increments, extraData)
  return getUserById(usersCollection, userId)
}

/** 构建分页数据 */
function buildPagedData(list, total, page, pageSize, extra = {}) {
  return {
    list,
    total,
    page,
    pageSize,
    ...extra,
  }
}

module.exports = {
  ACHIEVEMENTS,
  DAY_IN_MS,
  DEFAULT_INVITE_TASK_CONFIGS,
  appendAchievementPointsLog,
  appendPointsLog,
  buildAchievementPointsDescription,
  buildAchievementPointsLogId,
  buildAchievementRecordId,
  buildLoggedAchievementIdSet,
  buildPagedData,
  getAchievementById,
  getUserById,
  getDayRange,
  getDefaultInviteTaskConfigs,
  getInviteTaskConfigByKey,
  incrementUserFields,
  incrementUserFieldsAndGetUser,
  isDuplicateRecordError,
  loadInviteTaskConfigs,
  mergeInviteTaskConfigs,
  normalizeInviteTaskConfig,
  parseAchievementIdFromPointsLogId,
  unlockAchievementsForStats,
}
