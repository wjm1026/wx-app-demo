import { computed, nextTick, ref, watch } from 'vue'
import { onReady, onShow } from '@dcloudio/uni-app'
import { cardApi, type Card, type Category } from '@/api'
import { useMeasuredHeight } from '@/composables/useMeasuredHeight'
import { usePageLayout } from '@/composables/usePageLayout'
import {
  getSafeAreaBottom,
  navigateTo,
  resolveNodeRect,
} from '@/utils'

interface CategoryWithCards extends Category {
  cards: Card[]
  page: number
  hasMore: boolean
  isLoading: boolean
}

const CONTENT_TOP_GAP_PX = uni.upx2px(32)

export function useCategoryPage() {
  const { statusBarHeight, navBarHeight } = usePageLayout()
  const { height: measuredNavBarHeight, measureHeight: updateNavBarHeight } =
    useMeasuredHeight('.nav-bar', navBarHeight.value)

  const categories = ref<CategoryWithCards[]>([])
  const expandedIds = ref<string[]>([])
  const isInitialLoading = ref(true)
  const enableScroll = ref(false)
  const tabbarSpacerPx = uni.upx2px(160) + getSafeAreaBottom()

  const resolvedNavBarHeight = computed(
    () => measuredNavBarHeight.value || navBarHeight.value,
  )
  const contentScrollStyle = computed(() => ({
    marginTop: `${resolvedNavBarHeight.value + CONTENT_TOP_GAP_PX}px`,
    height: `calc(100vh - ${resolvedNavBarHeight.value + CONTENT_TOP_GAP_PX}px)`,
  }))
  const safeBottomStyle = computed(() => ({
    height: enableScroll.value ? `${tabbarSpacerPx}px` : '0px',
  }))

  function updateScrollState() {
    nextTick(() => {
      uni
        .createSelectorQuery()
        .select('.page-content')
        .boundingClientRect()
        .select('.page-content-inner')
        .boundingClientRect()
        .exec((result) => {
          const containerRect = resolveNodeRect(result?.[0])
          const innerRect = resolveNodeRect(result?.[1])

          if (!containerRect?.height || !innerRect?.height) {
            enableScroll.value = false
            return
          }

          enableScroll.value =
            innerRect.height + tabbarSpacerPx - containerRect.height > 2
        })
    })
  }

  async function loadCategories() {
    isInitialLoading.value = true

    try {
      const res = await cardApi.getCategories()

      if (res.code === 0 && res.data) {
        const oldCategories = categories.value
        categories.value = res.data.map((cat) => {
          const oldCat = oldCategories.find((item) => item._id === cat._id)

          return {
            ...cat,
            cards: oldCat ? oldCat.cards : [],
            page: oldCat ? oldCat.page : 1,
            hasMore: oldCat ? oldCat.hasMore : true,
            isLoading: false,
          }
        })

        if (expandedIds.value.length === 0 && categories.value.length > 0) {
          toggleExpand(categories.value[0]._id)
        }
      }
    } catch (error) {
      console.error('加载分类失败:', error)
    } finally {
      isInitialLoading.value = false
      updateScrollState()
    }
  }

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
      console.error('加载卡片失败:', error)
    } finally {
      category.isLoading = false
      updateScrollState()
    }
  }

  function toggleExpand(id: string) {
    const index = expandedIds.value.indexOf(id)

    if (index > -1) {
      expandedIds.value.splice(index, 1)
    } else {
      expandedIds.value.push(id)
      const category = categories.value.find((item) => item._id === id)

      if (category && category.cards.length === 0) {
        void loadCards(id)
      }
    }

    updateScrollState()
  }

  function goCardDetail(id: string) {
    navigateTo(`/pages/card/detail?id=${id}`)
  }

  function loadMore(categoryId: string) {
    void loadCards(categoryId)
  }

  onShow(async () => {
    updateNavBarHeight()
    await loadCategories()
    updateScrollState()

    try {
      const targetId = uni.getStorageSync('TARGET_CATEGORY_ID')

      if (targetId) {
        if (!expandedIds.value.includes(targetId)) {
          toggleExpand(targetId)
        }

        uni.removeStorageSync('TARGET_CATEGORY_ID')
      }
    } catch (error) {
      console.error('读取分类参数失败', error)
    }
  })

  onReady(() => {
    updateNavBarHeight()
  })

  watch(
    () =>
      categories.value.map((item) => ({
        id: item._id,
        count: item.cards.length,
        loading: item.isLoading,
        hasMore: item.hasMore,
      })),
    () => {
      updateScrollState()
    },
    { deep: true },
  )

  watch(
    expandedIds,
    () => {
      updateScrollState()
    },
    { deep: true },
  )

  return {
    categories,
    contentScrollStyle,
    enableScroll,
    expandedIds,
    goCardDetail,
    isInitialLoading,
    loadMore,
    safeBottomStyle,
    statusBarHeight,
    toggleExpand,
  }
}
