import type { InviteInfoResult, InviteUserInfo } from '@/api'
import { DEFAULT_AVATAR, formatDate, formatRelativeDate } from '@/utils'

export const TASK_REWARDS = {
  shareFriend: 100,
  moments: 60,
  douyin: 120,
  xiaohongshu: 80,
} as const

export const INVITE_CODE_PATTERN = /^[A-Z0-9]{6}$/

export type MissionKey = 'share-friend' | 'moments' | 'douyin' | 'xiaohongshu'

export interface InviteSummaryCard {
  key: string
  label: string
  value: string
  icon: string
  tone: string
}

export interface InviteMissionCard {
  key: MissionKey
  title: string
  desc: string
  note: string
  points: number
  actionLabel: string
  actionType: 'share' | 'action'
  enabled: boolean
  channel: string
  icon: string
  tone: string
}

export interface InviteTipCard {
  key: string
  title: string
  desc: string
  icon: string
}

export interface DecoratedInviteUser {
  key: string
  avatar: string
  nickname: string
  timeLabel: string
  relativeLabel: string
  rewardLabel: string
}

// 任务卡片的展示配置基本固定，集中定义后，主 hook 只负责状态和副作用编排。
const MISSION_CARD_BLUEPRINTS = [
  {
    key: 'share-friend' as const,
    title: '分享给微信好友',
    desc: '直接发送小程序卡片，好友打开后会自动带上你的分享口令。',
    note: '这是当前已接通的真实邀请链路，转化会直接沉淀到战绩里。',
    reward: TASK_REWARDS.shareFriend,
    actionLabel: '立即分享',
    actionType: 'share' as const,
    channel: '微信好友',
    icon: '/static/icons/brands/wechat.svg',
    tone: 'tone-cyan',
  },
  {
    key: 'moments' as const,
    title: '发朋友圈',
    desc: '复制分享文案后，从右上角菜单分享到朋友圈做曝光。',
    note: '朋友圈分享同样会带上你的分享口令，适合做一次性扩散。',
    reward: TASK_REWARDS.moments,
    actionLabel: '查看指引',
    actionType: 'action' as const,
    channel: '朋友圈',
    icon: '/static/icons/brands/moments.svg',
    tone: 'tone-amber',
  },
  {
    key: 'douyin' as const,
    title: '发抖音',
    desc: '复制短视频传播文案和口令，到抖音发布你的内容。',
    note: '适合剪短视频、晒学习过程或展示孩子的使用体验。',
    reward: TASK_REWARDS.douyin,
    actionLabel: '复制素材',
    actionType: 'action' as const,
    channel: '抖音',
    icon: '/static/icons/brands/douyin.svg',
    tone: 'tone-rose',
  },
  {
    key: 'xiaohongshu' as const,
    title: '发小红书',
    desc: '复制图文种草文案和口令，到小红书发布图文或笔记。',
    note: '适合做学习清单、启蒙经验分享和好物推荐类内容。',
    reward: TASK_REWARDS.xiaohongshu,
    actionLabel: '复制素材',
    actionType: 'action' as const,
    channel: '小红书',
    icon: '/static/icons/brands/xiaohongshu.svg',
    tone: 'tone-green',
  },
] as const

const MISSION_TIPS: InviteTipCard[] = [
  {
    key: 'rule',
    title: '任务入口',
    desc: '先从微信好友任务开始跑真实转化，再把同一份口令同步到外部平台。',
    icon: '/static/icons/line/share.svg',
  },
  {
    key: 'copy',
    title: '统一素材',
    desc: '所有外部平台任务都会复用同一个分享口令，减少重复准备内容。',
    icon: '/static/icons/line/message.svg',
  },
  {
    key: 'result',
    title: '战绩回看',
    desc: '当前页面底部会展示通过分享朋友任务带来的真实邀请转化记录。',
    icon: '/static/icons/line/bar-chart.svg',
  },
]

