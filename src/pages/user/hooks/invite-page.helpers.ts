import type {
  InviteInfoResult,
  InviteTaskConfig,
  InviteTaskKey,
  InviteUserInfo,
} from '@/api'
import {
  getDefaultInviteTaskConfigs,
  getInviteTaskMeta,
} from '@/config/invite-tasks'
import { DEFAULT_AVATAR, formatDate, formatRelativeDate } from '@/utils'

export const INVITE_CODE_PATTERN = /^[A-Z0-9]{6}$/
export type MissionKey = InviteTaskKey

export interface InviteSummaryCard {
  key: string
  label: string
  value: string
  icon: string
  tone: string
}

export interface InviteMissionCard {
  key: InviteTaskKey
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

export interface DecoratedInviteUser {
  key: string
  avatar: string
  nickname: string
  timeLabel: string
  relativeLabel: string
  rewardLabel: string
}

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

function getEnabledTaskConfigs(taskConfigs: InviteTaskConfig[]) {
  return taskConfigs.filter((item) => item.enabled)
}

export function resolveShareTaskReward(taskConfigs: InviteTaskConfig[]) {
  const shareTask =
    taskConfigs.find((item) => item.key === 'share-friend') ||
    getDefaultInviteTaskConfigs().find((item) => item.key === 'share-friend')

  return Number(shareTask?.points || 0)
}

export function buildInviteSummaryCards(
  invitedCount: number,
  taskConfigs: InviteTaskConfig[],
): InviteSummaryCard[] {
  const enabledTaskConfigs = getEnabledTaskConfigs(taskConfigs)
  const totalMissionPoints = enabledTaskConfigs.reduce(
    (total, item) => total + Number(item.points || 0),
    0,
  )

  return [
    {
      key: 'tasks',
      label: '可做任务',
      value: String(enabledTaskConfigs.length),
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
  taskConfigs: InviteTaskConfig[]
}): InviteMissionCard[] {
  const actionLabel = options.isLoggedIn ? undefined : '先登录'
  const enabled = options.isLoggedIn && options.hasInviteCode

  return getEnabledTaskConfigs(options.taskConfigs).map((item) => {
    const meta = getInviteTaskMeta(item.key)

    return {
      key: item.key,
      title: item.title,
      desc: item.desc,
      note: item.note,
      points: item.points,
      actionLabel: actionLabel || item.actionLabel,
      actionType: meta.actionType,
      enabled,
      channel: item.channel,
      icon: meta.icon,
      tone: meta.tone,
    }
  })
}

export function decorateInvitedList(
  invitedList: InviteUserInfo[],
  shareReward: number,
): DecoratedInviteUser[] {
  return invitedList.map((item, index) => {
    const inviteTime = resolveInviteTime(item)

    return {
      key: item._id || `${item.nickname || 'guest'}-${index}`,
      avatar: item.avatar || DEFAULT_AVATAR,
      nickname: item.nickname || '微信好友',
      timeLabel: formatDate(inviteTime, 'mdHm') || '刚刚加入',
      relativeLabel: formatRelativeDate(inviteTime) || '刚刚',
      rewardLabel: shareReward > 0 ? `+${shareReward}` : '已加入',
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
