import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { adminApi, cardApi, type AdminStatsResult } from '@/api'
import { useConfirmedAction } from '@/composables/useConfirmedAction'
import { usePageLayout } from '@/composables/usePageLayout'
import {
  assertApiSuccess,
  getSystemInfo,
  navigateBack,
  navigateTo,
  showToast,
} from '@/utils'

interface AdminStats {
  userCount: number
  cardCount: number
  categoryCount: number
  todayNewUsers: number
  todayActiveUsers: number
}

/** 规范化统计数据 */
function normalizeStats(data?: AdminStatsResult): AdminStats {
  return {
    userCount: data?.userCount || 0,
    cardCount: data?.cardCount || 0,
    categoryCount: data?.categoryCount || 0,
    todayNewUsers: data?.todayNewUsers || 0,
    todayActiveUsers: data?.todayActiveUsers || 0,
  }
}

/** 将输入内容转换为百分比 */
function toPercent(part: number, total: number) {
  if (!total) {
    return 0
  }

  return Math.round((part / total) * 100)
}

/** 将输入内容转换为平均值 */
function toAverage(total: number, count: number) {
  if (!count) {
    return '0.0'
  }

  return (total / count).toFixed(1)
}

/** 获取菜单按钮留白像素值 */
function getMenuButtonInsetPx() {
  const systemInfo = getSystemInfo()
  const menuButtonInfo = uni.getMenuButtonBoundingClientRect?.()

  if (!menuButtonInfo || !systemInfo.windowWidth) {
    return uni.upx2px(220)
  }

  return Math.ceil(systemInfo.windowWidth - menuButtonInfo.left + uni.upx2px(24))
}

