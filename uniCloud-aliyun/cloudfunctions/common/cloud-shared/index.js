const DAY_IN_MS = 24 * 60 * 60 * 1000
const INVITE_TASK_KEYS = [
  'share-friend',
  'moments',
  'douyin',
  'xiaohongshu',
]
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

function isInviteTaskKey(value) {
  return INVITE_TASK_KEYS.includes(value)
}

function normalizeInviteTaskText(value, fallback) {
  if (typeof value !== 'string') {
    return fallback
  }

  const nextValue = value.trim()
  return nextValue || fallback
}

function normalizeInviteTaskNumber(value, fallback, min = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  return Math.max(min, parsed)
}

function getDefaultInviteTaskConfigs() {
  return DEFAULT_INVITE_TASK_CONFIGS.map((item) => ({ ...item }))
}

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

async function loadInviteTaskConfigs(collection) {
  const res = await collection.get()
  return mergeInviteTaskConfigs(res.data || [])
}

function getInviteTaskConfigByKey(taskConfigs, key) {
  return (taskConfigs || []).find((item) => item.key === key) || null
}

function getDayRange(now = Date.now()) {
  const startDate = new Date(now)
  startDate.setHours(0, 0, 0, 0)

  const startTime = startDate.getTime()

  return {
    startTime,
    endTime: startTime + DAY_IN_MS,
  }
}

async function appendPointsLog(pointsLogCollection, record, now = Date.now()) {
  return pointsLogCollection.add({
    ...record,
    create_time:
      typeof record.create_time === 'number' ? record.create_time : now,
  })
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

async function getUserById(usersCollection, userId) {
  const userRes = await usersCollection.doc(userId).get()
  return userRes.data[0] || null
}

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
  DAY_IN_MS,
  DEFAULT_INVITE_TASK_CONFIGS,
  appendPointsLog,
  buildPagedData,
  getUserById,
  getDayRange,
  getDefaultInviteTaskConfigs,
  getInviteTaskConfigByKey,
  incrementUserFields,
  incrementUserFieldsAndGetUser,
  loadInviteTaskConfigs,
  mergeInviteTaskConfigs,
  normalizeInviteTaskConfig,
}
