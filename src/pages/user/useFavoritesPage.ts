import { computed } from 'vue'
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import { cardApi, type Card } from '@/api'
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

function getCategoryLabel(item: Card) {
  return item.category?.name || '待整理'
}

export function useFavoritesPage() {
  const { statusBarHeight } = usePageLayout()
  const { runConfirmedAction } = useConfirmedAction()
  const { ensureLoggedIn } = useLoginGuard()
  const {
    list: favorites,
    loading: isLoading,
    currentPage,
    hasMore,
    refresh,
    loadMore,
  } = usePagedList<Card>({
    pageSize: 20,
    fetcher: ({ page, pageSize }) => cardApi.getFavorites({ page, pageSize }),
    onError: (message) => showToast(message || '获取收藏失败'),
  })
  const decoratedFavorites = computed(() =>
    favorites.value.map((item, index) => ({
      ...item,
      categoryLabel: getCategoryLabel(item),
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
    const uniqueCategoryCount = new Set(
      favorites.value.map((item) => getCategoryLabel(item)),
    ).size
    const latestFavorite = favorites.value[0]
    const latestLabel = latestFavorite?.favorited_at
      ? formatRelativeDate(latestFavorite.favorited_at) || '刚刚收藏'
      : '暂无更新'

    return [
      {
        key: 'count',
        label: '收藏总数',
        value: String(favorites.value.length),
        tone: 'stat-coral',
      },
      {
        key: 'category',
        label: '分类覆盖',
        value: String(uniqueCategoryCount),
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

    if (favorites.value.length > 0) {
      return `按收藏时间排序，共 ${favorites.value.length} 张卡片`
    }

    return '把喜欢的卡片留在这里，方便反复学习'
  })

  function goHome() {
    switchTab('/pages/index/index')
  }

  function goCardDetail(id: string) {
    navigateTo(`/pages/card/detail?id=${id}`)
  }

  function goBack() {
    navigateBack()
  }

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
        favorites.value = favorites.value.filter((favorite) => favorite._id !== item._id)

        if (favorites.value.length === 0 && currentPage.value > 1) {
          await refresh()
        }
      },
    })
  }

  onShow(() => {
    if (!ensureLoggedIn()) {
      return
    }

    void refresh()
  })

  onPullDownRefresh(async () => {
    if (!ensureLoggedIn()) {
      uni.stopPullDownRefresh()
      return
    }

    await refresh()
    uni.stopPullDownRefresh()
  })

  onReachBottom(() => {
    if (hasMore.value && !isLoading.value) {
      void loadMore()
    }
  })

  return {
    decoratedFavorites,
    goBack,
    favorites,
    goCardDetail,
    goHome,
    isLoading,
    removeFavorite,
    sectionHint,
    statusBarHeight,
    summaryCards,
  }
}