export function extractInvitedList(data: InviteInfoResult): InviteUserInfo[] {
  const candidates = [
    data.list,
    data.invitedList,
    data.invitedUsers,
    data.invited_users,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  return []
}

function resolveInviteTime(item: InviteUserInfo) {
  return item.create_time || item.created_at || item.time
}

export function buildMissionCopy(
  platform: '朋友圈' | '抖音' | '小红书',
  inviteCode: string,
) {
  return [
    '我在「宝宝识物」里给孩子做认知启蒙，内容很适合日常陪学。',
    `打开小程序后可用邀请码：${inviteCode}`,
    '一起学认知、领积分、解锁更多学习内容。',
    `发布渠道：${platform}`,
  ].join('\n')
}

export function validateManualInviteCode(rawValue: string) {
  const normalized = rawValue.trim().toUpperCase()

  if (!normalized) {
    return { normalized: '', errorMessage: '先输入好友邀请码' }
  }

  if (!INVITE_CODE_PATTERN.test(normalized)) {
    return { normalized, errorMessage: '请输入6位邀请码' }
  }

  return { normalized, errorMessage: '' }
}

export function buildInviteSummaryCards(invitedCount: number): InviteSummaryCard[] {
  const totalMissionPoints =
    TASK_REWARDS.shareFriend +
    TASK_REWARDS.moments +
    TASK_REWARDS.douyin +
    TASK_REWARDS.xiaohongshu

  return [
    {
      key: 'tasks',
      label: '可做任务',
      value: String(MISSION_CARD_BLUEPRINTS.length),
      icon: '/static/icons/line/calendar.svg',
      tone: 'tone-cyan',
    },
    {
      key: 'potential',
      label: '本轮可赚',
      value: `+${totalMissionPoints}`,
      icon: '/static/icons/line/coins.svg',
      tone: 'tone-pink',
    },
    {
      key: 'invited',
      label: '已邀好友',
      value: String(invitedCount),
      icon: '/static/icons/line/users.svg',
      tone: 'tone-gold',
    },
  ]
}

export function buildMissionCards(options: {
  isLoggedIn: boolean
  hasInviteCode: boolean
}): InviteMissionCard[] {
  const actionLabel = options.isLoggedIn ? undefined : '先登录'
  const enabled = options.isLoggedIn && options.hasInviteCode

  return MISSION_CARD_BLUEPRINTS.map((item) => ({
    key: item.key,
    title: item.title,
    desc: item.desc,
    note: item.note,
    points: item.reward,
    actionLabel: actionLabel || item.actionLabel,
    actionType: item.actionType,
    enabled,
    channel: item.channel,
    icon: item.icon,
    tone: item.tone,
  }))
}

export function buildMissionTips() {
  return MISSION_TIPS
}

export function decorateInvitedList(
  invitedList: InviteUserInfo[],
): DecoratedInviteUser[] {
  return invitedList.map((item, index) => {
    const inviteTime = resolveInviteTime(item)

    return {
      key: item._id || `${item.nickname || 'guest'}-${index}`,
      avatar: item.avatar || DEFAULT_AVATAR,
      nickname: item.nickname || '微信好友',
      timeLabel: formatDate(inviteTime, 'mdHm') || '刚刚加入',
      relativeLabel: formatRelativeDate(inviteTime) || '刚刚',
      rewardLabel: `+${TASK_REWARDS.shareFriend}`,
    }
  })
}

export function buildConversionHint(options: {
  isLoggedIn: boolean
  invitedCount: number
}) {
  if (!options.isLoggedIn) {
    return '登录后可查看通过分享朋友任务带来的真实转化。'
  }

  if (options.invitedCount === 0) {
    return '完成分享朋友任务后，新加入的小伙伴会显示在这里。'
  }

  return `目前已有 ${options.invitedCount} 位好友通过你的分享加入。`
}
