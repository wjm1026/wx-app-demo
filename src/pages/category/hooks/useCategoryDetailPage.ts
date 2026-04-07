import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { cardApi } from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'
import { usePageLayout } from '@/composables/usePageLayout'
import { getErrorMessage, normalizeInviteCode, showToast } from '@/utils'
import { useDetailAudioController } from './category-detail.audio'
import { useCategoryDetailData } from './category-detail.data'
import { useCategoryLearningRecorder } from './category-detail.learning'
import {
  decodeQueryValue,
  fallbackBack,
  parseStartIndex,
  type DetailQuery,
  type DetailSource,
} from './category-detail.query'

const SWIPE_GUIDE_STORAGE_KEY = 'CATEGORY_DETAIL_SWIPE_GUIDE_SHOWN_V1'
const AUTO_PLAY_STORAGE_KEY = 'CATEGORY_DETAIL_AUTO_PLAY_ENABLED_V1'
const AUTO_PLAY_GUIDE_STORAGE_KEY = 'CATEGORY_DETAIL_AUTO_PLAY_GUIDE_SHOWN_V1'
const AUTO_PLAY_LANGUAGE_GAP_MS = 180
const AUTO_PLAY_NEXT_GAP_MS = 220
const AUTO_PLAY_PAUSED_TOAST = '已暂停自动播放'

/**
 * 分类详情页主编排 Hook：
 * 只负责把“数据层 / 音频层 / 学习记录层 / 页面生命周期”串起来
 */
