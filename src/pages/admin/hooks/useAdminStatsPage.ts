import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import {
  adminApi,
  type AdminStatsPointStat,
  type AdminStatsResult,
} from '@/api'
import { usePageLayout } from '@/composables/usePageLayout'
import { navigateBack, showToast } from '@/utils'

interface StatsData {
  userCount: number
  cardCount: number
  categoryCount: number
  todayNewUsers: number
  todayActiveUsers: number
  todayPointsStats: AdminStatsPointStat[]
}

const POINT_TYPE_META: Record<string, { label: string; icon: string; tone: string }> = {
  sign_in: {
    label: '每日签到',
    icon: '/static/icons/line/calendar.svg',
    tone: 'tone-amber',
  },
  ad: {
    label: '广告激励',
    icon: '/static/icons/line/video.svg',
    tone: 'tone-violet',
  },
  ad_reward: {
    label: '广告激励',
    icon: '/static/icons/line/video.svg',
    tone: 'tone-violet',
  },
  invite: {
    label: '邀请好友',
    icon: '/static/icons/line/share.svg',
    tone: 'tone-blue',
  },
  invite_bonus: {
    label: '邀请奖励',
    icon: '/static/icons/line/share.svg',
    tone: 'tone-blue',
  },
  gift: {
    label: '系统赠送',
    icon: '/static/icons/line/gift.svg',
    tone: 'tone-amber',
  },
  achievement: {
    label: '成就奖励',
    icon: '/static/icons/line/trophy.svg',
    tone: 'tone-violet',
  },
  consume: {
    label: '积分消费',
    icon: '/static/icons/line/coins.svg',
    tone: 'tone-red',
  },
  refund: {
    label: '积分退款',
    icon: '/static/icons/line/check-circle.svg',
    tone: 'tone-green',
  },
  admin_add: {
    label: '管理员发放',
    icon: '/static/icons/line/crown.svg',
    tone: 'tone-blue',
  },
  admin_deduct: {
    label: '管理员扣除',
    icon: '/static/icons/line/shield.svg',
    tone: 'tone-red',
  },
}

/** 规范化统计数据 */
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

/** 将输入内容转换为百分比 */
function toPercent(part: number, total: number) {
  if (!total) {
    return 0
  }

  return Math.round((part / total) * 100)
}

/** 格式化数值 */
function formatNumber(num: number): string {
  return (num || 0).toLocaleString()
}

/** 格式化带符号数值 */
function formatSignedNumber(num: number): string {
  const absolute = formatNumber(Math.abs(num))

  if (num > 0) {
    return `+${absolute}`
  }

  if (num < 0) {
    return `-${absolute}`
  }

  return absolute
}

/** 获取积分类型元数据 */
function getPointTypeMeta(type: string) {
  return POINT_TYPE_META[type] || {
    label: '其他变动',
    icon: '/static/icons/line/coins.svg',
    tone: 'tone-slate',
  }
}

