import { getService } from './shared'
import type { Achievement, ApiResponse } from './types'

export const pointsApi = {
  earnByAd: (adType: 'banner' | 'video') =>
    getService('points-service').earnByAd({ adType }) as Promise<ApiResponse<{ earnPoints: number; balance: number }>>,
  signIn: () =>
    getService('points-service').signIn() as Promise<
      ApiResponse<{ earnPoints: number; balance: number; signStreak: number; newAchievements?: Achievement[] }>
    >,
  consumePoints: (cardId: string, points: number) =>
    getService('points-service').consumePoints({ cardId, points }) as Promise<ApiResponse>,
  getSignInStatus: () =>
    getService('points-service').getSignInStatus() as Promise<ApiResponse<{ hasSigned: boolean }>>,
  addFreeViews: () =>
    getService('points-service').addFreeViews() as Promise<ApiResponse<{ addViews: number; freeViews: number }>>,
  consumeFreeView: () =>
    getService('points-service').consumeFreeView() as Promise<ApiResponse<{ remaining: number }>>,
}