export function useCategoryDetailPage() {
  const { statusBarHeight } = usePageLayout()
  const { ensureLoggedIn, isLoggedIn, store } = useLoginGuard()

  // 路由入参状态
  const source = ref<DetailSource>('category')
  const categoryId = ref('')
  const categoryName = ref('图片详情')
  const startCardId = ref('')
  const startIndex = ref(0)
  // 收藏按钮 loading 态
  const isFavoriteLoading = ref(false)
  // 新用户首次进入时显示的左右滑动引导
  const showSwipeGuide = ref(false)
  // 首次进入时显示“自动播放胶囊”提示
  const showAutoPlayGuide = ref(false)
  // 自动播放状态
  const isAutoPlayEnabled = ref(false)
  const isAutoRunning = ref(false)
  const isAutoAdvancing = ref(false)
  let autoPlayTimer: ReturnType<typeof setTimeout> | null = null
  let autoPlayDelayResolver: ((shouldContinue: boolean) => void) | null = null
  let autoPlayTaskId = 0

  // 学习记录上报与成就提示
  const { notifyUnlockedAchievements, recordLearningForCard } =
    useCategoryLearningRecorder(isLoggedIn)

  // 先放一个空实现，等音频控制器初始化后再替换为真实 stop 方法。
  let stopPlayingAudio = () => { }

  // 页面数据层：负责快照拉取、详情缓存、轮播切换等核心数据行为。
  const detailData = useCategoryDetailData({
    source,
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
    goToNextCard, // 自动播放程序化切换下一张
    handleSwiperChange: handleSwiperChangeInternal, // 轮播切换处理器
    isCurrentFavorited, // 当前卡片是否已收藏
    isDetailLoading, // 详情加载中状态
    isEmpty, // 分类下是否为空
    isSnapshotLoading, // 快照列表加载中状态
    loadSnapshotCards, // 拉取快照列表
    resolveCardImage, // 解析卡片展示图地址
    retryCurrentDetail: retryCurrentDetailInternal, // 重试当前详情加载
    retrySnapshot: retrySnapshotInternal, // 重试快照加载
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
  const isFavoritesSource = computed(() => source.value === 'favorites')
  const currentCollectionLabel = computed(() => (isFavoritesSource.value ? '收藏列表' : '当前分类'))

  // 音频控制层：只关心“能不能播”和“播哪个地址”
  const audioController = useDetailAudioController({
    canPlay: () => !isDetailLoading.value && !detailError.value,
    getSource: (type) => (type === 'cn' ? chineseAudioSrc.value : englishAudioSrc.value),
  })

  const {
    destroyPlayingAudio,
    playingAudioType,
    playChinesePronunciation: playChinesePronunciationInternal,
    playEnglishPronunciation: playEnglishPronunciationInternal,
    playPronunciationOnce,
  } = audioController
  stopPlayingAudio = audioController.stopPlayingAudio

  /** 是否已记住自动播放开启 */
  function hasAutoPlayEnabled() {
    return String(uni.getStorageSync(AUTO_PLAY_STORAGE_KEY) || '') === '1'
  }

  /** 是否已经展示过自动播放提示 */
  function hasShownAutoPlayGuide() {
    return String(uni.getStorageSync(AUTO_PLAY_GUIDE_STORAGE_KEY) || '') === '1'
  }

  /** 写入自动播放偏好 */
  function persistAutoPlayEnabled(enabled: boolean) {
    uni.setStorageSync(AUTO_PLAY_STORAGE_KEY, enabled ? '1' : '0')
  }

  /** 标记自动播放提示已展示 */
  function markAutoPlayGuideShown() {
    uni.setStorageSync(AUTO_PLAY_GUIDE_STORAGE_KEY, '1')
  }

  /** 关闭自动播放提示 */
  function dismissAutoPlayGuide(optionsForDismiss: { remember?: boolean } = {}) {
    showAutoPlayGuide.value = false

    if (optionsForDismiss.remember) {
      markAutoPlayGuideShown()
    }
  }

  /** 首次进入详情页时展示“自动播放胶囊”提示 */
  function maybeShowAutoPlayGuide() {
    if (total.value <= 0 || hasShownAutoPlayGuide()) {
      return
    }

    showAutoPlayGuide.value = true
  }

  /** 清理自动播放延时器 */
  function clearAutoPlayTimer() {
    if (autoPlayTimer) {
      clearTimeout(autoPlayTimer)
      autoPlayTimer = null
    }

    if (autoPlayDelayResolver) {
      autoPlayDelayResolver(false)
      autoPlayDelayResolver = null
    }
  }

  /** 等待自动播放节奏延时，可被 stop 动作打断 */
  function waitForAutoPlayDelay(delay: number, taskId: number) {
    if (delay <= 0) {
      return Promise.resolve(isAutoPlayEnabled.value && autoPlayTaskId === taskId)
    }

    clearAutoPlayTimer()

    return new Promise<boolean>((resolve) => {
      autoPlayDelayResolver = resolve
      autoPlayTimer = setTimeout(() => {
        autoPlayTimer = null
        autoPlayDelayResolver = null
        resolve(isAutoPlayEnabled.value && autoPlayTaskId === taskId)
      }, delay)
    })
  }

  /** 清理自动播放运行态，不改持久化偏好 */
  function cleanupAutoPlayRuntime() {
    autoPlayTaskId += 1
    isAutoRunning.value = false
    isAutoAdvancing.value = false
    clearAutoPlayTimer()
    stopPlayingAudio()
  }

  /** 关闭自动播放（可选提示与持久化） */
  function stopAutoPlay(optionsForStop: { showToast?: boolean; persist?: boolean; message?: string } = {}) {
    const hadAutoPlay = isAutoPlayEnabled.value || isAutoRunning.value
    isAutoPlayEnabled.value = false

    if (optionsForStop.persist !== false) {
      persistAutoPlayEnabled(false)
    }

    cleanupAutoPlayRuntime()

    if (!hadAutoPlay) {
      return
    }

    if (optionsForStop.message) {
      showToast(optionsForStop.message)
      return
    }

    if (optionsForStop.showToast) {
      showToast(AUTO_PLAY_PAUSED_TOAST)
    }
  }

  /** 自动播放单卡循环：中文 -> 英文 -> 下一张 */
  async function runCurrentCardCycle(taskId: number) {
    if (!isAutoPlayEnabled.value || autoPlayTaskId !== taskId) {
      return false
    }

    if (detailError.value || isDetailLoading.value) {
      stopAutoPlay({ message: '当前卡片不可用，已暂停自动播放' })
      return false
    }

    const playOrder: Array<'cn' | 'en'> = ['cn', 'en']
    for (let index = 0; index < playOrder.length; index += 1) {
      const result = await playPronunciationOnce(playOrder[index], {
        silentWhenMissing: true,
        suppressErrorToast: true,
      })

      if (!isAutoPlayEnabled.value || autoPlayTaskId !== taskId) {
        return false
      }

      if (result === 'failed') {
        stopAutoPlay({ message: '音频播放失败，已暂停自动播放' })
        return false
      }

      if (result === 'played-stopped') {
        return false
      }

      const isNotLastLanguage = index < playOrder.length - 1
      if (isNotLastLanguage && result === 'played-ended') {
        const canContinue = await waitForAutoPlayDelay(AUTO_PLAY_LANGUAGE_GAP_MS, taskId)
        if (!canContinue) {
          return false
        }
      }
    }

    const canAdvance = await waitForAutoPlayDelay(AUTO_PLAY_NEXT_GAP_MS, taskId)
    if (!canAdvance) {
      return false
    }

    if (total.value <= 1) {
      stopAutoPlay({ message: `${currentCollectionLabel.value}卡片不足 2 张，已暂停自动播放` })
      return false
    }

    isAutoAdvancing.value = true
    try {
      const moved = await goToNextCard()
      if (!moved) {
        stopAutoPlay({ message: '切换下一张失败，已暂停自动播放' })
        return false
      }
    } finally {
      isAutoAdvancing.value = false
    }

    return true
  }

  /** 启动自动播放循环（从当前卡片开始） */
  async function startAutoPlayFromCurrent() {
    if (!isAutoPlayEnabled.value || isAutoRunning.value) {
      return
    }

    if (
      total.value <= 0 ||
      isSnapshotLoading.value ||
      !!snapshotError.value ||
      isDetailLoading.value ||
      !!detailError.value
    ) {
      return
    }

    const taskId = ++autoPlayTaskId
    isAutoRunning.value = true

    try {
      while (isAutoPlayEnabled.value && autoPlayTaskId === taskId) {
        const shouldContinue = await runCurrentCardCycle(taskId)
        if (!shouldContinue) {
          break
        }
      }
    } finally {
      if (autoPlayTaskId === taskId) {
        isAutoRunning.value = false
        clearAutoPlayTimer()
      }
    }
  }

  /** 满足条件时触发自动播放 */
  function triggerAutoPlayIfNeeded() {
    if (!isAutoPlayEnabled.value || isAutoRunning.value) {
      return
    }

    void startAutoPlayFromCurrent()
  }

  /** 右上胶囊开关：切换自动播放 */
  function toggleAutoPlay() {
    dismissAutoPlayGuide({ remember: true })

    if (isAutoPlayEnabled.value) {
      stopAutoPlay()
      return
    }

    isAutoPlayEnabled.value = true
    persistAutoPlayEnabled(true)
    triggerAutoPlayIfNeeded()
  }

  /** 手动操作前打断自动播放 */
  function interruptAutoPlayForManualAction() {
    if (!isAutoPlayEnabled.value && !isAutoRunning.value) {
      return
    }

    stopAutoPlay({ showToast: true })
  }

  /** 手动播放中文：先打断自动播放 */
  function playChinesePronunciation() {
    interruptAutoPlayForManualAction()
    playChinesePronunciationInternal()
  }

  /** 手动播放英文：先打断自动播放 */
  function playEnglishPronunciation() {
    interruptAutoPlayForManualAction()
    playEnglishPronunciationInternal()
  }

  /** 重试快照后，若开关开启则继续自动播放 */
  async function retrySnapshot() {
    await retrySnapshotInternal()
    triggerAutoPlayIfNeeded()
  }

  /** 重试当前详情后，若开关开启则继续自动播放 */
  async function retryCurrentDetail() {
    await retryCurrentDetailInternal()
    triggerAutoPlayIfNeeded()
  }

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

    const hasChanged = activeIndex.value !== previousIndex

    if (hasChanged && !isAutoAdvancing.value && (isAutoPlayEnabled.value || isAutoRunning.value)) {
      stopAutoPlay({ showToast: true })
    }

    if (showSwipeGuide.value && hasChanged) {
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
    const shareCategoryId = String(
      currentDetail.value?.category?._id
      || currentDetail.value?.category_id
      || snapshotCards.value[activeIndex.value]?.category_id
      || categoryId.value
      || '',
    ).trim()
    const shareCategoryName = String(
      currentDetail.value?.category?.name || (isFavoritesSource.value ? '' : categoryName.value || ''),
    ).trim()

    if (shareCategoryId) {
      queryItems.push(`categoryId=${encodeURIComponent(shareCategoryId)}`)
    }

    if (shareCategoryName) {
      queryItems.push(`categoryName=${encodeURIComponent(shareCategoryName)}`)
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

  /** 构建详情页分享给朋友参数 */
  function buildShareAppMessagePayload() {
    const inviteCode = ownInviteCode.value
    const payload = {
      title: buildDetailShareTitle(inviteCode),
      path: buildDetailSharePath(inviteCode),
    }
    return payload
  }

  /** 构建详情页分享到朋友圈参数 */
  function buildShareTimelinePayload() {
    const inviteCode = ownInviteCode.value
    const payload = {
      title: buildDetailShareTitle(inviteCode),
      query: buildDetailShareQuery(inviteCode),
    }
    return payload
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
    const resolvedSource = decodeQueryValue(resolvedQuery.source)
    source.value = resolvedSource === 'favorites' ? 'favorites' : 'category'

    if (source.value === 'favorites') {
      categoryName.value = '我的收藏'

      if (!ensureLoggedIn({ message: '登录后可查看收藏' })) {
        return
      }
    }

    const resolvedCategoryId = decodeQueryValue(resolvedQuery.categoryId)
    if (source.value === 'category' && !resolvedCategoryId) {
      showToast('缺少分类ID')
      setTimeout(() => {
        fallbackBack()
      }, 280)
      return
    }

    categoryId.value = resolvedCategoryId

    const resolvedCategoryName = decodeQueryValue(resolvedQuery.categoryName)
    if (source.value === 'category' && resolvedCategoryName) {
      categoryName.value = resolvedCategoryName
    }

    startCardId.value = decodeQueryValue(resolvedQuery.cardId)
    startIndex.value = parseStartIndex(resolvedQuery.startIndex)
    isAutoPlayEnabled.value = hasAutoPlayEnabled()

    void (async () => {
      const loaded = await loadSnapshotCards()
      if (loaded) {
        maybeShowSwipeGuide()
        maybeShowAutoPlayGuide()
        triggerAutoPlayIfNeeded()
      }
    })()
  })

  /** 页面卸载：销毁音频实例，避免后台继续播放和旧监听残留 */
  onUnload(() => {
    dismissSwipeGuide()
    dismissAutoPlayGuide()
    isAutoPlayEnabled.value = false
    cleanupAutoPlayRuntime()
    destroyPlayingAudio()
  })

  // 仅向模板暴露展示和交互必须的数据/方法
  return {
    activeIndex,
    buildShareAppMessagePayload,
    buildShareTimelinePayload,
    canSwipe,
    categoryName,
    currentDisplayIndex,
    detailError,
    goBack,
    hasChineseAudio,
    hasEnglishAudio,
    handleSwiperChange,
    isAutoPlayEnabled,
    isAutoRunning,
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
    showAutoPlayGuide,
    showSwipeGuide,
    statusBarHeight,
    toggleAutoPlay,
    toggleCurrentFavorite,
    resolveCardImage,
    shouldRenderMedia,
    swiperCurrent,
    total,
  }
}
