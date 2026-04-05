import { computed, ref } from 'vue'
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import { cardApi, type Card, type FavoritesPageResult } from '@/api'
import { useConfirmedAction } from '@/composables/useConfirmedAction'
import { useLoginGuard } from '@/composables/useLoginGuard'
import { usePageLayout } from '@/composables/usePageLayout'
import { usePagedList } from '@/composables/usePagedList'
import {
  formatDate,
  formatRelativeDate,
  navigateBack,
  navigateTo,
  showToast,
  switchTab,
} from '@/utils'

const FAVORITE_TONES = ['tone-coral', 'tone-mint', 'tone-violet', 'tone-sky'] as const

/** 获取分类标签 */
function getCategoryLabel(item: Card, categoryNameMap: Record<string, string>) {
  const categoryId = String(item.category?._id || item.category_id || '').trim()
  return item.category?.name || categoryNameMap[categoryId] || '待整理'
}

/** 封装收藏列表页面逻辑 */
export function useFavoritesPage() {
  const { statusBarHeight } = usePageLayout()
  const { runConfirmedAction } = useConfirmedAction()
  const { ensureLoggedIn } = useLoginGuard()
  const categoryNameMap = ref<Record<string, string>>({})
  const {
    list: favorites,
    loading: isLoading,
    currentPage,
    hasMore,
    pageData,
    refresh,
    loadMore,
    total,
  } = usePagedList<Card, Record<string, never>, FavoritesPageResult>({
    pageSize: 20,
    fetcher: ({ page, pageSize }) => cardApi.getFavorites({ page, pageSize }),
    onError: (message) => showToast(message || '获取收藏失败'),
  })
  const favoriteSummary = computed(() => pageData.value?.summary)
  const favoriteCount = computed(() =>
    Math.max(
      0,
      Number(favoriteSummary.value?.favoriteCount ?? total.value ?? favorites.value.length),
    ),
  )
  const decoratedFavorites = computed(() =>
    favorites.value.map((item, index) => ({
      ...item,
      categoryLabel: getCategoryLabel(item, categoryNameMap.value),
      detailLabel: item.name_en || item.name_pinyin || '点击继续学习',
      savedAtLabel: item.favorited_at ? formatDate(item.favorited_at, 'mdHm') : '',
      savedRelativeLabel: item.favorited_at
        ? formatRelativeDate(item.favorited_at) || '刚刚收藏'
        : '已收藏',
      tone: FAVORITE_TONES[index % FAVORITE_TONES.length],
      statsLabel:
        typeof item.favorite_count === 'number' && item.favorite_count > 0
          ? `${item.favorite_count} 人收藏`
          : '我的珍藏',
    })),
  )
  const summaryCards = computed(() => {
    const latestLabel = favoriteSummary.value?.latestFavoritedAt
      ? formatRelativeDate(favoriteSummary.value.latestFavoritedAt) || '刚刚收藏'
      : '暂无更新'

    return [
      {
        key: 'count',
        label: '收藏总数',
        value: String(favoriteCount.value),
        tone: 'stat-coral',
      },
      {
        key: 'category',
        label: '分类覆盖',
        value: String(Math.max(0, Number(favoriteSummary.value?.categoryCoverage || 0))),
        tone: 'stat-mint',
      },
      {
        key: 'latest',
        label: '最近收藏',
        value: latestLabel,
        tone: 'stat-violet',
      },
    ]
  })
  const sectionHint = computed(() => {
    if (isLoading.value && favorites.value.length === 0) {
      return '正在同步你的收藏夹'
    }

    if (favoriteCount.value > 0) {
      return `按收藏时间排序，共 ${favoriteCount.value} 张卡片`
    }

    return '把喜欢的卡片留在这里，方便反复学习'
  })

  /** 拉取分类名映射 */
  async function loadCategoryNameMap() {
    try {
      const response = await cardApi.getCategories()
      if (response.code !== 0 || !Array.isArray(response.data)) {
        return false
      }

      categoryNameMap.value = Object.fromEntries(
        response.data.map((item) => [String(item._id || ''), item.name || '']),
      )
      return true
    } catch {
      return false
    }
  }

  /** 同步收藏页主数据 */
  async function refreshFavoritesPage() {
    await Promise.all([
      refresh(),
      loadCategoryNameMap(),
    ])
  }

  /** 跳转到首页 */
  function goHome() {
    switchTab('/pages/index/index')
  }

  /** 返回上一页 */
  function goBack() {
    navigateBack()
  }

  /** 打开收藏详情 */
  function openFavoriteDetail(item: Card, index: number) {
    const cardId = String(item?._id || '').trim()
    if (!cardId) {
      return
    }

    const resolvedIndex = Number.isFinite(index) ? Math.max(0, Math.trunc(index)) : 0
    navigateTo(
      `/pages/category/detail?source=favorites&cardId=${encodeURIComponent(cardId)}` +
      `&startIndex=${resolvedIndex}`,
    )
  }

  /** 移除收藏 */
  async function removeFavorite(item: Card) {
    await runConfirmedAction({
      title: '移出收藏',
      content: `确定把“${item.name}”移出收藏夹吗？`,
      loadingText: '正在移除...',
      errorText: '移除失败',
      execute: async () => {
        const apiRes = await cardApi.toggleFavorite(item._id)

        if (apiRes.code !== 0) {
          throw new Error(apiRes.msg || '操作失败')
        }

        return apiRes
      },
      successText: '已移出收藏',
      onSuccess: async () => {
        if (favorites.value.length === 1 && currentPage.value > 1) {
          await refreshFavoritesPage()
          return
        }

        favorites.value = favorites.value.filter((favorite) => favorite._id !== item._id)
        await refreshFavoritesPage()
      },
    })
  }

  onShow(() => {
    if (!ensureLoggedIn()) {
      return
    }

    void refreshFavoritesPage()
  })

  onPullDownRefresh(async () => {
    if (!ensureLoggedIn()) {
      uni.stopPullDownRefresh()
      return
    }

    await refreshFavoritesPage()
    uni.stopPullDownRefresh()
  })

  onReachBottom(() => {
    if (hasMore.value && !isLoading.value) {
      void loadMore()
    }
  })

  return {
    decoratedFavorites,
    favoriteCount,
    goBack,
    favorites,
    goHome,
    isLoading,
    openFavoriteDetail,
    removeFavorite,
    sectionHint,
    statusBarHeight,
    summaryCards,
  }
}
