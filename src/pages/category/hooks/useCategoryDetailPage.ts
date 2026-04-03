import { computed, ref } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline, onUnload } from '@dcloudio/uni-app'
import { cardApi } from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'
import { usePageLayout } from '@/composables/usePageLayout'
import { getErrorMessage, normalizeInviteCode, showToast } from '@/utils'
import { useDetailAudioController } from './category-detail.audio'
import { useCategoryDetailData } from './category-detail.data'
import { useCategoryLearningRecorder } from './category-detail.learning'
import { decodeQueryValue, fallbackBack, parseStartIndex, type DetailQuery } from './category-detail.query'

const SWIPE_GUIDE_STORAGE_KEY = 'CATEGORY_DETAIL_SWIPE_GUIDE_SHOWN_V1'

/**
 * 分类详情页主编排 Hook：
 * 只负责把“数据层 / 音频层 / 学习记录层 / 页面生命周期”串起来
 */
export function useCategoryDetailPage() {
  const { statusBarHeight } = usePageLayout()
  const { ensureLoggedIn, isLoggedIn, store } = useLoginGuard()

  // 路由入参状态
  const categoryId = ref('')
  const categoryName = ref('图片详情')
  const startCardId = ref('')
  const startIndex = ref(0)
  // 收藏按钮 loading 态
  const isFavoriteLoading = ref(false)
  // 新用户首次进入时显示的左右滑动引导
  const showSwipeGuide = ref(false)

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
    handleSwiperChange: handleSwiperChangeInternal, // 轮播切换处理器
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
  const ownInviteCode = computed(() => normalizeInviteCode(store.userInfo?.invite_code))

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

  /** 关闭左右滑动引导 */
  function dismissSwipeGuide() {
    if (!showSwipeGuide.value) {
      return
    }

    showSwipeGuide.value = false
  }

  /** 判断是否已经展示过左右滑动引导 */
  function hasShownSwipeGuide() {
    return String(uni.getStorageSync(SWIPE_GUIDE_STORAGE_KEY) || '') === '1'
  }

  /** 标记左右滑动引导已展示 */
  function markSwipeGuideShown() {
    uni.setStorageSync(SWIPE_GUIDE_STORAGE_KEY, '1')
  }

  /** 首次进入详情页时尝试展示左右滑动引导 */
  function maybeShowSwipeGuide() {
    if (!canSwipe.value || hasShownSwipeGuide()) {
      return
    }

    showSwipeGuide.value = true
  }

  /** 轮播切换：用户真正滑动后再关闭引导并记忆 */
  async function handleSwiperChange(event: { detail?: { current?: number } }) {
    const previousIndex = activeIndex.value

    await handleSwiperChangeInternal(event)

    if (showSwipeGuide.value && activeIndex.value !== previousIndex) {
      dismissSwipeGuide()
      markSwipeGuideShown()
    }
  }

  /** 返回上一页 */
  function goBack() {
    fallbackBack()
  }

  /** 构建详情页分享 query，保留当前卡片上下文并附带邀请码 */
  function buildDetailShareQuery(inviteCode?: string) {
    const queryItems: string[] = []

    if (categoryId.value) {
      queryItems.push(`categoryId=${encodeURIComponent(categoryId.value)}`)
    }

    if (categoryName.value) {
      queryItems.push(`categoryName=${encodeURIComponent(categoryName.value)}`)
    }

    const resolvedCardId = currentCardId.value || startCardId.value
    if (resolvedCardId) {
      queryItems.push(`cardId=${encodeURIComponent(resolvedCardId)}`)
    }

    queryItems.push(`startIndex=${Math.max(0, activeIndex.value)}`)

    const normalizedInviteCode = normalizeInviteCode(inviteCode)
    if (normalizedInviteCode) {
      queryItems.push(`inviteCode=${encodeURIComponent(normalizedInviteCode)}`)
    }

    return queryItems.join('&')
  }

  /** 构建详情页分享 path */
  function buildDetailSharePath(inviteCode?: string) {
    const query = buildDetailShareQuery(inviteCode)
    return query ? `/pages/category/detail?${query}` : '/pages/category/detail'
  }

  /** 构建详情页分享标题 */
  function buildDetailShareTitle(inviteCode?: string) {
    const cardName = String(currentDetail.value?.name || '').trim()
    const normalizedInviteCode = normalizeInviteCode(inviteCode)

    if (cardName && normalizedInviteCode) {
      return `我在学「${cardName}」，输入邀请码 ${normalizedInviteCode} 一起学习`
    }

    if (cardName) {
      return `我在学「${cardName}」，一起来看看`
    }

    if (normalizedInviteCode) {
      return `输入邀请码 ${normalizedInviteCode}，一起加入学习计划`
    }

    return '来宝宝识物，一起学认知'
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

    void (async () => {
      const loaded = await loadSnapshotCards()
      if (loaded) {
        maybeShowSwipeGuide()
      }
    })()
  })

  onShareAppMessage(() => {
    const inviteCode = ownInviteCode.value
    return {
      title: buildDetailShareTitle(inviteCode),
      path: buildDetailSharePath(inviteCode),
    }
  })

  onShareTimeline(() => {
    const inviteCode = ownInviteCode.value
    return {
      title: buildDetailShareTitle(inviteCode),
      query: buildDetailShareQuery(inviteCode),
    }
  })

  /** 页面卸载：销毁音频实例，避免后台继续播放和旧监听残留 */
  onUnload(() => {
    dismissSwipeGuide()
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
    showSwipeGuide,
    statusBarHeight,
    toggleCurrentFavorite,
    resolveCardImage,
    shouldRenderMedia,
    swiperCurrent,
    total,
  }
}
