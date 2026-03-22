import type { Ref } from 'vue'
import { achievementApi, type Achievement } from '@/api'
import { showToast } from '@/utils'

interface NotifyOptions {
  /** 成就提示延时（毫秒） */
  delay?: number
}

/** 分类详情页学习记录与成就提醒 */
export function useCategoryLearningRecorder(isLoggedIn: Ref<boolean>) {
  // 本次会话内已成功上报过学习记录的卡片
  const recordedLearningCardIds = new Set<string>()
  // 正在上报中的卡片，防止并发重复请求
  const learningRecordPendingCardIds = new Set<string>()
  // 已提示过的成就，防止重复弹提示
  const surfacedAchievementIds = new Set<string>()

  /** 展示新解锁成就提示 */
  function notifyUnlockedAchievements(
    achievements: Achievement[] | undefined,
    options: NotifyOptions = {},
  ) {
    const unlockedList = Array.isArray(achievements) ? achievements : []
    const freshUnlocked = unlockedList.filter((item) => {
      const achievementId = String(item?.id || '').trim()
      if (!achievementId || surfacedAchievementIds.has(achievementId)) {
        return false
      }

      surfacedAchievementIds.add(achievementId)
      return true
    })

    if (freshUnlocked.length <= 0) {
      return
    }

    const names = freshUnlocked
      .map((item) => String(item?.name || '').trim())
      .filter(Boolean)

    const message =
      freshUnlocked.length === 1
        ? `解锁成就：${names[0] || '新徽章'}`
        : `解锁${freshUnlocked.length}项新成就`

    const delay = Math.max(0, Number(options.delay || 0))
    if (delay > 0) {
      setTimeout(() => {
        showToast(message, 'success')
      }, delay)
      return
    }

    showToast(message, 'success')
  }

  /** 上报卡片学习记录（会话内去重） */
  async function recordLearningForCard(cardId: string) {
    const normalizedCardId = String(cardId || '').trim()
    if (!normalizedCardId || !isLoggedIn.value) {
      return
    }

    if (
      recordedLearningCardIds.has(normalizedCardId) ||
      learningRecordPendingCardIds.has(normalizedCardId)
    ) {
      return
    }

    learningRecordPendingCardIds.add(normalizedCardId)

    try {
      const response = await achievementApi.recordLearning(normalizedCardId)
      if (response.code !== 0 || !response.data) {
        return
      }

      recordedLearningCardIds.add(normalizedCardId)
      notifyUnlockedAchievements(response.data.newAchievements)
    } catch {
      // 上报失败不影响主流程；后续再次浏览同一卡片时可自动重试。
    } finally {
      learningRecordPendingCardIds.delete(normalizedCardId)
    }
  }

  return {
    notifyUnlockedAchievements,
    recordLearningForCard,
  }
}
