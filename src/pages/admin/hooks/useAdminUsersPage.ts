import { computed, ref } from 'vue'
import {
  onPullDownRefresh,
  onReachBottom,
  onShow,
} from '@dcloudio/uni-app'
import { adminApi, type AdminUserListItem } from '@/api'
import { usePagedList } from '@/composables/usePagedList'
import { usePageLayout } from '@/composables/usePageLayout'
import {
  DEFAULT_AVATAR,
  formatDate,
  formatNumber,
  navigateBack,
  navigateTo,
  showToast,
} from '@/utils'

interface UserListQuery {
  keyword: string
  status?: number
}

const TAB_OPTIONS = [
  { value: 0, label: '全部', note: '完整用户池' },
  { value: 1, label: '正常', note: '可正常访问' },
  { value: 2, label: '封禁', note: '受限账号' },
] as const

export function useAdminUsersPage() {
  const { statusBarHeight } = usePageLayout()
  const keyword = ref('')
  const currentTab = ref(0)

  const {
    list: userList,
    loading,
    hasMore,
    total,
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

  const normalizedKeyword = computed(() => keyword.value.trim())
  const activeTab = computed(
    () => TAB_OPTIONS.find((item) => item.value === currentTab.value) ?? TAB_OPTIONS[0],
  )
  const resultCountLabel = computed(() => formatNumber(total.value || userList.value.length))
  const hasFilters = computed(
    () => currentTab.value !== 0 || Boolean(normalizedKeyword.value),
  )
  const resultSummary = computed(() => {
    const scope = activeTab.value.label === '全部' ? '用户池' : `${activeTab.value.label}用户`
    return `当前 ${scope} ${resultCountLabel.value} 位`
  })
  const resultHint = computed(() => {
    if (loading.value) {
      return '正在同步最新列表'
    }

    if (normalizedKeyword.value) {
      return `关键词：${formatKeywordLabel(normalizedKeyword.value)}`
    }

    return activeTab.value.note
  })
  const emptyTitle = computed(() =>
    hasFilters.value ? '没有符合条件的用户' : '暂时没有用户数据',
  )
  const emptyDescription = computed(() => {
    if (normalizedKeyword.value) {
      return `换个关键词试试，当前检索为“${formatKeywordLabel(normalizedKeyword.value)}”。`
    }

    if (currentTab.value === 2) {
      return '当前没有被封禁的账号，说明这批用户状态都还正常。'
    }

    if (currentTab.value === 1) {
      return '当前没有可展示的正常用户，请稍后再刷新一次。'
    }

    return '等第一批用户进入系统后，这里会自动出现完整列表。'
  })

  function buildQuery(): UserListQuery {
    return {
      keyword: normalizedKeyword.value,
      status: currentTab.value === 0 ? undefined : currentTab.value,
    }
  }

  async function refreshList() {
    return refresh(buildQuery(), { replaceQuery: true })
  }

  function goBack() {
    navigateBack()
  }

  function switchTab(tab: number) {
    if (currentTab.value === tab) {
      return
    }

    currentTab.value = tab
    void refreshList()
  }

  function onSearch() {
    void refreshList()
  }

  function clearSearch() {
    keyword.value = ''
    void refreshList()
  }

  function resetFilters() {
    keyword.value = ''
    currentTab.value = 0
    void refreshList()
  }

  function goDetail(id: string) {
    navigateTo(`/pages/admin/user-detail?id=${id}`)
  }

  function formatUserDate(value: string | number | undefined) {
    return formatDate(value, 'ymdHm') || '-'
  }

  function formatMetric(value: number | undefined) {
    return formatNumber(Number(value || 0))
  }

  function formatKeywordLabel(value: string) {
    if (value.length <= 10) {
      return value
    }

    return `${value.slice(0, 10)}…`
  }

  onShow(() => {
    void refreshList()
  })

  onPullDownRefresh(async () => {
    await refreshList()
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
    defaultAvatar: DEFAULT_AVATAR,
    emptyDescription,
    emptyTitle,
    formatDate: formatUserDate,
    formatMetric,
    goDetail,
    goBack,
    hasMore,
    hasFilters,
    keyword,
    loading,
    onSearch,
    resetFilters,
    resultHint,
    resultSummary,
    statusBarHeight,
    switchTab,
    tabOptions: TAB_OPTIONS,
    userList,
  }
}
