import { computed, ref } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { cardApi, type Card } from '@/api'
import { usePageLayout } from '@/composables/usePageLayout'
import { usePagedList } from '@/composables/usePagedList'
import { navigateBack, showToast, switchTab } from '@/utils'

interface CategoryCardsQuery {
  categoryId: string
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

/** 兜底返回上一页 */
function fallbackBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    navigateBack()
    return
  }

  switchTab('/pages/index/index')
}

/** 封装分类图片列表页面逻辑 */
export function useCategoryCardsPage() {
  const { statusBarHeight } = usePageLayout()
  const categoryId = ref('')
  const categoryName = ref('分类图片')
  const isInvalidQuery = ref(false)

  const {
    list: cards,
    loading: isLoading,
    hasMore,
    refresh,
    loadMore,
  } = usePagedList<Card, CategoryCardsQuery>({
    pageSize: 20,
    initialQuery: {
      categoryId: '',
    },
    fetcher: ({ categoryId: queryCategoryId, page, pageSize }) =>
      cardApi.getCardsByCategory({
        categoryId: queryCategoryId,
        page,
        pageSize,
      }),
    onError: (message) => showToast(message || '加载图片失败'),
  })

  const isInitialLoading = computed(() => isLoading.value && cards.value.length === 0)

  const isEmpty = computed(
    () => !isLoading.value && cards.value.length === 0 && !isInvalidQuery.value,
  )

  /** 返回上一页 */
  function goBack() {
    fallbackBack()
  }

  /** 加载第一页 */
  async function loadFirstPage() {
    if (!categoryId.value) {
      return false
    }

    return refresh(
      {
        categoryId: categoryId.value,
      },
      { replaceQuery: true },
    )
  }

  onLoad((query) => {
    const resolvedCategoryId = decodeQueryValue(query?.categoryId)

    if (!resolvedCategoryId) {
      isInvalidQuery.value = true
      showToast('缺少分类ID')
      setTimeout(() => {
        fallbackBack()
      }, 280)
      return
    }

    categoryId.value = resolvedCategoryId
    const resolvedCategoryName = decodeQueryValue(query?.categoryName)
    if (resolvedCategoryName) {
      categoryName.value = resolvedCategoryName
    }

    void loadFirstPage()
  })

  onPullDownRefresh(async () => {
    if (!categoryId.value) {
      uni.stopPullDownRefresh()
      return
    }

    await loadFirstPage()
    uni.stopPullDownRefresh()
  })

  onReachBottom(() => {
    if (!categoryId.value || isLoading.value || !hasMore.value) {
      return
    }

    void loadMore()
  })

  return {
    cards,
    categoryName,
    goBack,
    hasMore,
    isEmpty,
    isInitialLoading,
    isLoading,
    statusBarHeight,
  }
}
