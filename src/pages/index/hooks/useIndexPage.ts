import { computed, ref } from 'vue'
import { onLoad, onReady, onShow } from '@dcloudio/uni-app'
import { cardApi, type Card, type Category } from '@/api'
import { useMeasuredHeight } from '@/composables/useMeasuredHeight'
import { usePageLayout } from '@/composables/usePageLayout'
import { formatNumber, getSystemInfo, navigateTo } from '@/utils'

const CONTENT_TOP_GAP_PX = uni.upx2px(32)
const NEW_CARD_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const DAILY_GOAL = 10

/** 获取菜单按钮留白像素值 */
function getMenuButtonInsetPx() {
  const systemInfo = getSystemInfo()
  const menuButtonInfo = uni.getMenuButtonBoundingClientRect?.()

  if (!menuButtonInfo || !systemInfo.windowWidth) {
    return uni.upx2px(220)
  }

  return Math.ceil(systemInfo.windowWidth - menuButtonInfo.left + uni.upx2px(24))
}

/** 封装首页页面逻辑 */
export function useIndexPage() {
  const { statusBarHeight, navBarHeight } = usePageLayout()
  const { height: measuredNavBarHeight, measureHeight: updateNavBarHeight } =
    useMeasuredHeight('.nav-bar', navBarHeight.value)

  const menuButtonInsetPx = getMenuButtonInsetPx()
  const categories = ref<Category[]>([])
  const hotCards = ref<Card[]>([])
  const recentCards = ref<Card[]>([])
  const isLoading = ref(false)
  const todayStats = ref({
    learned: 5,
    streak: 3,
    points: 25,
  })

  const resolvedNavBarHeight = computed(
    () => measuredNavBarHeight.value || navBarHeight.value,
  )
  const navContentStyle = computed(() => ({
    paddingRight: `${menuButtonInsetPx}px`,
  }))
  const navLogoStyle = computed(() => ({
    maxWidth: `calc(100% - ${Math.max(menuButtonInsetPx - uni.upx2px(24), 0)}px)`,
  }))
  const mainScrollStyle = computed(() => ({
    paddingTop: `${resolvedNavBarHeight.value + CONTENT_TOP_GAP_PX}px`,
  }))
  const remainCards = computed(() =>
    Math.max(0, DAILY_GOAL - todayStats.value.learned),
  )
  const progressPercent = computed(() =>
    Math.min(100, (todayStats.value.learned / DAILY_GOAL) * 100),
  )
  const useCategoryBanner = computed(() => categories.value.length > 4)

  /** 加载数据 */
  async function loadData() {
    if (isLoading.value) {
      return
    }

    isLoading.value = true

    try {
      const res = await cardApi.getHomeData()

      if (res.code === 0 && res.data) {
        categories.value = res.data.categories || []
        hotCards.value = res.data.hotCards || []
        recentCards.value = res.data.recentCards || []
      }
    } catch (error) {
      console.error('加载首页数据失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  /** 判断新卡片是否满足条件 */
  function isNewCard(card: Card): boolean {
    if (!card.create_time) {
      return false
    }

    return Date.now() - card.create_time < NEW_CARD_WINDOW_MS
  }

  /** 获取分类名称 */
  function getCategoryName(card: Card): string {
    return (
      categories.value.find((item) => item._id === card.category_id)?.name ||
      '未分类'
    )
  }

  /** 跳转到搜索 */
  function goSearch() {
    navigateTo('/pages/search/search')
  }

  /** 跳转到分类 */
  function goCategory() {
    uni.switchTab({ url: '/pages/category/category' })
  }

  /** 跳转到分类详情 */
  function goCategoryDetail(id: string) {
    uni.setStorageSync('TARGET_CATEGORY_ID', id)
    uni.switchTab({
      url: '/pages/category/category',
    })
  }

  /** 跳转到卡片详情 */
  function goCardDetail(id: string) {
    navigateTo(`/pages/card/detail?id=${id}`)
  }

  onLoad(() => {
    void loadData()
    updateNavBarHeight()
  })

  onReady(() => {
    updateNavBarHeight()
  })

  onShow(() => {
    updateNavBarHeight()
  })

  return {
    categories,
    formatNumber,
    getCategoryName,
    goCardDetail,
    goCategory,
    goCategoryDetail,
    goSearch,
    hotCards,
    isNewCard,
    mainScrollStyle,
    navContentStyle,
    navLogoStyle,
    progressPercent,
    recentCards,
    remainCards,
    statusBarHeight,
    todayStats,
    useCategoryBanner,
  }
}
