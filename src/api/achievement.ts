import { apiGet, apiPost } from './shared'
import type {
  Achievement,
  AchievementsResult,
  ApiResponse,
  LearningProgress,
} from './types'

export const achievementApi = {
  /** 记录学习 */
  recordLearning: (cardId: string, duration?: number) =>
    apiPost<{
      isNewCard: boolean
      newAchievements: Achievement[]
    }>('/api/v1/learning/records', { cardId, duration }) as Promise<
      ApiResponse<{
        isNewCard: boolean
        newAchievements: Achievement[]
      }>
    >,
  /** 获取学习进度 */
  getLearningProgress: () =>
    apiGet<LearningProgress>('/api/v1/learning/progress') as Promise<ApiResponse<LearningProgress>>,
  /** 获取成就列表 */
  getAchievements: () =>
    apiGet<AchievementsResult>('/api/v1/achievements') as Promise<ApiResponse<AchievementsResult>>,
  /** 检查并解锁成就列表 */
  checkAndUnlockAchievements: () =>
    apiPost<{
      newAchievements: Achievement[]
    }>('/api/v1/achievements/unlock-check') as Promise<
      ApiResponse<{
        newAchievements: Achievement[]
      }>
    >,
}
