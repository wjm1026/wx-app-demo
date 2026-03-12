import {
  onPullDownRefresh,
  onReachBottom,
  onShow,
} from '@dcloudio/uni-app'
import { cardApi, type Card } from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'
import { usePagedList } from '@/composables/usePagedList'
import { getErrorMessage, navigateTo, showToast } from '@/utils'

export function useFavoritesPage() {
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

  function goHome() {
    uni.switchTab({ url: '/pages/index/index' })
  }

  function goCardDetail(id: string) {
    navigateTo(`/pages/card/detail?id=${id}`)
  }

  async function removeFavorite(item: Card) {
    uni.showModal({
      title: '提示',
      content: '确定要取消收藏吗？',
      success: async (res) => {
        if (!res.confirm) {
          return
        }

        try {
          const apiRes = await cardApi.toggleFavorite(item._id)

          if (apiRes.code === 0) {
            favorites.value = favorites.value.filter((favorite) => favorite._id !== item._id)
            showToast('已取消收藏')

            if (favorites.value.length === 0 && currentPage.value > 1) {
              void refresh()
            }

            return
          }

          showToast(apiRes.msg || '操作失败')
        } catch (error) {
          showToast(getErrorMessage(error, '操作失败'))
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
    favorites,
    goCardDetail,
    goHome,
    isLoading,
    removeFavorite,
  }
}
