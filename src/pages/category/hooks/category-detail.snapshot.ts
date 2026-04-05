import { cardApi, type Card, type CardLite } from '@/api'

// 单页快照容量。详情页会在进入时一次性分页拉全量快照，便于轮播顺滑切换。
const SNAPSHOT_PAGE_SIZE = 100
// 最多抓取页数上限，避免异常数据导致无限请求。
const SNAPSHOT_MAX_PAGES = 20
// 只渲染当前卡片周边半径内的媒体，减少大图渲染压力。
export const MEDIA_RENDER_RADIUS = 3

/** 规范化环形索引 */
export function normalizeCircularIndex(index: number, count: number) {
  if (count <= 0) {
    return 0
  }

  return ((index % count) + count) % count
}

/** 计算环形索引距离 */
export function getCircularDistance(left: number, right: number, count: number) {
  if (count <= 0) {
    return 0
  }

  const normalizedLeft = normalizeCircularIndex(left, count)
  const normalizedRight = normalizeCircularIndex(right, count)
  const diff = Math.abs(normalizedLeft - normalizedRight)
  return Math.min(diff, count - diff)
}

/** 获取环形索引对应快照 */
export function getSnapshotByCircularIndex(list: CardLite[], index: number): CardLite | null {
  if (!Array.isArray(list) || list.length <= 0) {
    return null
  }

  return list[normalizeCircularIndex(index, list.length)] || null
}

/** 判断索引是否在媒体渲染窗口内 */
export function shouldRenderCircularMedia(
  index: number,
  activeIndex: number,
  total: number,
  radius = MEDIA_RENDER_RADIUS,
) {
  if (total <= 0) {
    return false
  }

  if (total <= radius * 2 + 1) {
    return true
  }

  return getCircularDistance(index, activeIndex, total) <= radius
}

/** 计算快照起始索引 */
export function resolveInitialSnapshotIndex(
  list: CardLite[],
  startCardId: string,
  startIndex: number,
) {
  const locatedIndex = list.findIndex((item) => item._id === startCardId)
  if (locatedIndex >= 0) {
    return locatedIndex
  }

  if (list.length <= 0) {
    return 0
  }

  return normalizeCircularIndex(startIndex, list.length)
}

/** 将收藏卡片映射为详情页快照 */
function mapFavoriteCardToSnapshot(item: Card): CardLite {
  return {
    _id: item._id,
    category_id: item.category_id,
    name: item.name,
    image: item.image,
    update_time: item.update_time,
  }
}

/** 拉取分类快照列表（分页拼接 + 去重） */
export async function fetchCategorySnapshotCards(categoryId: string) {
  if (!categoryId) {
    return [] as CardLite[]
  }

  const mergedList: CardLite[] = []
  let page = 1
  let expectedTotal = 0

  while (page <= SNAPSHOT_MAX_PAGES) {
    const response = await cardApi.getCardsByCategoryLite({
      categoryId,
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

  return Array.from(
    new Map(mergedList.map((item) => [item._id, item])).values(),
  )
}

/** 拉取收藏快照列表（分页拼接 + 去重） */
export async function fetchFavoriteSnapshotCards() {
  const mergedList: CardLite[] = []
  let page = 1
  let expectedTotal = 0

  while (page <= SNAPSHOT_MAX_PAGES) {
    const response = await cardApi.getFavorites({
      page,
      pageSize: SNAPSHOT_PAGE_SIZE,
    })

    if (response.code !== 0 || !response.data) {
      throw new Error(response.msg || '加载收藏列表失败')
    }

    const rows = Array.isArray(response.data.list) ? response.data.list : []
    if (page === 1) {
      expectedTotal = Math.max(0, Number(response.data.total || response.data.summary?.favoriteCount || 0))
    }

    mergedList.push(...rows.map(mapFavoriteCardToSnapshot))

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

  return Array.from(
    new Map(mergedList.map((item) => [item._id, item])).values(),
  )
}
