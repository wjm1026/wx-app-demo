import { computed, onMounted } from 'vue'
import {
  onPullDownRefresh,
  onReachBottom,
  onShow,
} from '@dcloudio/uni-app'
import { userApi, type PointsLogItem } from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'
import { usePagedList } from '@/composables/usePagedList'
import { formatDate, showToast } from '@/utils'

export function usePointsLogPage() {
  const { store, ensureLoggedIn } = useLoginGuard()
  const {
    list: logs,
    loading,
    hasMore,
    refresh,
    loadMore,
  } = usePagedList<PointsLogItem>({
    pageSize: 20,
    fetcher: ({ page, pageSize }) => userApi.getPointsLog({ page, pageSize }),
    onError: (message) => showToast(message || '获取记录失败'),
  })

  const finished = computed(() => !hasMore.value)

  async function refreshUserPoints() {
    if (!store.userInfo) {
      return
    }

    const res = await userApi.getUserInfo()

    if (res.code === 0 && res.data) {
      store.setUserInfo(res.data)
    }
  }

  function formatLogDate(value: number | string) {
    return formatDate(value, 'mdHm')
  }

  onMounted(() => {
    if (!ensureLoggedIn()) {
      return
    }

    void refresh()
  })

  onShow(() => {
    if (!ensureLoggedIn()) {
      return
    }

    void refreshUserPoints()
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
    if (!finished.value && !loading.value) {
      void loadMore()
    }
  })

  return {
    finished,
    formatDate: formatLogDate,
    loading,
    logs,
    store,
  }
}
