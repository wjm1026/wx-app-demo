import type { UserInfo } from '@/api'
import { buildInviteSharePath } from '@/utils'

export const MOCK_REWARDED_AD_DURATION_MS = 2000
export const REWARDED_VIDEO_AD_UNIT_ID = 'adunit-xxxxxxxxx'

// 用户中心的受保护页面统一收口到这里，后续新增入口时不用再全文搜 URL。
export const PROTECTED_USER_PAGE_ROUTES = {
  favorites: '/pages/user/favorites',
  achievements: '/pages/user/achievements',
  invite: '/pages/user/invite',
  pointsLog: '/pages/user/points-log',
  admin: '/pages/admin/admin',
} as const

export type ProtectedUserPage = keyof typeof PROTECTED_USER_PAGE_ROUTES

export interface UserPageViewModel {
  nickname: string
  avatar: string
  points: number
  inviteCount: number
  inviteCode: string
  isVip: boolean
}

/** 判断激励广告完成状态是否满足条件 */
export function isRewardedAdCompleted(status: unknown) {
  if (!status || typeof status !== 'object') {
    return false
  }

  return Boolean((status as { isEnded?: boolean }).isEnded)
}

/** 判断未授权编码是否满足条件 */
export function isUnauthorizedCode(code?: number) {
  return code === 401 || code === 404
}

/** 构建用户页面视图模型 */
export function buildUserPageViewModel(
  userInfo?: UserInfo | null,
): UserPageViewModel {
  return {
    nickname: userInfo?.nickname || '点击登录',
    avatar: userInfo?.avatar || '',
    points: userInfo?.points || 0,
    inviteCount: userInfo?.invite_count || 0,
    inviteCode: userInfo?.invite_code || '',
    isVip: userInfo?.is_vip || false,
  }
}

/** 构建登录成功信息 */
export function buildLoginSuccessMessage(isNewUser?: boolean) {
  return isNewUser ? '欢迎新用户！获得100积分 🎉' : '登录成功 🎉'
}

/** 构建用户分享参数 */
export function buildUserSharePayload(inviteCode?: string) {
  return {
    title: inviteCode
      ? `输入邀请码 ${inviteCode}，一起加入学习计划`
      : '来宝宝识物，一起学认知',
    path: buildInviteSharePath(inviteCode),
  }
}
