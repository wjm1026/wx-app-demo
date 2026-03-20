import { computed, ref } from 'vue'
import { onLoad, onReady, onShow } from '@dcloudio/uni-app'
import { cardApi, type Card, type Category } from '@/api'
import { useMeasuredHeight } from '@/composables/useMeasuredHeight'
import { usePageLayout } from '@/composables/usePageLayout'
import { getSafeAreaBottom, getSystemInfo, navigateTo } from '@/utils'

interface CategoryWithCards extends Category {
  cards: Card[]
  page: number
  hasMore: boolean
  isLoading: boolean
}

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
  const categories = ref<CategoryWithCards[]>([])
  const expandedIds = ref<string[]>([])
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

  /** 加载分类列表 */
  async function loadCategories() {
    if (isCategoryLoading.value) {
      return
    }

    isCategoryLoading.value = true
    isInitialLoading.value = true

    try {
      const res = await cardApi.getCategories()

      if (res.code === 0 && res.data) {
        categories.value = res.data.map((item) => ({
          ...item,
          cards: [],
          page: 1,
          hasMore: true,
          isLoading: false,
        }))

        expandedIds.value = expandedIds.value.filter((id) =>
          categories.value.some((item) => item._id === id),
        )

        if (expandedIds.value.length === 0 && categories.value.length > 0) {
          const firstId = categories.value[0]._id
          expandedIds.value = [firstId]
          void loadCards(firstId)
        } else {
          expandedIds.value.forEach((id) => {
            const category = categories.value.find((item) => item._id === id)
            if (category && category.cards.length === 0) {
              void loadCards(id)
            }
          })
        }
      }
    } catch (error) {
      console.error('加载分类失败:', error)
    } finally {
      isInitialLoading.value = false
      isCategoryLoading.value = false
    }
  }

  /** 加载分类卡片列表 */
  async function loadCards(categoryId: string) {
    const category = categories.value.find((item) => item._id === categoryId)

    if (!category || category.isLoading || !category.hasMore) {
      return
    }

    category.isLoading = true

    try {
      const res = await cardApi.getCardsByCategory({
        categoryId,
        page: category.page,
        pageSize: 12,
      })

      if (res.code === 0 && res.data) {
        category.cards =
          category.page === 1
            ? res.data.list
            : [...category.cards, ...res.data.list]
        category.hasMore = category.cards.length < res.data.total
        category.page += 1
      }
    } catch (error) {
      console.error('加载分类卡片失败:', error)
    } finally {
      category.isLoading = false
    }
  }

  /** 切换分类展开状态 */
  function toggleExpand(id: string) {
    const index = expandedIds.value.indexOf(id)

    if (index > -1) {
      expandedIds.value.splice(index, 1)
      return
    }

    expandedIds.value.push(id)

    const category = categories.value.find((item) => item._id === id)
    if (category && category.cards.length === 0) {
      void loadCards(id)
    }
  }

  /** 加载更多分类卡片 */
  function loadMore(categoryId: string) {
    void loadCards(categoryId)
  }

  /** 跳转到卡片详情 */
  function goCardDetail(id: string) {
    navigateTo(`/pages/card/detail?id=${id}`)
  }

  onLoad(() => {
    void loadCategories()
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
    expandedIds,
    goCardDetail,
    isImageIcon,
    isInitialLoading,
    loadMore,
    mainScrollStyle,
    navContentStyle,
    navLogoStyle,
    safeBottomStyle,
    statusBarHeight,
    toggleExpand,
  }
}
