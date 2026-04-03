import { computed, ref } from 'vue'
import { onLoad, onPullDownRefresh, onReady, onShow } from '@dcloudio/uni-app'
import { cardApi, type Category } from '@/api'
import { useMeasuredHeight } from '@/composables/useMeasuredHeight'
import { usePageLayout } from '@/composables/usePageLayout'
import { getSafeAreaBottom, getSystemInfo, navigateTo } from '@/utils'
import {
  getCategoryDescriptionText,
  getCategoryHeroDescriptionText,
} from '../categoryCopy'

const CONTENT_TOP_GAP_PX = uni.upx2px(32)
const TABBAR_SPACER_PX = uni.upx2px(160)
const DEFAULT_APP_LOGO = '/static/icons/brands/app-logo.png'
const CATEGORY_FALLBACK_GRADIENTS = [
  'linear-gradient(145deg, #fff4dc 0%, #ffe8b8 100%)',
  'linear-gradient(145deg, #edf5ff 0%, #dceafe 100%)',
  'linear-gradient(145deg, #eefcf3 0%, #d9f7e5 100%)',
  'linear-gradient(145deg, #fff0f5 0%, #ffe0ec 100%)',
]
const HERO_PREVIEW_COUNT = 5

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

/** 获取分类展示图 */
function getCategoryImage(category: Category) {
  const cover = String(category.cover || '').trim()
  if (isImageIcon(cover)) {
    return cover
  }

  const icon = String(category.icon || '').trim()
  if (isImageIcon(icon)) {
    return icon
  }

  return ''
}

/** 获取分类首字作为兜底视觉 */
function getCategoryMonogram(category: Category) {
  return String(category.name || '学').trim().slice(0, 1) || '学'
}

/** 获取分类卡片数量文案 */
function getCategoryCountText(category: Category) {
  const count = Number(category.card_count || 0)
  return count > 0 ? `${count}张卡片` : '点开开始学习'
}

/** 获取分类封面渐变底色 */
function getCategoryCoverStyle(category: Category, index: number) {
  return {
    background: category.gradient || CATEGORY_FALLBACK_GRADIENTS[index % CATEGORY_FALLBACK_GRADIENTS.length],
  }
}

/** 打乱分类顺序副本 */
function shuffleCategories(list: Category[]) {
  const copy = [...list]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[randomIndex]
    copy[randomIndex] = current
  }

  return copy
}

/** 生成 hero 预览分类 */
function pickHeroPreviewCategories(list: Category[]) {
  if (list.length === 0) {
    return []
  }

  const imageCategories = list.filter((item) => Boolean(getCategoryImage(item)))
  const pool = imageCategories.length > 0 ? imageCategories : list

  return shuffleCategories(pool).slice(0, HERO_PREVIEW_COUNT)
}

/** 封装首页页面逻辑 */
export function useIndexPage() {
  const { statusBarHeight, navBarHeight } = usePageLayout()
  const { height: measuredNavBarHeight, measureHeight: updateNavBarHeight } =
    useMeasuredHeight('.nav-bar', navBarHeight.value)

  const menuButtonInsetPx = getMenuButtonInsetPx()
  const categories = ref<Category[]>([])
  const miniAppIcon = ref('')
  const heroPreviewCategories = ref<Category[]>([])
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
  const resolvedAppLogo = computed(() => miniAppIcon.value || DEFAULT_APP_LOGO)
  const totalCardCount = computed(() =>
    categories.value.reduce((sum, item) => sum + Math.max(Number(item.card_count || 0), 0), 0),
  )
  const categoryCountText = computed(() =>
    categories.value.length > 0 ? `${categories.value.length}个主题分类` : '启蒙主题持续更新中',
  )
  const totalCardCountText = computed(() =>
    totalCardCount.value > 0 ? `${totalCardCount.value}张认知卡片` : '海量插画内容持续补充',
  )
  const featuredTopicsText = computed(() => {
    const names = categories.value
      .map((item) => String(item.name || '').trim())
      .filter(Boolean)
      .slice(0, 3)

    return names.length > 0 ? names.join(' · ') : '自然 · 字母 · 颜色'
  })
  const heroCategory = computed(
    () =>
      heroPreviewCategories.value[0]
      || categories.value.find((item) => Boolean(getCategoryImage(item)))
      || categories.value[0]
      || null,
  )
  const heroDescription = computed(() => {
    return getCategoryHeroDescriptionText(heroCategory.value)
  })
  const heroPreviewCards = computed(() =>
    heroPreviewCategories.value.map((category, index) => ({
      key: String(category._id || category.name || index),
      image: getCategoryImage(category),
      monogram: getCategoryMonogram(category),
      index,
    })),
  )

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

        const isPreviewValid = heroPreviewCategories.value.length > 0
          && heroPreviewCategories.value.every((preview) =>
            categories.value.some((item) => String(item._id || '') === String(preview._id || '')),
          )

        if (!isPreviewValid) {
          heroPreviewCategories.value = pickHeroPreviewCategories(categories.value)
        }
      }
    } catch (error) {
      console.error('加载分类失败:', error)
    } finally {
      isInitialLoading.value = false
      isCategoryLoading.value = false
    }
  }

  /** 加载首页展示配置 */
  async function loadDisplayConfig() {
    try {
      const res = await cardApi.getDisplayConfig()
      if (res.code !== 0) {
        miniAppIcon.value = ''
        return
      }
      miniAppIcon.value = String(res.data?.miniApp?.icon || '').trim()
    } catch {
      miniAppIcon.value = ''
    }
  }

  onLoad(() => {
    void loadCategories()
    void loadDisplayConfig()
    updateNavBarHeight()
  })

  onReady(() => {
    updateNavBarHeight()
  })

  onShow(() => {
    void loadCategories({ showLoadingState: false })
    void loadDisplayConfig()
    updateNavBarHeight()
  })

  onPullDownRefresh(async () => {
    await loadCategories()
    uni.stopPullDownRefresh()
  })

  return {
    categoryCountText,
    categories,
    featuredTopicsText,
    getCategoryCountText,
    getCategoryCoverStyle,
    getCategoryDescription: getCategoryDescriptionText,
    getCategoryImage,
    getCategoryMonogram,
    heroDescription,
    heroPreviewCards,
    isInitialLoading,
    mainScrollStyle,
    navContentStyle,
    navLogoStyle,
    openCategoryCards,
    resolvedAppLogo,
    safeBottomStyle,
    statusBarHeight,
    totalCardCountText,
  }
}
