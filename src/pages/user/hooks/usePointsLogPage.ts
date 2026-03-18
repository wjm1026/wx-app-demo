import { computed } from 'vue'
import {
  onPullDownRefresh,
  onReachBottom,
  onShow,
} from '@dcloudio/uni-app'
import { userApi, type PointsLogItem } from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'
import { usePageLayout } from '@/composables/usePageLayout'
import { usePagedList } from '@/composables/usePagedList'
import { formatDate, formatRelativeDate, navigateBack, showToast } from '@/utils'

interface LogVisualMeta {
  icon: string
  chipLabel: string
  chipTone: string
  iconTone: string
}

const LOG_VISUAL_MAP: Record<string, LogVisualMeta> = {
  ad_reward: {
    icon: '/static/icons/line/video.svg',
    chipLabel: '广告奖励',
    chipTone: 'chip-sky',
    iconTone: 'icon-sky',
  },
  achievement: {
    icon: '/static/icons/line/trophy.svg',
    chipLabel: '成就奖励',
    chipTone: 'chip-amber',
    iconTone: 'icon-amber',
  },
  consume: {
    icon: '/static/icons/line/ticket.svg',
    chipLabel: '积分消费',
    chipTone: 'chip-amber',
    iconTone: 'icon-amber',
  },
  gift: {
    icon: '/static/icons/line/gift.svg',
    chipLabel: '新手奖励',
    chipTone: 'chip-pink',
    iconTone: 'icon-pink',
  },
  invite: {
    icon: '/static/icons/line/users.svg',
    chipLabel: '邀请奖励',
    chipTone: 'chip-violet',
    iconTone: 'icon-violet',
  },
  sign_in: {
    icon: '/static/icons/line/calendar.svg',
    chipLabel: '每日签到',
    chipTone: 'chip-mint',
    iconTone: 'icon-mint',
  },
}

function getLogVisualMeta(item: PointsLogItem): LogVisualMeta {
  return (
    LOG_VISUAL_MAP[item.type] || {
      icon: '/static/icons/line/coins.svg',
      chipLabel: item.amount > 0 ? '积分收入' : '积分支出',
      chipTone: item.amount > 0 ? 'chip-mint' : 'chip-amber',
      iconTone: item.amount > 0 ? 'icon-mint' : 'icon-amber',
    }
  )
}

export function usePointsLogPage() {
  const { store, ensureLoggedIn } = useLoginGuard()
  const { statusBarHeight } = usePageLayout()
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
  const decoratedLogs = computed(() =>
    logs.value.map((item, index) => {
      const meta = getLogVisualMeta(item)
      const amount = Number(item.amount || 0)

      return {
        ...item,
        ...meta,
        key: item._id || `${item.create_time}-${index}`,
        amountLabel: `${amount > 0 ? '+' : '-'}${Math.abs(amount)}`,
        amountTone: amount > 0 ? 'amount-plus' : 'amount-minus',
        directionLabel: amount > 0 ? '收入' : '支出',
        title:
          item.description || (amount > 0 ? '获取积分' : '使用积分'),
        timeLabel: formatDate(item.create_time, 'mdHm'),
        relativeTimeLabel: formatRelativeDate(item.create_time) || '刚刚更新',
        balanceLabel:
          typeof item.balance === 'number' ? `结余 ${item.balance}` : '',
      }
    }),
  )
  const summaryCards = computed(() => {
    const incomeCount = logs.value.filter((item) => Number(item.amount || 0) > 0).length
    const consumeCount = logs.value.filter((item) => Number(item.amount || 0) < 0).length
    const latestLabel = logs.value[0]
      ? formatRelativeDate(logs.value[0].create_time) || '刚刚更新'
      : '暂无更新'

    return [
      {
        key: 'income',
        label: '奖励记录',
        value: String(incomeCount),
        tone: 'stat-mint',
      },
      {
        key: 'consume',
        label: '消费记录',
        value: String(consumeCount),
        tone: 'stat-amber',
      },
      {
        key: 'latest',
        label: '最近更新',
        value: latestLabel,
        tone: 'stat-violet',
      },
    ]
  })
  const sectionHint = computed(() => {
    if (loading.value && logs.value.length === 0) {
      return '正在同步你的积分流水'
    }

    if (logs.value.length > 0) {
      return `已加载 ${logs.value.length} 条记录`
    }

    return '最近获得和使用的积分都会展示在这里'
  })

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

  function goBack() {
    navigateBack()
  }

  async function syncPageData() {
    await Promise.all([refresh(), refreshUserPoints()])
  }

  onShow(() => {
    if (!ensureLoggedIn()) {
      return
    }

    void syncPageData()
  })

  onPullDownRefresh(async () => {
    if (!ensureLoggedIn()) {
      uni.stopPullDownRefresh()
      return
    }

    await Promise.all([refresh(), refreshUserPoints()])
    uni.stopPullDownRefresh()
  })

  onReachBottom(() => {
    if (!finished.value && !loading.value) {
      void loadMore()
    }
  })

  return {
    decoratedLogs,
    finished,
    formatDate: formatLogDate,
    goBack,
    loading,
    logs,
    sectionHint,
    summaryCards,
    statusBarHeight,
    store,
  }
}
