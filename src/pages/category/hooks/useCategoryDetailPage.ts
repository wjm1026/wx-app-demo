import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { cardApi, type Card, type CardLite } from '@/api'
import { usePageLayout } from '@/composables/usePageLayout'
import { getErrorMessage, navigateBack, showToast, switchTab } from '@/utils'

const SNAPSHOT_PAGE_SIZE = 100
const SNAPSHOT_MAX_PAGES = 20
const DETAIL_CACHE_LIMIT = 20
const MEDIA_RENDER_RADIUS = 3

interface DetailQuery {
  categoryId?: string
  categoryName?: string
  cardId?: string
  startIndex?: string
}

/** 读取 query 值 */
function readQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return readQueryValue(value[0])
  }

  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

/** 解析并解码 query 值 */
function decodeQueryValue(value: unknown) {
  const rawValue = readQueryValue(value)
  if (!rawValue) {
    return ''
  }

  try {
    return decodeURIComponent(rawValue)
  } catch {
    return rawValue
  }
}

/** 解析起始索引 */
function parseStartIndex(value: unknown) {
  const rawValue = readQueryValue(value)
  if (!rawValue) {
    return 0
  }

  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.max(0, Math.floor(parsed))
}

/** 兜底返回上一页 */
function fallbackBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    navigateBack()
    return
  }

  switchTab('/pages/index/index')
}

