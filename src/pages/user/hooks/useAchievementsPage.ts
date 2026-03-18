import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  achievementApi,
  type Achievement,
  type AchievementsResult,
  type LearningProgress,
} from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'
import { usePageLayout } from '@/composables/usePageLayout'

const ACHIEVEMENT_ICON_MAP: Record<string, string> = {
  first_card: '/static/icons/line/check-circle.svg',
  cards_10: '/static/icons/line/coins.svg',
  cards_50: '/static/icons/line/crown.svg',
  cards_100: '/static/icons/line/trophy.svg',
  category_complete: '/static/icons/line/bar-chart.svg',
  sign_7: '/static/icons/line/calendar.svg',
  sign_30: '/static/icons/line/calendar.svg',
  favorites_10: '/static/icons/line/heart.svg',
  invite_3: '/static/icons/line/users.svg',
  invite_10: '/static/icons/line/gift.svg',
}

const ACHIEVEMENT_TONES = ['tone-gold', 'tone-violet', 'tone-sky', 'tone-mint'] as const
const CATEGORY_TONES = ['tone-coral', 'tone-sky', 'tone-mint', 'tone-violet'] as const

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

/** 封装成就列表页面逻辑 */
export function useAchievementsPage() {
  const { statusBarHeight } = usePageLayout()
  const { ensureLoggedIn } = useLoginGuard()
  const isLoading = ref(true)
  const progress = ref<LearningProgress>({ ...EMPTY_PROGRESS })
  const achievements = ref<{
    achievements: Achievement[]
    unlockedCount: number
    totalCount: number
  }>({ ...EMPTY_ACHIEVEMENTS })

  const summaryCards = computed(() => [
    {
      key: 'learned',
      label: '已学卡片',
      value: String(progress.value.cardsLearned),
      icon: '/static/icons/line/coins.svg',
      tone: 'stat-sky',
    },
    {
      key: 'streak',
      label: '连续签到',
      value: String(progress.value.signStreak),
      icon: '/static/icons/line/calendar.svg',
      tone: 'stat-mint',
    },
    {
      key: 'unlocked',
      label: '成就解锁',
      value: `${achievements.value.unlockedCount}/${achievements.value.totalCount}`,
      icon: '/static/icons/line/trophy.svg',
      tone: 'stat-gold',
    },
  ])

  const completionLabel = computed(() => {
    if (progress.value.totalCards === 0) {
      return '开始学习后，这里会记录你的成长轨迹'
    }

    return `已掌握 ${progress.value.cardsLearned} / ${progress.value.totalCards} 张卡片`
  })

  const decoratedCategories = computed(() =>
    progress.value.categoryProgress.map((item, index) => ({
      ...item,
      key: item.categoryId,
      tone: CATEGORY_TONES[index % CATEGORY_TONES.length],
      progressLabel: `${item.learned}/${item.total}`,
      statusLabel: item.isComplete ? '已完成' : `${item.progress}%`,
    })),
  )

  const decoratedAchievements = computed(() =>
    achievements.value.achievements.map((item, index) => ({
      ...item,
      iconSrc: ACHIEVEMENT_ICON_MAP[item.id] || '/static/icons/line/check-circle.svg',
      tone: ACHIEVEMENT_TONES[index % ACHIEVEMENT_TONES.length],
      rewardLabel: `+${item.points} 积分`,
      statusLabel: item.unlocked ? '已解锁' : '进行中',
    })),
  )

  const unlockedAchievements = computed(() =>
    decoratedAchievements.value.filter((item) => item.unlocked),
  )

  const lockedAchievements = computed(() =>
    decoratedAchievements.value.filter((item) => !item.unlocked),
  )

  /** 加载数据 */
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
    completionLabel,
    decoratedAchievements,
    decoratedCategories,
    isLoading,
    lockedAchievements,
    progress,
    statusBarHeight,
    summaryCards,
    unlockedAchievements,
  }
}
