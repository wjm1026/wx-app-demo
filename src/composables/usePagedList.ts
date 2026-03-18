import { ref, type Ref } from 'vue'
import type { ApiResponse, PagedResult } from '@/api'

type PageParams = {
  page: number
  pageSize: number
}

type PagedFetcher<T, Q extends object> = (
  params: Q & PageParams,
) => Promise<ApiResponse<PagedResult<T>>>

interface UsePagedListOptions<T, Q extends object> {
  fetcher: PagedFetcher<T, Q>
  pageSize?: number
  initialQuery?: Q
  onError?: (message: string) => void
}

interface RefreshOptions {
  replaceQuery?: boolean
}

/** 封装分页列表逻辑 */
export function usePagedList<T, Q extends object = Record<string, never>>(
  options: UsePagedListOptions<T, Q>,
) {
  const pageSize = options.pageSize ?? 20

  /** 规范化查询参数 */
  function normalizeQuery(value: Partial<Q> | Q) {
    return Object.fromEntries(
      Object.entries(value).filter(([, item]) => item !== undefined),
    ) as Q
  }

  const list = ref([]) as Ref<T[]>
  const loading = ref(false)
  const currentPage = ref(0)
  const total = ref(0)
  const hasMore = ref(true)
  const query = ref(
    normalizeQuery(options.initialQuery ? { ...options.initialQuery } : ({} as Q)),
  ) as Ref<Q>

  /** 更新查询参数 */
  function updateQuery(next: Partial<Q>) {
    query.value = normalizeQuery({
      ...query.value,
      ...next,
    } as Q)
  }

  /** 替换查询参数 */
  function replaceQuery(next: Q) {
    query.value = normalizeQuery(next)
  }

  /** 发起请求 */
  async function request(reset = false): Promise<boolean> {
    if (loading.value) {
      return false
    }

    if (!reset && !hasMore.value) {
      return false
    }

    const targetPage = reset ? 1 : currentPage.value + 1
    loading.value = true

    try {
      const response = await options.fetcher({
        ...query.value,
        page: targetPage,
        pageSize,
      } as Q & PageParams)

      if (response.code !== 0 || !response.data) {
        options.onError?.(response.msg || '加载失败')
        return false
      }

      const rows = Array.isArray(response.data.list) ? response.data.list : []
      list.value = targetPage === 1 ? [...rows] : [...list.value, ...rows]

      const totalCount = Number(response.data.total || 0)
      total.value = totalCount
      currentPage.value = targetPage

      hasMore.value =
        totalCount > 0 ? list.value.length < totalCount : rows.length >= pageSize

      return true
    } catch {
      options.onError?.('加载失败，请稍后重试')
      return false
    } finally {
      loading.value = false
    }
  }

  /** 刷新 */
  async function refresh(nextQuery?: Partial<Q> | Q, refreshOptions?: RefreshOptions) {
    if (nextQuery) {
      if (refreshOptions?.replaceQuery) {
        replaceQuery(nextQuery as Q)
      } else {
        updateQuery(nextQuery as Partial<Q>)
      }
    }

    currentPage.value = 0
    hasMore.value = true

    return request(true)
  }

  /** 加载更多 */
  function loadMore() {
    return request(false)
  }

  return {
    list,
    loading,
    currentPage,
    total,
    hasMore,
    query,
    updateQuery,
    replaceQuery,
    refresh,
    loadMore,
  }
}
