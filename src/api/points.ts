import { getService } from './shared'
import type { Achievement, ApiResponse } from './types'

export const pointsApi = {
  /** 通过广告获取 */
  earnByAd: (adType: 'banner' | 'video') =>
    getService('points-service').earnByAd({ adType }) as Promise<ApiResponse<{ earnPoints: number; balance: number }>>,
  /** 处理签到相关逻辑 */
  signIn: () =>
    getService('points-service').signIn() as Promise<
      ApiResponse<{ earnPoints: number; balance: number; signStreak: number; newAchievements?: Achievement[] }>
    >,
  /** 消耗积分 */
  consumePoints: (cardId: string, points: number) =>
    getService('points-service').consumePoints({ cardId, points }) as Promise<ApiResponse>,
  /** 获取签到状态 */
  getSignInStatus: () =>
    getService('points-service').getSignInStatus() as Promise<ApiResponse<{ hasSigned: boolean }>>,
  /** 新增免费次数 */
  addFreeViews: () =>
    getService('points-service').addFreeViews() as Promise<ApiResponse<{ addViews: number; freeViews: number }>>,
  /** 消耗免费查看次数 */
  consumeFreeView: () =>
    getService('points-service').consumeFreeView() as Promise<ApiResponse<{ remaining: number }>>,
}
