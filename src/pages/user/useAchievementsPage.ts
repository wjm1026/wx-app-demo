import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  achievementApi,
  type Achievement,
  type AchievementsResult,
  type LearningProgress,
} from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'

const EMPTY_PROGRESS: LearningProgress = {
  cardsLearned: 0,
  totalCards: 0,
  progress: 0,
  signStreak: 0,
  categoryProgress: [],
}

const EMPTY_ACHIEVEMENTS: AchievementsResult = {
  achievements: [],
  unlockedCount: 0,
  totalCount: 0,
}

export function useAchievementsPage() {
  const { ensureLoggedIn } = useLoginGuard()
  const isLoading = ref(true)
  const progress = ref<LearningProgress>({ ...EMPTY_PROGRESS })
  const achievements = ref<{
    achievements: Achievement[]
    unlockedCount: number
    totalCount: number
  }>({ ...EMPTY_ACHIEVEMENTS })

  async function loadData() {
    isLoading.value = true

    try {
      const [progressRes, achievementsRes] = await Promise.all([
        achievementApi.getLearningProgress(),
        achievementApi.getAchievements(),
      ])

      if (progressRes.code === 0 && progressRes.data) {
        progress.value = progressRes.data
      }

      if (achievementsRes.code === 0 && achievementsRes.data) {
        achievements.value = achievementsRes.data
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  onShow(() => {
    if (!ensureLoggedIn()) {
      return
    }

    void loadData()
  })

  return {
    achievements,
    isLoading,
    progress,
  }
}
