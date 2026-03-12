import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { cardApi, type Card, type Category } from '@/api'
import {
  formatNumber,
  getErrorMessage,
  navigateBack,
  navigateTo,
  showToast,
} from '@/utils'
import { usePageLayout } from '@/composables/usePageLayout'

const HISTORY_KEY = 'SEARCH_HISTORY'
const DEFAULT_HOT_KEYWORDS = [
  '老虎',
  '苹果',
  '汽车',
  '香蕉',
  '狮子',
  '飞机',
  '西瓜',
  '熊猫',
  '大象',
  '火车',
]
const DEFAULT_EMPTY_SUGGESTIONS = ['动物', '水果', '交通工具']

function createSuggestionPool(words: string[]) {
  return Array.from(new Set(words.filter(Boolean)))
}

export function useSearchPage() {
  const { statusBarHeight, navBarHeight } = usePageLayout()
  const keyword = ref('')
  const hasSearched = ref(false)
  const isSearching = ref(false)
  const searchResults = ref<Card[]>([])
  const resultTotal = ref(0)
  const searchHistory = ref<string[]>([])
  const categoryMap = ref<Record<string, Category>>({})
  const hotKeywords = ref(DEFAULT_HOT_KEYWORDS)
  const emptySuggestions = ref(DEFAULT_EMPTY_SUGGESTIONS)
  const suggestionPool = ref(
    createSuggestionPool([...DEFAULT_HOT_KEYWORDS, ...DEFAULT_EMPTY_SUGGESTIONS]),
  )

  const suggestions = computed(() => {
    const term = keyword.value.trim()

    if (!term) {
      return []
    }

    return suggestionPool.value.filter((word) => word.includes(term)).slice(0, 6)
  })

  function restoreHistory() {
    const stored = uni.getStorageSync(HISTORY_KEY)

    if (!stored) {
      return
    }

    try {
      const list = JSON.parse(stored)

      if (Array.isArray(list)) {
        searchHistory.value = list.filter(
          (item): item is string => typeof item === 'string' && item.length > 0,
        )
      }
    } catch {
      uni.removeStorageSync(HISTORY_KEY)
    }
  }

  function persistHistory() {
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(searchHistory.value))
  }

  async function loadSearchMeta() {
    try {
      const [categoryRes, homeRes] = await Promise.all([
        cardApi.getCategories(),
        cardApi.getHomeData(),
      ])

      if (categoryRes.code === 0 && categoryRes.data) {
        categoryMap.value = categoryRes.data.reduce<Record<string, Category>>(
          (map, cat) => {
            map[cat._id] = cat
            return map
          },
          {},
        )

        const categoryNames = categoryRes.data.map((cat) => cat.name)
        emptySuggestions.value = categoryNames.slice(0, 4)
        suggestionPool.value = createSuggestionPool([
          ...suggestionPool.value,
          ...categoryNames,
        ])
      }

      if (homeRes.code === 0 && homeRes.data) {
        const dynamicKeywords = createSuggestionPool([
          ...homeRes.data.hotCards.map((card) => card.name),
          ...homeRes.data.recentCards.map((card) => card.name),
          ...homeRes.data.categories.map((category) => category.name),
        ])

        if (dynamicKeywords.length > 0) {
          hotKeywords.value = dynamicKeywords.slice(0, 10)
          suggestionPool.value = createSuggestionPool([
            ...suggestionPool.value,
            ...dynamicKeywords,
          ])
        }
      }
    } catch (error) {
      console.error('加载搜索元数据失败:', error)
    }
  }

  function resetSearchState() {
    hasSearched.value = false
    searchResults.value = []
    resultTotal.value = 0
  }

  function onInput() {
    resetSearchState()
  }

  async function doSearch() {
    const term = keyword.value.trim()

    if (!term || isSearching.value) {
      return
    }

    hasSearched.value = true
    isSearching.value = true

    if (!searchHistory.value.includes(term)) {
      searchHistory.value.unshift(term)

      if (searchHistory.value.length > 10) {
        searchHistory.value.length = 10
      }

      persistHistory()
    }

    try {
      const res = await cardApi.searchCards({ keyword: term, page: 1, pageSize: 50 })

      if (res.code === 0 && res.data) {
        searchResults.value = res.data.list || []
        resultTotal.value = res.data.total || searchResults.value.length
        return
      }

      searchResults.value = []
      resultTotal.value = 0
      showToast(res.msg || '搜索失败')
    } catch (error) {
      console.error('搜索失败:', error)
      searchResults.value = []
      resultTotal.value = 0
      showToast(getErrorMessage(error, '搜索失败，请稍后重试'))
    } finally {
      isSearching.value = false
    }
  }

  function searchKeyword(word: string) {
    keyword.value = word
    void doSearch()
  }

  function clearKeyword() {
    keyword.value = ''
    resetSearchState()
  }

  function clearHistory() {
    searchHistory.value = []
    persistHistory()
    showToast('已清空搜索历史')
  }

  function getCategoryName(card: Card) {
    return categoryMap.value[card.category_id]?.name || '未分类'
  }

  function getCategoryBackground(card: Card) {
    return categoryMap.value[card.category_id]?.gradient || 'rgba(96, 165, 250, 0.9)'
  }

  function goBack() {
    navigateBack()
  }

  function goCardDetail(id: string) {
    navigateTo(`/pages/card/detail?id=${id}`)
  }

  onLoad(() => {
    restoreHistory()
    void loadSearchMeta()
  })

  return {
    clearHistory,
    clearKeyword,
    doSearch,
    emptySuggestions,
    formatNumber,
    getCategoryBackground,
    getCategoryName,
    goBack,
    goCardDetail,
    hasSearched,
    hotKeywords,
    keyword,
    navBarHeight,
    onInput,
    resultTotal,
    searchHistory,
    searchKeyword,
    searchResults,
    statusBarHeight,
    suggestions,
  }
}
