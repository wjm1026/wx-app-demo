import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { adminApi, cardApi, type AdminStatsResult } from '@/api'
import { usePageLayout } from '@/composables/usePageLayout'
import { navigateTo, showToast } from '@/utils'

interface AdminStats {
  userCount: number
  cardCount: number
  categoryCount: number
  todayNewUsers: number
  todayActiveUsers: number
}

function normalizeStats(data?: AdminStatsResult): AdminStats {
  return {
    userCount: data?.userCount || 0,
    cardCount: data?.cardCount || 0,
    categoryCount: data?.categoryCount || 0,
    todayNewUsers: data?.todayNewUsers || 0,
    todayActiveUsers: data?.todayActiveUsers || 0,
  }
}

export function useAdminPage() {
  const { statusBarHeight } = usePageLayout()
  const isAdmin = ref(false)
  const checkingAdmin = ref(true)
  const stats = ref<AdminStats>(normalizeStats())

  const kpiCards = computed(() => [
    {
      key: 'users',
      value: stats.value.userCount,
      label: '用户总数',
      icon: '/static/icons/line/users.svg',
      onClick: goUsers,
    },
    {
      key: 'cards',
      value: stats.value.cardCount,
      label: '卡片总数',
      icon: '/static/icons/line/ticket.svg',
      onClick: goCards,
    },
    {
      key: 'categories',
      value: stats.value.categoryCount,
      label: '分类数量',
      icon: '/static/icons/line/bar-chart.svg',
      onClick: goStats,
    },
  ])

  const todayCards = computed(() => [
    {
      key: 'new',
      value: stats.value.todayNewUsers,
      label: '今日新增用户',
      icon: '/static/icons/line/users.svg',
      tone: 'new',
    },
    {
      key: 'active',
      value: stats.value.todayActiveUsers,
      label: '今日活跃用户',
      icon: '/static/icons/line/bar-chart.svg',
      tone: 'active',
    },
  ])

  const menuCards = [
    {
      key: 'users',
      title: '用户管理',
      desc: '查看用户状态与行为',
      icon: '/static/icons/line/users.svg',
      tone: 'tone-blue',
      onClick: goUsers,
    },
    {
      key: 'stats',
      title: '数据统计',
      desc: '关键指标与运营趋势',
      icon: '/static/icons/line/bar-chart.svg',
      tone: 'tone-indigo',
      onClick: goStats,
    },
    {
      key: 'categories',
      title: '分类管理',
      desc: '维护内容分类结构',
      icon: '/static/icons/line/info.svg',
      tone: 'tone-orange',
      onClick: goCategories,
    },
    {
      key: 'cards',
      title: '卡片管理',
      desc: '内容库录入与审核',
      icon: '/static/icons/line/ticket.svg',
      tone: 'tone-teal',
      onClick: goCards,
    },
  ]

  async function loadStats() {
    try {
      const res = await adminApi.getStats()

      if (res.code === 0) {
        stats.value = normalizeStats(res.data)
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  async function checkAdmin() {
    checkingAdmin.value = true

    try {
      const res = await adminApi.checkAdmin()

      if (res.code === 0 && res.data?.isAdmin) {
        isAdmin.value = true
        await loadStats()
        return
      }

      isAdmin.value = false
    } catch {
      isAdmin.value = false
      showToast('权限验证失败')
    } finally {
      checkingAdmin.value = false
    }
  }

  function onKpiCardClick(action?: (() => void) | null) {
    action?.()
  }

  function formatNumber(value: number) {
    return (value || 0).toLocaleString()
  }

  async function initData() {
    uni.showModal({
      title: '确认初始化',
      content: '将清除现有分类和卡片数据，重新创建测试数据，确定继续吗？',
      success: async (res) => {
        if (!res.confirm) {
          return
        }

        showToast('初始化中...', 'loading')

        try {
          const result = await cardApi.initData()
          uni.hideToast()
          showToast(result.msg || '初始化完成', 'success')
          void loadStats()
        } catch {
          uni.hideToast()
          showToast('初始化失败')
        }
      },
    })
  }

  async function repairCardImages() {
    uni.showModal({
      title: '确认修复图片',
      content: '将把数据库中的占位图 URL 批量回填为真实图片地址，确定继续吗？',
      success: async (res) => {
        if (!res.confirm) {
          return
        }

        showToast('修复中...', 'loading')

        try {
          const result = await cardApi.repairCardImages()
          uni.hideToast()
          showToast(result.msg || '图片修复完成', 'success')
          void loadStats()
        } catch {
          uni.hideToast()
          showToast('图片修复失败')
        }
      },
    })
  }

  function goUsers() {
    navigateTo('/pages/admin/users')
  }

  function goStats() {
    navigateTo('/pages/admin/stats')
  }

  function goCategories() {
    showToast('分类管理开发中')
  }

  function goCards() {
    showToast('卡片管理开发中')
  }

  function goBack() {
    uni.navigateBack()
  }

  onShow(() => {
    if (!isAdmin.value) {
      void checkAdmin()
      return
    }

    void loadStats()
  })

  return {
    checkingAdmin,
    formatNumber,
    goBack,
    initData,
    isAdmin,
    kpiCards,
    menuCards,
    onKpiCardClick,
    repairCardImages,
    statusBarHeight,
    todayCards,
  }
}
