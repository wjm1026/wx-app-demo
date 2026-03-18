import { computed, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { achievementApi, cardApi, type Card } from '@/api'
import { usePageLayout } from '@/composables/usePageLayout'
import { useStore } from '@/store'
import {
  getErrorMessage,
  navigateBack,
  navigateTo,
  showToast,
} from '@/utils'

const EMPTY_CARD: Card = {
  _id: '',
  name: '',
  name_en: '',
  name_pinyin: '',
  image: '',
  description: '',
  fun_fact: '',
  is_free: true,
  points_cost: 0,
  view_count: 0,
  favorite_count: 0,
  is_hot: false,
  category_id: '',
}

export function useCardDetailPage() {
  const store = useStore()
  const { statusBarHeight, navBarHeight } = usePageLayout()
  const isFavorited = ref(false)
  const isLoading = ref(true)
  const cardData = ref<Card>({ ...EMPTY_CARD })
  const relatedCards = ref<Card[]>([])
  const audioContext = uni.createInnerAudioContext()

  const heroImages = computed(() => {
    const cover = cardData.value.image ? [cardData.value.image] : []
    const extra = (cardData.value.images || []).filter(Boolean)

    return Array.from(
      new Set([...cover, ...extra]),
    )
  })
  const heroBadgeText = computed(
    () => cardData.value.category?.name || '未分类',
  )

  audioContext.onError((res) => {
    console.error('播放失败:', res)
    showToast('播放失败，请检查网络', 'error')
    audioContext.stop()
    audioContext.src = ''
  })

  async function loadCardDetail(id: string) {
    isLoading.value = true

    try {
      const res = await cardApi.getCardDetail(id)

      if (res.code === 0 && res.data) {
        cardData.value = res.data
        isFavorited.value = !!res.data.isFavorited

        if (store.isLoggedIn) {
          void recordLearning(id)
        }

        if (res.data.category_id) {
          void loadRelatedCards(res.data._id, res.data.category_id)
        }

        return
      }

      showToast(res.msg || '加载失败', 'error')
    } catch (error) {
      console.error('加载卡片详情失败:', error)
      showToast(getErrorMessage(error, '加载失败'), 'error')
    } finally {
      isLoading.value = false
    }
  }

  async function recordLearning(cardId: string) {
    try {
      const res = await achievementApi.recordLearning(cardId)
      const newAchievements = res.data?.newAchievements || []

      if (res.code === 0 && newAchievements.length > 0) {
        setTimeout(() => {
          showToast(`解锁成就：${newAchievements[0].name}`, 'success')
        }, 1000)
      }
    } catch {
      // 静默失败，不影响主流程
    }
  }

  async function loadRelatedCards(cardId: string, categoryId: string) {
    try {
      const res = await cardApi.getRelatedCards({ cardId, categoryId, limit: 6 })

      if (res.code === 0) {
        relatedCards.value = res.data || []
      }
    } catch (error) {
      console.error('加载相关推荐失败:', error)
    }
  }

  function goBack() {
    navigateBack()
  }

  async function toggleFavorite() {
    if (!store.isLoggedIn) {
      showToast('请先登录', 'none')
      return
    }

    if (!cardData.value._id) {
      return
    }

    try {
      const res = await cardApi.toggleFavorite(cardData.value._id)

      if (res.code === 0 && res.data) {
        isFavorited.value = !!res.data.isFavorited
        showToast(isFavorited.value ? '已收藏' : '已取消收藏', 'success')
        return
      }

      showToast(res.msg || '操作失败', 'error')
    } catch (error) {
      showToast(getErrorMessage(error, '操作失败'), 'error')
    }
  }

  function playAudio(url: string | undefined, label: string) {
    if (!url) {
      showToast(`暂无${label}`, 'none')
      return
    }

    audioContext.stop()
    audioContext.src = url
    audioContext.play()
  }

  function playNameAudio(lang: 'cn' | 'en') {
    if (lang === 'cn') {
      playAudio(cardData.value.audio, '中文发音')
      return
    }

    playAudio(cardData.value.audio_en, '英文发音')
  }

  function playSound() {
    playAudio(cardData.value.sound, '音效')
  }

  function playVideo() {
    if (cardData.value.video) {
      showToast('视频功能开发中', 'none')
    }
  }

  function goCardDetail(id: string) {
    navigateTo(`/pages/card/detail?id=${id}`)
  }

  function shareCard() {
    showToast('分享功能开发中', 'none')
  }

  function nextCard() {
    if (relatedCards.value.length > 0) {
      goCardDetail(relatedCards.value[0]._id)
      return
    }

    showToast('没有更多卡片了', 'none')
  }

  onLoad((options) => {
    if (options?.id) {
      void loadCardDetail(options.id)
      return
    }

    showToast('卡片不存在', 'error')
    setTimeout(() => goBack(), 1500)
  })

  onUnmounted(() => {
    audioContext.destroy()
  })

  return {
    cardData,
    goBack,
    goCardDetail,
    heroBadgeText,
    heroImages,
    isFavorited,
    isLoading,
    navBarHeight,
    nextCard,
    playNameAudio,
    playSound,
    playVideo,
    relatedCards,
    shareCard,
    statusBarHeight,
    toggleFavorite,
  }
}
