import { computed, ref, type Ref } from 'vue'
import { cardApi, type CardLite, type OpenCardResult } from '@/api'
import { updatePoints } from '@/store'
import { getErrorMessage, showToast } from '@/utils'
import { createCardDetailCache } from './category-detail.cache'
import {
  fetchFavoriteSnapshotCards,
  fetchCategorySnapshotCards,
  getSnapshotByCircularIndex,
  normalizeCircularIndex,
  resolveInitialSnapshotIndex,
  shouldRenderCircularMedia,
} from './category-detail.snapshot'
import type { DetailSource } from './category-detail.query'

const DETAIL_CACHE_LIMIT = 20
const PREFETCH_RADIUS = 1

interface PendingOpenEntry {
  promise: Promise<OpenCardResult>
  trackView: boolean
}

interface DetailDataOptions {
  /** 快照来源：分类 or 我的收藏 */
  source: Ref<DetailSource>
  /** 当前分类 ID（来自路由参数） */
  categoryId: Ref<string>
  /** 路由指定的起始卡片 ID */
  startCardId: Ref<string>
  /** 路由指定的起始索引（兜底） */
  startIndex: Ref<number>
  /** 当前卡片不可用时的兜底返回动作 */
  onFallbackBack: () => void
  /** 当前卡片详情可用后回调（用于上报学习记录等） */
  onCardReady?: (cardId: string) => void
  /** 轮播切换前回调（用于先停掉音频） */
  onBeforeSwiperChange?: () => void
}

