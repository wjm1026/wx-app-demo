import { computed, ref } from 'vue'
import { onLoad, onPullDownRefresh, onReady, onShow } from '@dcloudio/uni-app'
import { cardApi, type Category } from '@/api'
import { useMeasuredHeight } from '@/composables/useMeasuredHeight'
import { usePageLayout } from '@/composables/usePageLayout'
import { getSafeAreaBottom, getSystemInfo, navigateTo } from '@/utils'

const CONTENT_TOP_GAP_PX = uni.upx2px(32)
const TABBAR_SPACER_PX = uni.upx2px(160)

/** 获取菜单按钮留白像素值 */
function getMenuButtonInsetPx() {
  const systemInfo = getSystemInfo()
  const menuButtonInfo = uni.getMenuButtonBoundingClientRect?.()

  if (!menuButtonInfo || !systemInfo.windowWidth) {
    return uni.upx2px(220)
  }

  return Math.ceil(systemInfo.windowWidth - menuButtonInfo.left + uni.upx2px(24))
}

/** 判断分类图标是否为图片地址 */
function isImageIcon(value?: string) {
  if (!value) {
    return false
  }

  return /^(https?:\/\/|cloud:\/\/|file:\/\/|wxfile:\/\/|\/)/i.test(value.trim())
}

/** 封装首页页面逻辑 */
export function useIndexPage() {
  const { statusBarHeight, navBarHeight } = usePageLayout()
  const { height: measuredNavBarHeight, measureHeight: updateNavBarHeight } =
    useMeasuredHeight('.nav-bar', navBarHeight.value)

  const menuButtonInsetPx = getMenuButtonInsetPx()
  const categories = ref<Category[]>([])
  const isInitialLoading = ref(true)
  const isCategoryLoading = ref(false)

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
  const safeBottomStyle = computed(() => ({
    height: `${TABBAR_SPACER_PX + getSafeAreaBottom()}px`,
  }))

  /** 打开分类详情页 */
  function openCategoryCards(category: Category) {
    const categoryId = String(category._id || '').trim()
    if (!categoryId) {
      return
    }

    const encodedId = encodeURIComponent(categoryId)
    const encodedName = encodeURIComponent(String(category.name || '分类图片'))

    navigateTo(`/pages/category/cards?categoryId=${encodedId}&categoryName=${encodedName}`)
  }

  /** 加载分类列表 */
  async function loadCategories(options: { showLoadingState?: boolean } = {}) {
    if (isCategoryLoading.value) {
      return
    }

    const { showLoadingState = categories.value.length === 0 } = options

    isCategoryLoading.value = true
    if (showLoadingState) {
      isInitialLoading.value = true
    }

    try {
      const res = await cardApi.getCategories()

      if (res.code === 0) {
        categories.value = Array.isArray(res.data) ? res.data : []
      }
    } catch (error) {
      console.error('加载分类失败:', error)
    } finally {
      isInitialLoading.value = false
      isCategoryLoading.value = false
    }
  }

  onLoad(() => {
    void loadCategories()
    updateNavBarHeight()
  })

  onReady(() => {
    updateNavBarHeight()
  })

  onShow(() => {
    void loadCategories({ showLoadingState: false })
    updateNavBarHeight()
  })

  onPullDownRefresh(async () => {
    await loadCategories()
    uni.stopPullDownRefresh()
  })

  return {
    categories,
    isImageIcon,
    isInitialLoading,
    mainScrollStyle,
    navContentStyle,
    navLogoStyle,
    openCategoryCards,
    safeBottomStyle,
    statusBarHeight,
  }
}
