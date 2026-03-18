import { getService } from './shared'
import type {
  Achievement,
  AchievementsResult,
  ApiResponse,
  LearningProgress,
} from './types'

export const achievementApi = {
  /** 记录学习 */
  recordLearning: (cardId: string, duration?: number) =>
    getService('achievement-service').recordLearning({ cardId, duration }) as Promise<
      ApiResponse<{
        isNewCard: boolean
        newAchievements: Achievement[]
      }>
    >,
  /** 获取学习进度 */
  getLearningProgress: () =>
    getService('achievement-service').getLearningProgress() as Promise<ApiResponse<LearningProgress>>,
  /** 获取成就列表 */
  getAchievements: () =>
    getService('achievement-service').getAchievements() as Promise<ApiResponse<AchievementsResult>>,
  /** 检查并解锁成就列表 */
  checkAndUnlockAchievements: () =>
    getService('achievement-service').checkAndUnlockAchievements() as Promise<
      ApiResponse<{
        newAchievements: Achievement[]
      }>
    >,
}

