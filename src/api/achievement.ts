import { getService } from './shared'
import type {
  Achievement,
  AchievementsResult,
  ApiResponse,
  LearningProgress,
} from './types'

export const achievementApi = {
  recordLearning: (cardId: string, duration?: number) =>
    getService('achievement-service').recordLearning({ cardId, duration }) as Promise<
      ApiResponse<{
        isNewCard: boolean
        newAchievements: Achievement[]
      }>
    >,
  getLearningProgress: () =>
    getService('achievement-service').getLearningProgress() as Promise<ApiResponse<LearningProgress>>,
  getAchievements: () =>
    getService('achievement-service').getAchievements() as Promise<ApiResponse<AchievementsResult>>,
  checkAndUnlockAchievements: () =>
    getService('achievement-service').checkAndUnlockAchievements() as Promise<
      ApiResponse<{
        newAchievements: Achievement[]
      }>
    >,
}