/** 封装后台统计数据页面逻辑 */
export function useAdminStatsPage() {
  const { statusBarHeight } = usePageLayout()
  const loading = ref(false)
  const stats = ref<StatsData>(normalizeStats())

  const activeRate = computed(() =>
    toPercent(stats.value.todayActiveUsers, stats.value.userCount),
  )
  const totalPointTransactions = computed(() =>
    stats.value.todayPointsStats.reduce((sum, item) => sum + Number(item.count || 0), 0),
  )
  const netPointChange = computed(() =>
    stats.value.todayPointsStats.reduce((sum, item) => sum + Number(item.total || 0), 0),
  )
  const dominantPointType = computed(() => {
    const sorted = [...stats.value.todayPointsStats].sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count
      }

      return Math.abs(b.total) - Math.abs(a.total)
    })

    return sorted[0] ? getPointTypeMeta(sorted[0]._id).label : '暂无积分流动'
  })

  const liveStatusLabel = computed(() => (loading.value ? '同步中' : '实时'))
  const heroTitle = computed(() => {
    if (!stats.value.userCount) {
      return '等待第一批运营数据接入'
    }

    return `今日活跃 ${formatNumber(stats.value.todayActiveUsers)} 位用户`
  })
  const heroSummary = computed(() => {
    if (!stats.value.userCount) {
      return '当前还没有可展示的用户与内容样本，拉到数据后这里会自动切成运营概览。'
    }

    return `总用户 ${formatNumber(stats.value.userCount)} 位，内容 ${formatNumber(stats.value.cardCount)} 张，分类 ${formatNumber(stats.value.categoryCount)} 个。`
  })
  const activityHint = computed(() => {
    if (!stats.value.userCount) {
      return '当前没有足够样本计算活跃分布。'
    }

    return `今日新增 ${formatNumber(stats.value.todayNewUsers)} 位，累计发生 ${formatNumber(totalPointTransactions.value)} 笔积分变动。`
  })
  const activityFillWidth = computed(() => `${Math.min(activeRate.value, 100)}%`)
  const netPointChangeLabel = computed(() => formatSignedNumber(netPointChange.value))
  const pointsHeadline = computed(() => {
    if (!totalPointTransactions.value) {
      return '今天还没有积分流动记录。'
    }

    return `共 ${formatNumber(totalPointTransactions.value)} 笔积分变动，主导来源为 ${dominantPointType.value}。`
  })

  const overviewCards = computed(() => [
    {
      key: 'users',
      label: '用户池',
      value: formatNumber(stats.value.userCount),
      meta: '累计用户',
      icon: '/static/icons/line/users.svg',
      tone: 'tone-blue',
    },
    {
      key: 'cards',
      label: '内容池',
      value: formatNumber(stats.value.cardCount),
      meta: '卡片总量',
      icon: '/static/icons/line/ticket.svg',
      tone: 'tone-violet',
    },
    {
      key: 'categories',
      label: '分类轴',
      value: formatNumber(stats.value.categoryCount),
      meta: '结构节点',
      icon: '/static/icons/line/bar-chart.svg',
      tone: 'tone-amber',
    },
  ])

  const dailyCards = computed(() => [
    {
      key: 'new-users',
      label: '今日新增',
      value: formatNumber(stats.value.todayNewUsers),
      unit: '位',
      desc: '今天进入系统的新用户数量',
      note: '新增',
      icon: '/static/icons/line/crown.svg',
      tone: 'tone-emerald',
    },
    {
      key: 'active-users',
      label: '今日活跃',
      value: formatNumber(stats.value.todayActiveUsers),
      unit: '位',
      desc: '今天登录过系统的用户数量',
      note: '活跃',
      icon: '/static/icons/line/heart.svg',
      tone: 'tone-blue',
    },
  ])

  const pointItems = computed(() =>
    [...stats.value.todayPointsStats]
      .map((item) => {
        const meta = getPointTypeMeta(item._id)
        const isNegative = Number(item.total || 0) < 0

        return {
          key: item._id,
          label: meta.label,
          countLabel: `${formatNumber(item.count || 0)} 笔变动`,
          amountLabel: formatSignedNumber(Number(item.total || 0)),
          flowLabel: isNegative ? '流出' : '流入',
          icon: meta.icon,
          tone: meta.tone,
          isNegative,
          total: Number(item.total || 0),
          count: Number(item.count || 0),
        }
      })
      .sort((a, b) => {
        if (Math.abs(b.total) !== Math.abs(a.total)) {
          return Math.abs(b.total) - Math.abs(a.total)
        }

        return b.count - a.count
      }),
  )

  /** 加载统计数据 */
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

  /** 返回上一页 */
  function goBack() {
    navigateBack()
  }

  onShow(() => {
    void loadStats()
  })

  onPullDownRefresh(async () => {
    await loadStats()
    uni.stopPullDownRefresh()
  })

  return {
    activeRate,
    activityFillWidth,
    activityHint,
    dailyCards,
    goBack,
    heroSummary,
    heroTitle,
    liveStatusLabel,
    loading,
    netPointChange,
    netPointChangeLabel,
    overviewCards,
    pointItems,
    pointsHeadline,
    statusBarHeight,
  }
}
