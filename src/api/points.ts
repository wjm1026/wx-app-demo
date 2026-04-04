import { apiGet, apiPost } from './shared'
import type { Achievement, ApiResponse, ConsumeActionResult, ConsumeActionType } from './types'

export const pointsApi = {
  /** 通过广告获取 */
  earnByAd: (adType: 'banner' | 'video') =>
    apiPost<{ earnPoints: number; balance: number }>(
      '/api/v1/points/earn-ad',
      { adType },
    ) as Promise<ApiResponse<{ earnPoints: number; balance: number }>>,
  /** 处理签到相关逻辑 */
  signIn: () =>
    apiPost<{ earnPoints: number; balance: number; signStreak: number; newAchievements?: Achievement[] }>(
      '/api/v1/points/sign-in',
    ) as Promise<
      ApiResponse<{ earnPoints: number; balance: number; signStreak: number; newAchievements?: Achievement[] }>
    >,
  /** 消耗积分 */
  consumePoints: (cardId: string, points: number) =>
    apiPost('/api/v1/points/consume', { cardId, points }) as Promise<ApiResponse>,
  /** 按动作扣费（后端权威） */
  consumeAction: (payload: { actionType: ConsumeActionType; cardId?: string; roundKey?: string }) =>
    apiPost<ConsumeActionResult>(
      '/api/v1/points/consume-action',
      payload,
    ) as Promise<ApiResponse<ConsumeActionResult>>,
  /** 获取签到状态 */
  getSignInStatus: () =>
    apiGet<{ hasSigned: boolean }>('/api/v1/points/sign-in-status') as Promise<ApiResponse<{ hasSigned: boolean }>>,
}
