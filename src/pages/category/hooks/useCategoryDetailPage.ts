import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { cardApi } from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'
import { usePageLayout } from '@/composables/usePageLayout'
import { getErrorMessage, showToast } from '@/utils'
import { useDetailAudioController } from './category-detail.audio'
import { useCategoryDetailData } from './category-detail.data'
import { useCategoryLearningRecorder } from './category-detail.learning'
import { decodeQueryValue, fallbackBack, parseStartIndex, type DetailQuery } from './category-detail.query'

/**
 * 分类详情页主编排 Hook：
 * 只负责把“数据层 / 音频层 / 学习记录层 / 页面生命周期”串起来
 */
export function useCategoryDetailPage() {
  const { statusBarHeight } = usePageLayout()
  const { ensureLoggedIn, isLoggedIn } = useLoginGuard()

  // 路由入参状态
  const categoryId = ref('')
  const categoryName = ref('图片详情')
  const startCardId = ref('')
  const startIndex = ref(0)
  // 收藏按钮 loading 态
  const isFavoriteLoading = ref(false)

  // 学习记录上报与成就提示
  const { notifyUnlockedAchievements, recordLearningForCard } =
    useCategoryLearningRecorder(isLoggedIn)

  // 先放一个空实现，等音频控制器初始化后再替换为真实 stop 方法。
  let stopPlayingAudio = () => {}

  // 页面数据层：负责快照拉取、详情缓存、轮播切换等核心数据行为。
  const detailData = useCategoryDetailData({
    categoryId,
    startCardId,
    startIndex,
    onFallbackBack: fallbackBack,
    onCardReady: (cardId) => {
      void recordLearningForCard(cardId)
    },
    onBeforeSwiperChange: () => {
      stopPlayingAudio()
    },
  })

  // 从数据层解构页面所需状态与动作
  const {
    activeIndex, // 当前激活卡片索引
    canSwipe, // 是否允许轮播滑动
    currentCardId, // 当前卡片 ID
    currentDetail, // 当前卡片详情
    currentDisplayIndex, // UI 展示用的序号（从 1 开始）
    detailError, // 详情加载错误信息
    handleSwiperChange, // 轮播切换处理器
    isCurrentFavorited, // 当前卡片是否已收藏
    isDetailLoading, // 详情加载中状态
    isEmpty, // 分类下是否为空
    isSnapshotLoading, // 快照列表加载中状态
    loadSnapshotCards, // 拉取快照列表
    resolveCardImage, // 解析卡片展示图地址
    retryCurrentDetail, // 重试当前详情加载
    retrySnapshot, // 重试快照加载
    shouldRenderMedia, // 是否渲染某个轮播项媒体
    snapshotCards, // 快照卡片列表
    snapshotError, // 快照加载错误信息
    swiperCurrent, // swiper 组件 current 值
    syncCurrentFavorite, // 同步当前卡片收藏态到缓存
    total, // 当前快照总数
  } = detailData

  // 当前卡片的中英文发音地址
  const chineseAudioSrc = computed(() =>
    String(currentDetail.value?.audio || currentDetail.value?.sound || '').trim(),
  )
  const englishAudioSrc = computed(() => String(currentDetail.value?.audio_en || '').trim())

  const hasChineseAudio = computed(() => !!chineseAudioSrc.value)
  const hasEnglishAudio = computed(() => !!englishAudioSrc.value)

  // 音频控制层：只关心“能不能播”和“播哪个地址”
  const audioController = useDetailAudioController({
    canPlay: () => !isDetailLoading.value && !detailError.value,
    getSource: (type) => (type === 'cn' ? chineseAudioSrc.value : englishAudioSrc.value),
  })

  const {
    destroyPlayingAudio,
    playingAudioType,
    playChinesePronunciation,
    playEnglishPronunciation,
  } = audioController
  stopPlayingAudio = audioController.stopPlayingAudio

  /** 返回上一页 */
  function goBack() {
    fallbackBack()
  }

  /** 切换当前卡片收藏状态 */
  async function toggleCurrentFavorite() {
    if (isFavoriteLoading.value || isDetailLoading.value || detailError.value) {
      return
    }

    if (!ensureLoggedIn({ message: '登录后可收藏卡片' })) {
      return
    }

    const cardId = currentCardId.value
    if (!cardId) {
      showToast('当前卡片不可用')
      return
    }

    isFavoriteLoading.value = true
    try {
      const response = await cardApi.toggleFavorite(cardId)
      if (response.code !== 0 || !response.data) {
        throw new Error(response.msg || '收藏操作失败')
      }

      const nextFavorited = Boolean(response.data.isFavorited)
      await syncCurrentFavorite(nextFavorited)

      showToast(nextFavorited ? '已加入收藏' : '已取消收藏')
      notifyUnlockedAchievements(response.data.newAchievements, { delay: 280 })
    } catch (error) {
      showToast(getErrorMessage(error, '收藏操作失败'))
    } finally {
      isFavoriteLoading.value = false
    }
  }

  /** 页面加载：解析 query 并拉取快照 */
  onLoad((query) => {
    const resolvedQuery = (query || {}) as DetailQuery

    const resolvedCategoryId = decodeQueryValue(resolvedQuery.categoryId)
    if (!resolvedCategoryId) {
      showToast('缺少分类ID')
      setTimeout(() => {
        fallbackBack()
      }, 280)
      return
    }

    categoryId.value = resolvedCategoryId

    const resolvedCategoryName = decodeQueryValue(resolvedQuery.categoryName)
    if (resolvedCategoryName) {
      categoryName.value = resolvedCategoryName
    }

    startCardId.value = decodeQueryValue(resolvedQuery.cardId)
    startIndex.value = parseStartIndex(resolvedQuery.startIndex)

    void loadSnapshotCards()
  })

  /** 页面卸载：销毁音频实例，避免后台继续播放和旧监听残留 */
  onUnload(() => {
    destroyPlayingAudio()
  })

  // 仅向模板暴露展示和交互必须的数据/方法
  return {
    activeIndex,
    canSwipe,
    categoryName,
    currentDisplayIndex,
    detailError,
    goBack,
    hasChineseAudio,
    hasEnglishAudio,
    handleSwiperChange,
    isDetailLoading,
    isEmpty,
    isCurrentFavorited,
    isFavoriteLoading,
    isSnapshotLoading,
    playChinesePronunciation,
    playEnglishPronunciation,
    playingAudioType,
    retryCurrentDetail,
    retrySnapshot,
    snapshotCards,
    snapshotError,
    statusBarHeight,
    toggleCurrentFavorite,
    resolveCardImage,
    shouldRenderMedia,
    swiperCurrent,
    total,
  }
}
