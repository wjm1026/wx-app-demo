import { computed, ref, type Ref } from 'vue'
import { cardApi, type CardLite } from '@/api'
import { getErrorMessage, showToast } from '@/utils'
import { createCardDetailCache } from './category-detail.cache'
import {
  fetchCategorySnapshotCards,
  getSnapshotByCircularIndex,
  normalizeCircularIndex,
  resolveInitialSnapshotIndex,
  shouldRenderCircularMedia,
} from './category-detail.snapshot'

const DETAIL_CACHE_LIMIT = 20

interface DetailDataOptions {
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

  /** 拉取单卡详情 */
  async function fetchCardDetail(cardId: string) {
    const response = await cardApi.getCardDetail(cardId)
    if (response.code !== 0 || !response.data) {
      throw new Error(response.msg || '加载图片详情失败')
    }

    setCachedDetail(cardId, response.data)
    return response.data
  }

  /** 确保索引对应卡片详情已加载 */
  async function ensureDetailByIndex(
    index: number,
    optionsForEnsure: { active?: boolean; silent?: boolean; fallbackOnError?: boolean } = {},
  ) {
    const target = getSnapshotByIndex(index)
    if (!target?._id) {
      return null
    }

    const cached = getCachedDetail(target._id)
    if (cached) {
      if (optionsForEnsure.active) {
        detailError.value = ''
      }
      return cached
    }

    const requestId = optionsForEnsure.active ? ++currentDetailRequestId : currentDetailRequestId

    if (optionsForEnsure.active) {
      isDetailLoading.value = true
      detailError.value = ''
    }

    try {
      return await fetchCardDetail(target._id)
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

  /** 预取相邻卡片详情 */
  function prefetchNeighborDetails() {
    if (total.value <= 1) {
      return
    }

    const leftIndex = normalizeIndex(activeIndex.value - 1)
    const rightIndex = normalizeIndex(activeIndex.value + 1)
    const targets = leftIndex === rightIndex ? [leftIndex] : [leftIndex, rightIndex]

    targets.forEach((index) => {
      void ensureDetailByIndex(index, { silent: true })
    })
  }

  /** 计算起始索引 */
  function resolveInitialIndex(list: CardLite[]) {
    return resolveInitialSnapshotIndex(list, options.startCardId.value, options.startIndex.value)
  }

  /** 拉取分类快照 */
  async function loadSnapshotCards() {
    if (!options.categoryId.value) {
      snapshotError.value = '缺少分类ID'
      return false
    }

    isSnapshotLoading.value = true
    snapshotError.value = ''
    detailError.value = ''

    try {
      const dedupedList = await fetchCategorySnapshotCards(options.categoryId.value)
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
        fallbackOnError: true,
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
    const result = await ensureDetailByIndex(activeIndex.value, { active: true })
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

    const normalized = normalizeIndex(Math.trunc(nextCurrent))
    if (normalized === activeIndex.value) {
      return
    }

    // 切换前先清理副作用（例如音频播放）
    options.onBeforeSwiperChange?.()
    activeIndex.value = normalized
    swiperCurrent.value = normalized

    const result = await ensureDetailByIndex(activeIndex.value, { active: true })
    if (result) {
      prefetchNeighborDetails()
      notifyCurrentCardReady()
    }
  }

  /** 更新当前卡片收藏态并同步缓存 */
  async function syncCurrentFavorite(nextFavorited: boolean) {
    const cardId = currentCardId.value
    if (!cardId) {
      return
    }

    const cached = getCachedDetail(cardId) || (await ensureDetailByIndex(activeIndex.value, { silent: true }))
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
    return detail?.image || card.image_thumb || card.image || ''
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
    syncCurrentFavorite,
    total,
  }
}
