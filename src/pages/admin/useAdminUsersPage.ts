import { ref } from 'vue'
import {
  onPullDownRefresh,
  onReachBottom,
  onShow,
} from '@dcloudio/uni-app'
import { adminApi, type AdminUserListItem } from '@/api'
import { usePagedList } from '@/composables/usePagedList'
import { formatDate, navigateTo, showToast } from '@/utils'

interface UserListQuery {
  keyword: string
  status?: number
}

export function useAdminUsersPage() {
  const keyword = ref('')
  const currentTab = ref(0)

  const {
    list: userList,
    loading,
    hasMore,
    refresh,
    loadMore,
  } = usePagedList<AdminUserListItem, UserListQuery>({
    pageSize: 10,
    initialQuery: {
      keyword: '',
    },
    fetcher: (params) => adminApi.getUserList(params),
    onError: (message) => showToast(message || '加载失败'),
  })

  function buildQuery(): UserListQuery {
    const query: UserListQuery = {
      keyword: keyword.value.trim(),
    }

    if (currentTab.value !== 0) {
      query.status = currentTab.value
    }

    return query
  }

  function switchTab(tab: number) {
    if (currentTab.value === tab) {
      return
    }

    currentTab.value = tab
    void refresh(buildQuery())
  }

  function onSearch() {
    void refresh(buildQuery())
  }

  function clearSearch() {
    keyword.value = ''
    void refresh(buildQuery())
  }

  function goDetail(id: string) {
    navigateTo(`/pages/admin/user-detail?id=${id}`)
  }

  function formatUserDate(value: string | number | undefined) {
    return formatDate(value, 'ymd') || '-'
  }

  onShow(() => {
    void refresh(buildQuery())
  })

  onPullDownRefresh(async () => {
    await refresh(buildQuery())
    uni.stopPullDownRefresh()
  })

  onReachBottom(() => {
    if (hasMore.value && !loading.value) {
      void loadMore()
    }
  })

  return {
    clearSearch,
    currentTab,
    formatDate: formatUserDate,
    goDetail,
    hasMore,
    keyword,
    loading,
    onSearch,
    switchTab,
    userList,
  }
}
