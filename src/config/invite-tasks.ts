import type { InviteTaskConfig, InviteTaskKey } from '@/api/types'

export interface InviteTaskMeta {
  actionType: 'share' | 'action'
  icon: string
  tone: string
}

const DEFAULT_INVITE_TASK_CONFIGS: InviteTaskConfig[] = [
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
]

export const INVITE_TASK_METAS: Record<InviteTaskKey, InviteTaskMeta> = {
  'share-friend': {
    actionType: 'share',
    icon: '/static/icons/brands/wechat.svg',
    tone: 'tone-cyan',
  },
  moments: {
    actionType: 'action',
    icon: '/static/icons/brands/moments.svg',
    tone: 'tone-amber',
  },
  douyin: {
    actionType: 'action',
    icon: '/static/icons/brands/douyin.svg',
    tone: 'tone-rose',
  },
  xiaohongshu: {
    actionType: 'action',
    icon: '/static/icons/brands/xiaohongshu.svg',
    tone: 'tone-green',
  },
}

/** 判断邀请任务键名是否满足条件 */
function isInviteTaskKey(value: unknown): value is InviteTaskKey {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(INVITE_TASK_METAS, value)
  )
}

/** 限制整数 */
function clampInteger(value: unknown, fallback: number, min = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  return Math.max(min, parsed)
}

/** 规范化文本 */
function normalizeText(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback
  }

  const nextValue = value.trim()
  return nextValue || fallback
}

/** 获取默认邀请任务配置 */
export function getDefaultInviteTaskConfigs(): InviteTaskConfig[] {
  return DEFAULT_INVITE_TASK_CONFIGS.map((item) => ({ ...item }))
}

/** 获取邀请任务元数据 */
export function getInviteTaskMeta(key: InviteTaskKey) {
  return INVITE_TASK_METAS[key]
}

/** 规范化邀请任务配置 */
export function normalizeInviteTaskConfig(
  rawConfig: Partial<InviteTaskConfig> | null | undefined,
  fallbackConfig: InviteTaskConfig,
): InviteTaskConfig {
  const source = rawConfig ?? {}
  const key = isInviteTaskKey(source.key)
    ? source.key
    : fallbackConfig.key

  return {
    key,
    channel: normalizeText(source.channel, fallbackConfig.channel),
    title: normalizeText(source.title, fallbackConfig.title),
    desc: normalizeText(source.desc, fallbackConfig.desc),
    note: normalizeText(source.note, fallbackConfig.note),
    points: clampInteger(source.points, fallbackConfig.points),
    actionLabel: normalizeText(source.actionLabel, fallbackConfig.actionLabel),
    enabled:
      typeof source.enabled === 'boolean'
        ? source.enabled
        : fallbackConfig.enabled,
    sortOrder: clampInteger(source.sortOrder, fallbackConfig.sortOrder),
  }
}

/** 合并邀请任务配置 */
export function mergeInviteTaskConfigs(
  rawConfigs: Array<Partial<InviteTaskConfig>> | null | undefined,
): InviteTaskConfig[] {
  const configMap = new Map<InviteTaskKey, Partial<InviteTaskConfig>>()

  for (const item of rawConfigs || []) {
    if (!isInviteTaskKey(item?.key)) {
      continue
    }

    configMap.set(item.key, item)
  }

  return getDefaultInviteTaskConfigs()
    .map((item) => normalizeInviteTaskConfig(configMap.get(item.key), item))
    .sort((left, right) => left.sortOrder - right.sortOrder)
}
