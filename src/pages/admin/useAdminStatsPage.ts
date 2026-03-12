import { ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import {
  adminApi,
  type AdminStatsPointStat,
  type AdminStatsResult,
} from '@/api'
import { showToast } from '@/utils'

interface StatsData {
  userCount: number
  cardCount: number
  categoryCount: number
  todayNewUsers: number
  todayActiveUsers: number
  todayPointsStats: AdminStatsPointStat[]
}

function normalizeStats(data?: AdminStatsResult): StatsData {
  return {
    userCount: data?.userCount || 0,
    cardCount: data?.cardCount || 0,
    categoryCount: data?.categoryCount || 0,
    todayNewUsers: data?.todayNewUsers || 0,
    todayActiveUsers: data?.todayActiveUsers || 0,
    todayPointsStats: data?.todayPointsStats || [],
  }
}

export function useAdminStatsPage() {
  const loading = ref(false)
  const stats = ref<StatsData>(normalizeStats())

  async function loadStats() {
    if (loading.value) {
      return
    }

    loading.value = true

    try {
      const res = await adminApi.getStats()

      if (res.code === 0) {
        stats.value = normalizeStats(res.data)
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
      showToast('获取数据失败')
    } finally {
      loading.value = false
    }
  }

  function formatNumber(num: number): string {
    return (num || 0).toLocaleString()
  }

  function getPointTypeName(type: string): string {
    const map: Record<string, string> = {
      sign_in: '每日签到',
      ad: '广告激励',
      ad_reward: '广告激励',
      invite: '邀请好友',
      gift: '系统赠送',
      consume: '积分消费',
      refund: '积分退款',
      admin_add: '管理员发放',
      admin_deduct: '管理员扣除',
    }

    return map[type] || '其他'
  }

  function getPointTypeIcon(type: string): string {
    const map: Record<string, string> = {
      sign_in: '📅',
      ad: '🎬',
      ad_reward: '🎬',
      invite: '🤝',
      gift: '🎁',
      consume: '🛍️',
      refund: '↩️',
      admin_add: '👨‍💼',
      admin_deduct: '📉',
    }

    return map[type] || '💰'
  }

  function getPointTypeColor(type: string): string {
    if (['consume', 'admin_deduct'].includes(type)) {
      return 'red'
    }

    if (['ad', 'ad_reward', 'invite'].includes(type)) {
      return 'purple'
    }

    if (['sign_in', 'gift', 'refund'].includes(type)) {
      return 'orange'
    }

    return 'blue'
  }

  function isNegative(type: string): boolean {
    return ['consume', 'admin_deduct'].includes(type)
  }

  onShow(() => {
    void loadStats()
  })

  onPullDownRefresh(async () => {
    await loadStats()
    uni.stopPullDownRefresh()
  })

  return {
    formatNumber,
    getPointTypeColor,
    getPointTypeIcon,
    getPointTypeName,
    isNegative,
    loading,
    stats,
  }
}