/** 分类详情页数据层：快照、详情、缓存、轮播 */
export function useCategoryDetailData(options: DetailDataOptions) {
  // 快照列表和轮播索引状态
  const snapshotCards = ref<CardLite[]>([])
  const activeIndex = ref(0)
  const swiperCurrent = ref(0)

  // 列表与详情的加载/错误状态
  const isSnapshotLoading = ref(false)
  const snapshotError = ref('')
  const isDetailLoading = ref(false)
  const detailError = ref('')

  // 详情缓存（LRU）
  const { cacheVersion, getCachedDetail, peekCachedDetail, setCachedDetail } =
    createCardDetailCache(DETAIL_CACHE_LIMIT)
  const pendingOpenByCardId = new Map<string, PendingOpenEntry>()
  const prefetchedCardIds = new Set<string>()
  const activatedCardIds = new Set<string>()

  // 仅允许“最新一次 active 详情请求”回写 loading/error，避免请求乱序覆盖状态。
  let currentDetailRequestId = 0

  const total = computed(() => snapshotCards.value.length)
  const canSwipe = computed(() => total.value > 1)
  const isEmpty = computed(
    () => !isSnapshotLoading.value && !snapshotError.value && total.value === 0,
  )

  /** 规范化索引 */
  function normalizeIndex(index: number) {
    return normalizeCircularIndex(index, total.value)
  }

  /** 通过索引获取快照 */
  function getSnapshotByIndex(index: number): CardLite | null {
    return getSnapshotByCircularIndex(snapshotCards.value, index)
  }

  /** 判断某一项是否在渲染窗口内 */
  function shouldRenderMedia(index: number) {
    return shouldRenderCircularMedia(index, activeIndex.value, total.value)
  }

  const currentSnapshotCard = computed(() => getSnapshotByIndex(activeIndex.value))
  const currentCardId = computed(() => String(currentSnapshotCard.value?._id || ''))

  // 通过 cacheVersion 建立依赖，让缓存写入时 currentDetail 可被动更新。
  const currentDetail = computed(() => {
    cacheVersion.value
    const cardId = currentSnapshotCard.value?._id || ''
    if (!cardId) {
      return null
    }

    return peekCachedDetail(cardId)
  })

  const currentDisplayIndex = computed(() => (total.value > 0 ? activeIndex.value + 1 : 0))
  const isCurrentFavorited = computed(() => Boolean(currentDetail.value?.isFavorited))

  /** 通知外层：当前卡片已完成可用加载 */
  function notifyCurrentCardReady() {
    const cardId = currentCardId.value
    if (!cardId) {
      return
    }

    options.onCardReady?.(cardId)
  }

  /** 更新积分余额 */
  function syncBalance(balance?: number) {
    if (typeof balance === 'number' && Number.isFinite(balance)) {
      updatePoints(balance)
    }
  }

  /** 将已预解锁卡片提升为当前已激活状态，不再补发额外 open 请求 */
  function markCardActivated(cardId: string) {
    const normalizedCardId = String(cardId || '').trim()
    if (!normalizedCardId) {
      return
    }

    prefetchedCardIds.delete(normalizedCardId)
    activatedCardIds.add(normalizedCardId)
  }

  /** 清理因 LRU 淘汰导致失效的本地状态标记 */
  function resetCardTrackingState(cardId: string) {
    const normalizedCardId = String(cardId || '').trim()
    if (!normalizedCardId) {
      return
    }

    prefetchedCardIds.delete(normalizedCardId)
    activatedCardIds.delete(normalizedCardId)
  }

  /** 统一打开卡片（必要时解锁），并对同一卡请求去重 */
  async function requestOpenCard(cardId: string, trackView: boolean): Promise<OpenCardResult> {
    const normalizedCardId = String(cardId || '').trim()
    if (!normalizedCardId) {
      throw new Error('缺少卡片ID')
    }

    const pending = pendingOpenByCardId.get(normalizedCardId)
    if (pending) {
      try {
        const pendingResult = await pending.promise
        if (trackView && !pending.trackView && !activatedCardIds.has(normalizedCardId)) {
          markCardActivated(normalizedCardId)
        }
        return pendingResult
      } catch (error) {
        const currentPending = pendingOpenByCardId.get(normalizedCardId)
        if (currentPending?.promise === pending.promise) {
          pendingOpenByCardId.delete(normalizedCardId)
        }
        if (trackView && !pending.trackView) {
          return requestOpenCard(normalizedCardId, true)
        }
        throw error
      }
    }

    const promise = (async () => {
      const response = await cardApi.openCard(normalizedCardId, { track_view: trackView })
      if (response.code !== 0 || !response.data) {
        throw new Error(response.msg || '加载图片详情失败')
      }

      const detail = response.data
      setCachedDetail(normalizedCardId, detail)
      syncBalance(detail.balance)

      if (trackView) {
        markCardActivated(normalizedCardId)
      } else {
        prefetchedCardIds.add(normalizedCardId)
      }

      return detail
    })()

    pendingOpenByCardId.set(normalizedCardId, {
      promise,
      trackView,
    })

    try {
      return await promise
    } finally {
      const currentPending = pendingOpenByCardId.get(normalizedCardId)
      if (currentPending?.promise === promise) {
        pendingOpenByCardId.delete(normalizedCardId)
      }
    }
  }

  /** 确保索引对应卡片详情已加载 */
  async function ensureDetailByIndex(
    index: number,
    optionsForEnsure: {
      active?: boolean
      silent?: boolean
      fallbackOnError?: boolean
      trackView?: boolean
    } = {},
  ) {
    const target = getSnapshotByIndex(index)
    if (!target?._id) {
      return null
    }

    const cardId = String(target._id)
    const trackView = optionsForEnsure.trackView !== false
    const requestId = optionsForEnsure.active ? ++currentDetailRequestId : currentDetailRequestId

    if (optionsForEnsure.active) {
      isDetailLoading.value = true
      detailError.value = ''
    }

    try {
      const cached = getCachedDetail(cardId)
      const hasActivated = activatedCardIds.has(cardId)
      const hasPrefetched = prefetchedCardIds.has(cardId)
      if (cached && trackView && hasPrefetched && !hasActivated) {
        if (optionsForEnsure.active) {
          detailError.value = ''
        }
        markCardActivated(cardId)
        return cached
      }

      if (cached && ((trackView && hasActivated) || (!trackView && (hasActivated || hasPrefetched)))) {
        if (optionsForEnsure.active) {
          detailError.value = ''
        }
        return cached
      }

      const detail = await requestOpenCard(cardId, trackView)
      if (optionsForEnsure.active) {
        detailError.value = ''
      }
      return detail
    } catch (error) {
      const message = getErrorMessage(error, '加载图片详情失败')

      if (optionsForEnsure.active && requestId === currentDetailRequestId) {
        detailError.value = message
      }

      if (!optionsForEnsure.silent && !optionsForEnsure.fallbackOnError) {
        showToast(message)
      }

      if (optionsForEnsure.fallbackOnError) {
        showToast('当前图片不可用，正在返回列表')
        setTimeout(() => {
          options.onFallbackBack()
        }, 280)
      }

      return null
    } finally {
      if (optionsForEnsure.active && requestId === currentDetailRequestId) {
        isDetailLoading.value = false
      }
    }
  }

  /** 预解锁指定索引卡片 */
  function prefetchCardByIndex(index: number) {
    const target = getSnapshotByIndex(index)
    const cardId = String(target?._id || '')
    if (!cardId) {
      return
    }

    const cached = peekCachedDetail(cardId)
    if (!cached && (activatedCardIds.has(cardId) || prefetchedCardIds.has(cardId))) {
      resetCardTrackingState(cardId)
    }

    if (
      activatedCardIds.has(cardId) ||
      prefetchedCardIds.has(cardId) ||
      pendingOpenByCardId.has(cardId)
    ) {
      return
    }

    void ensureDetailByIndex(index, {
      silent: true,
      trackView: false,
    })
  }

  /** 预取当前卡片左右一张，形成半径 1 访问窗口 */
  function prefetchNeighborDetails() {
    if (total.value <= 1) {
      return
    }

    for (let offset = 1; offset <= PREFETCH_RADIUS; offset += 1) {
      prefetchCardByIndex(normalizeIndex(activeIndex.value - offset))
      prefetchCardByIndex(normalizeIndex(activeIndex.value + offset))
    }
  }

  /** 计算起始索引 */
  function resolveInitialIndex(list: CardLite[]) {
    return resolveInitialSnapshotIndex(list, options.startCardId.value, options.startIndex.value)
  }

  /** 拉取分类快照 */
  async function loadSnapshotCards() {
    if (options.source.value === 'category' && !options.categoryId.value) {
      snapshotError.value = '缺少分类ID'
      return false
    }

    isSnapshotLoading.value = true
    snapshotError.value = ''
    detailError.value = ''

    try {
      const dedupedList = options.source.value === 'favorites'
        ? await fetchFavoriteSnapshotCards()
        : await fetchCategorySnapshotCards(options.categoryId.value)
      snapshotCards.value = dedupedList

      if (dedupedList.length <= 0) {
        activeIndex.value = 0
        swiperCurrent.value = 0
        return true
      }

      activeIndex.value = resolveInitialIndex(dedupedList)
      swiperCurrent.value = activeIndex.value

      const currentDetailResult = await ensureDetailByIndex(activeIndex.value, {
        active: true,
        trackView: true,
      })

      if (currentDetailResult) {
        prefetchNeighborDetails()
        notifyCurrentCardReady()
      }

      return true
    } catch (error) {
      snapshotError.value = getErrorMessage(error, '加载图片列表失败')
      showToast(snapshotError.value)
      return false
    } finally {
      isSnapshotLoading.value = false
    }
  }

  /** 重新加载快照 */
  async function retrySnapshot() {
    await loadSnapshotCards()
  }

  /** 重新加载当前详情 */
  async function retryCurrentDetail() {
    const result = await ensureDetailByIndex(activeIndex.value, { active: true, trackView: true })
    if (result) {
      prefetchNeighborDetails()
      notifyCurrentCardReady()
    }
  }

  /** 处理轮播切换 */
  async function handleSwiperChange(event: { detail?: { current?: number } }) {
    const nextCurrent = Number(event?.detail?.current ?? 0)
    if (!Number.isFinite(nextCurrent) || total.value <= 0) {
      return
    }

    await activateIndex(Math.trunc(nextCurrent))
  }

  /** 激活指定索引并完成详情预热 */
  async function activateIndex(index: number) {
    const normalized = normalizeIndex(index)
    if (normalized === activeIndex.value) {
      return true
    }

    // 切换前先清理副作用（例如音频播放）
    options.onBeforeSwiperChange?.()
    activeIndex.value = normalized
    swiperCurrent.value = normalized

    const chargedResult = await ensureDetailByIndex(activeIndex.value, { active: true, trackView: true })
    if (!chargedResult) {
      return false
    }

    prefetchNeighborDetails()
    notifyCurrentCardReady()
    return true
  }

  /** 程序化切到下一张卡片（供自动播放调用） */
  async function goToNextCard() {
    if (total.value <= 1) {
      return false
    }

    const nextIndex = normalizeIndex(activeIndex.value + 1)
    if (nextIndex === activeIndex.value) {
      return false
    }

    return activateIndex(nextIndex)
  }

  /** 更新当前卡片收藏态并同步缓存 */
  async function syncCurrentFavorite(nextFavorited: boolean) {
    const cardId = currentCardId.value
    if (!cardId) {
      return
    }

    const cached = getCachedDetail(cardId) || (await ensureDetailByIndex(activeIndex.value, {
      silent: true,
      trackView: true,
    }))
    if (!cached) {
      return
    }

    const previousCount = Math.max(0, Number(cached.favorite_count || 0))
    const nextCount = nextFavorited
      ? previousCount + (cached.isFavorited ? 0 : 1)
      : Math.max(0, previousCount - (cached.isFavorited ? 1 : 0))

    // 只覆盖收藏相关字段，其它详情数据保持不变。
    setCachedDetail(cardId, {
      ...cached,
      isFavorited: nextFavorited,
      favorite_count: nextCount,
    })
  }

  /** 获取卡片展示图（优先详情高质量，其次缩略图） */
  function resolveCardImage(card: CardLite) {
    cacheVersion.value
    const cardId = String(card?._id || '')
    const detail = cardId ? peekCachedDetail(cardId) : null
    return detail?.image || card.image || ''
  }

  // 对外只暴露页面需要的状态和方法
  return {
    activeIndex,
    canSwipe,
    currentCardId,
    currentDetail,
    currentDisplayIndex,
    detailError,
    handleSwiperChange,
    isCurrentFavorited,
    isDetailLoading,
    isEmpty,
    isSnapshotLoading,
    loadSnapshotCards,
    resolveCardImage,
    retryCurrentDetail,
    retrySnapshot,
    shouldRenderMedia,
    snapshotCards,
    snapshotError,
    swiperCurrent,
    goToNextCard,
    syncCurrentFavorite,
    total,
  }
}