/** 封装后台页面逻辑 */
export function useAdminPage() {
  const { statusBarHeight } = usePageLayout()
  const { runConfirmedAction } = useConfirmedAction()
  const menuButtonInsetPx = getMenuButtonInsetPx()
  const isAdmin = ref(false)
  const checkingAdmin = ref(true)
  const stats = ref<AdminStats>(normalizeStats())

  /** 格式化数值 */
  function formatNumber(value: number) {
    return (value || 0).toLocaleString()
  }

  const activeRate = computed(() =>
    toPercent(stats.value.todayActiveUsers, stats.value.userCount),
  )

  const averageCardsPerCategory = computed(() =>
    toAverage(stats.value.cardCount, stats.value.categoryCount),
  )

  const statusTone = computed(() => {
    if (checkingAdmin.value) {
      return 'is-pending'
    }

    return isAdmin.value ? 'is-ready' : 'is-denied'
  })

  const navPlaceholderStyle = computed(() => ({
    width: `${menuButtonInsetPx}px`,
  }))

  const statusLabel = computed(() => {
    if (checkingAdmin.value) {
      return '权限校验中'
    }

    if (!isAdmin.value) {
      return '访问受限'
    }

    return stats.value.cardCount > 0 ? '数据已接入' : '待初始化'
  })

  const snapshotLabel = computed(() => {
    if (stats.value.todayNewUsers > 0) {
      return `今日新增 ${formatNumber(stats.value.todayNewUsers)} 位用户`
    }

    if (stats.value.todayActiveUsers > 0) {
      return `当前活跃 ${formatNumber(stats.value.todayActiveUsers)} 位用户`
    }

    return '等待今天的第一批数据写入'
  })

  // 这里把有限的后台统计字段折叠成“运营脉冲”，避免模板里到处散落百分比和比率公式。
  const pulseCards = computed(() => [
    {
      key: 'active-rate',
      label: '活跃渗透',
      value: `${activeRate.value}%`,
      desc: `今日活跃 ${formatNumber(stats.value.todayActiveUsers)} / 总用户 ${formatNumber(stats.value.userCount)}`,
      icon: '/static/icons/line/bar-chart.svg',
      tone: 'tone-blue',
    },
    {
      key: 'density',
      label: '内容密度',
      value: averageCardsPerCategory.value,
      desc: `平均每个分类承载 ${averageCardsPerCategory.value} 张卡片`,
      icon: '/static/icons/line/ticket.svg',
      tone: 'tone-amber',
    },
    {
      key: 'growth',
      label: '新增动能',
      value: formatNumber(stats.value.todayNewUsers),
      desc: '今日进入系统的新用户数量',
      icon: '/static/icons/line/users.svg',
      tone: 'tone-violet',
    },
  ])

  const menuCards = computed(() => [
    {
      key: 'users',
      title: '用户管理',
      metric: `${formatNumber(stats.value.userCount)} 位用户`,
      desc: '查看用户状态、积分和封禁情况',
      badge: '实时',
      icon: '/static/icons/line/users.svg',
      available: true,
      tone: 'tone-blue',
      onClick: goUsers,
    },
    {
      key: 'stats',
      title: '数据统计',
      metric: `${activeRate.value}% 活跃率`,
      desc: '追踪关键指标与内容运营趋势',
      badge: '分析',
      icon: '/static/icons/line/bar-chart.svg',
      available: true,
      tone: 'tone-indigo',
      onClick: goStats,
    },
    {
      key: 'tasks',
      title: '任务配置',
      metric: '积分任务中心',
      desc: '维护任务名称、描述、积分和按钮文案',
      badge: '运营',
      icon: '/static/icons/line/gift.svg',
      available: true,
      tone: 'tone-violet',
      onClick: goTasks,
    },
    {
      key: 'categories',
      title: '分类管理',
      metric: `${formatNumber(stats.value.categoryCount)} 个分类`,
      desc: '维护内容结构和分类编排规则',
      badge: '内容',
      icon: '/static/icons/line/grid.svg',
      available: true,
      tone: 'tone-amber',
      onClick: goCategories,
    },
    {
      key: 'cards',
      title: '卡片管理',
      metric: `${formatNumber(stats.value.cardCount)} 张卡片`,
      desc: '补充内容资源并维护素材质量',
      badge: '内容',
      icon: '/static/icons/line/ticket.svg',
      available: true,
      tone: 'tone-mint',
      onClick: goCards,
    },
  ])

  const maintenanceCards = computed(() => [
    {
      key: 'init-data',
      title: '初始化测试数据',
      desc: '清空现有分类与卡片后重新生成演示内容。',
      note: '高影响操作，会覆盖当前测试数据。',
      buttonLabel: '执行初始化',
      icon: '/static/icons/line/check-circle.svg',
      tone: 'tone-danger',
      onClick: initData,
    },
    {
      key: 'repair-images',
      title: '修复内容图片',
      desc: '回填卡片与分类的真实图片 URL，修正占位资源。',
      note: '安全维护操作，适合内容联调后执行。',
      buttonLabel: '开始修复',
      icon: '/static/icons/line/info.svg',
      tone: 'tone-safe',
      onClick: repairCardImages,
    },
    {
      key: 'clear-learning-log',
      title: '清空学习记录',
      desc: '删除 learning_log 全表，并把用户学习计数统一归零。',
      note: '高风险操作，不会清空已解锁成就，执行后需重新累积学习记录。',
      buttonLabel: '立即清空',
      icon: '/static/icons/line/shield.svg',
      tone: 'tone-danger',
      onClick: clearLearningLog,
    },
  ])

  /** 加载统计数据 */
  async function loadStats() {
    try {
      const res = assertApiSuccess(await adminApi.getStats(), '加载统计数据失败')
      stats.value = normalizeStats(res.data)
    } catch {
      // 后台首页每次展示都会拉取统计，这里保持静默失败，避免出现连续 toast 打断操作。
    }
  }

  /** 检查后台 */
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

  // 后台维护动作的交互流程完全一样，差别只在文案和具体调用哪个 API。
  async function runCardMaintenanceAction(options: {
    title: string
    content: string
    loadingText: string
    errorText: string
    fallbackSuccessText: string
    execute: () => Promise<{ code: number; msg?: string }>
  }) {
    await runConfirmedAction({
      title: options.title,
      content: options.content,
      loadingText: options.loadingText,
      errorText: options.errorText,
      execute: async () => assertApiSuccess(await options.execute(), options.errorText),
      getSuccessMessage: (result) => result.msg || options.fallbackSuccessText,
      onSuccess: async () => {
        await loadStats()
      },
    })
  }

  /** 初始化数据 */
  async function initData() {
    await runCardMaintenanceAction({
      title: '确认初始化',
      content: '将清除现有分类和卡片数据，重新创建测试数据，确定继续吗？',
      loadingText: '初始化中...',
      errorText: '初始化失败',
      fallbackSuccessText: '初始化完成',
      execute: () => cardApi.initData(),
    })
  }

  /** 修复卡片图片 */
  async function repairCardImages() {
    await runCardMaintenanceAction({
      title: '确认修复图片',
      content: '将把数据库中的占位图 URL 批量回填为真实图片地址，确定继续吗？',
      loadingText: '修复中...',
      errorText: '图片修复失败',
      fallbackSuccessText: '图片修复完成',
      execute: () => cardApi.repairCardImages(),
    })
  }

  /** 清空学习日志 */
  async function clearLearningLog() {
    await runCardMaintenanceAction({
      title: '确认清空学习记录',
      content: '将清空 learning_log 全表，并把所有用户的已学习卡片计数归零。此操作不会清空已解锁成就，确定继续吗？',
      loadingText: '清理学习记录中...',
      errorText: '清理学习记录失败',
      fallbackSuccessText: '学习记录已清空',
      execute: () => adminApi.clearLearningLog(),
    })
  }

  /** 跳转到用户列表 */
  function goUsers() {
    navigateTo('/pages/admin/users')
  }

  /** 跳转到统计数据 */
  function goStats() {
    navigateTo('/pages/admin/stats')
  }

  /** 跳转到任务列表 */
  function goTasks() {
    navigateTo('/pages/admin/tasks')
  }

  /** 跳转到分类列表 */
  function goCategories() {
    navigateTo('/pages/admin/categories')
  }

  /** 跳转到卡片列表 */
  function goCards() {
    navigateTo('/pages/admin/cards')
  }

  /** 返回上一页 */
  function goBack() {
    navigateBack()
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
    goBack,
    isAdmin,
    maintenanceCards,
    menuCards,
    navPlaceholderStyle,
    pulseCards,
    snapshotLabel,
    statusBarHeight,
    statusLabel,
    statusTone,
  }
}