/** 分类详情页逻辑 */
export function useCategoryDetailPage() {
  const { statusBarHeight } = usePageLayout()

  const categoryId = ref('')
  const categoryName = ref('图片详情')
  const startCardId = ref('')
  const startIndex = ref(0)

  const snapshotCards = ref<CardLite[]>([])
  const activeIndex = ref(0)
  const swiperCurrent = ref(0)

  const isSnapshotLoading = ref(false)
  const snapshotError = ref('')

  const isDetailLoading = ref(false)
  const detailError = ref('')

  const detailCache = new Map<string, Card>()
  const cacheOrder: string[] = []
  const cacheVersion = ref(0)

  let currentDetailRequestId = 0

  const total = computed(() => snapshotCards.value.length)
  const canSwipe = computed(() => total.value > 1)
  const isEmpty = computed(
    () => !isSnapshotLoading.value && !snapshotError.value && total.value === 0,
  )

  /** 返回上一页 */
  function goBack() {
    fallbackBack()
  }

  /** 规范化索引 */
  function normalizeIndex(index: number) {
    const count = total.value
    if (count <= 0) {
      return 0
    }

    return ((index % count) + count) % count
  }

  /** 计算环形索引距离 */
  function getCircularDistance(left: number, right: number) {
    const count = total.value
    if (count <= 0) {
      return 0
    }

    const normalizedLeft = normalizeIndex(left)
    const normalizedRight = normalizeIndex(right)
    const diff = Math.abs(normalizedLeft - normalizedRight)
    return Math.min(diff, count - diff)
  }

  /** 通过索引获取快照 */
  function getSnapshotByIndex(index: number): CardLite | null {
    if (total.value <= 0) {
      return null
    }

    return snapshotCards.value[normalizeIndex(index)] || null
  }

  /** 判断某一项是否在渲染窗口内 */
  function shouldRenderMedia(index: number) {
    if (total.value <= 0) {
      return false
    }

    if (total.value <= MEDIA_RENDER_RADIUS * 2 + 1) {
      return true
    }

    return getCircularDistance(index, activeIndex.value) <= MEDIA_RENDER_RADIUS
  }

  /** 读取缓存详情 */
  function getCachedDetail(cardId: string) {
    if (!cardId || !detailCache.has(cardId)) {
      return null
    }

    const keyIndex = cacheOrder.indexOf(cardId)
    if (keyIndex >= 0) {
      cacheOrder.splice(keyIndex, 1)
      cacheOrder.push(cardId)
    }

    return detailCache.get(cardId) || null
  }

  /** 写入缓存详情 */
  function setCachedDetail(cardId: string, detail: Card) {
    if (!cardId) {
      return
    }

    const existsIndex = cacheOrder.indexOf(cardId)
    if (existsIndex >= 0) {
      cacheOrder.splice(existsIndex, 1)
    }

    detailCache.set(cardId, detail)
    cacheOrder.push(cardId)

    while (cacheOrder.length > DETAIL_CACHE_LIMIT) {
      const firstKey = cacheOrder.shift()
      if (firstKey) {
        detailCache.delete(firstKey)
      }
    }

    cacheVersion.value += 1
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
    options: { active?: boolean; silent?: boolean; fallbackOnError?: boolean } = {},
  ) {
    const target = getSnapshotByIndex(index)
    if (!target?._id) {
      return null
    }

    const cached = getCachedDetail(target._id)
    if (cached) {
      if (options.active) {
        detailError.value = ''
      }
      return cached
    }

    const requestId = options.active ? ++currentDetailRequestId : currentDetailRequestId

    if (options.active) {
      isDetailLoading.value = true
      detailError.value = ''
    }

    try {
      return await fetchCardDetail(target._id)
    } catch (error) {
      const message = getErrorMessage(error, '加载图片详情失败')

      if (options.active && requestId === currentDetailRequestId) {
        detailError.value = message
      }

      if (!options.silent && !options.fallbackOnError) {
        showToast(message)
      }

      if (options.fallbackOnError) {
        showToast('当前图片不可用，正在返回列表')
        setTimeout(() => {
          fallbackBack()
        }, 280)
      }

      return null
    } finally {
      if (options.active && requestId === currentDetailRequestId) {
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
    const locatedIndex = list.findIndex((item) => item._id === startCardId.value)
    if (locatedIndex >= 0) {
      return locatedIndex
    }

    if (list.length <= 0) {
      return 0
    }

    return normalizeIndex(startIndex.value)
  }

  /** 拉取分类快照 */
  async function loadSnapshotCards() {
    if (!categoryId.value) {
      snapshotError.value = '缺少分类ID'
      return false
    }

    isSnapshotLoading.value = true
    snapshotError.value = ''
    detailError.value = ''

    try {
      const mergedList: CardLite[] = []
      let page = 1
      let expectedTotal = 0

      while (page <= SNAPSHOT_MAX_PAGES) {
        const response = await cardApi.getCardsByCategoryLite({
          categoryId: categoryId.value,
          page,
          pageSize: SNAPSHOT_PAGE_SIZE,
        })

        if (response.code !== 0 || !response.data) {
          throw new Error(response.msg || '加载图片列表失败')
        }

        const rows = Array.isArray(response.data.list) ? response.data.list : []
        if (page === 1) {
          expectedTotal = Math.max(0, Number(response.data.total || 0))
        }

        mergedList.push(...rows)

        if (rows.length <= 0) {
          break
        }

        if (expectedTotal > 0 && mergedList.length >= expectedTotal) {
          break
        }

        if (rows.length < SNAPSHOT_PAGE_SIZE) {
          break
        }

        page += 1
      }

      const dedupedList = Array.from(
        new Map(mergedList.map((item) => [item._id, item])).values(),
      )

      snapshotCards.value = dedupedList

      if (dedupedList.length <= 0) {
        activeIndex.value = 0
        swiperCurrent.value = 0
        return true
      }

      activeIndex.value = resolveInitialIndex(dedupedList)
      swiperCurrent.value = activeIndex.value

      const currentDetail = await ensureDetailByIndex(activeIndex.value, {
        active: true,
        fallbackOnError: true,
      })

      if (currentDetail) {
        prefetchNeighborDetails()
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

    activeIndex.value = normalized
    swiperCurrent.value = normalized

    const result = await ensureDetailByIndex(activeIndex.value, { active: true })
    if (result) {
      prefetchNeighborDetails()
    }
  }

  const currentSnapshotCard = computed(() => getSnapshotByIndex(activeIndex.value))

  const currentDetail = computed(() => {
    cacheVersion.value
    const currentCardId = currentSnapshotCard.value?._id || ''
    if (!currentCardId) {
      return null
    }

    return detailCache.get(currentCardId) || null
  })

  const currentName = computed(
    () => currentDetail.value?.name || currentSnapshotCard.value?.name || '',
  )

  const currentDescription = computed(() => currentDetail.value?.description || '')

  const currentDisplayIndex = computed(() => (total.value > 0 ? activeIndex.value + 1 : 0))

  /** 获取卡片展示图（优先详情高质量，其次缩略图） */
  function resolveCardImage(card: CardLite) {
    cacheVersion.value
    const cardId = String(card?._id || '')
    const detail = cardId ? detailCache.get(cardId) : null
    return detail?.image || card.image_thumb || card.image || ''
  }

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

  return {
    activeIndex,
    canSwipe,
    categoryName,
    currentDescription,
    currentDisplayIndex,
    currentName,
    detailError,
    goBack,
    handleSwiperChange,
    isDetailLoading,
    isEmpty,
    isSnapshotLoading,
    retryCurrentDetail,
    retrySnapshot,
    snapshotCards,
    snapshotError,
    statusBarHeight,
    resolveCardImage,
    shouldRenderMedia,
    swiperCurrent,
    total,
  }
}
