<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-btn" @click="goBack">
          <text class="nav-icon">←</text>
        </view>
        <text class="nav-title">搜索</text>
        <view class="nav-spacer"></view>
      </view>
    </view>

    <view class="page-content" :style="{ paddingTop: navBarHeight + 'px' }">
      <!-- 搜索头部 -->
      <view class="search-header">
        <view class="search-frame">
          <view class="search-bar">
            <view class="search-icon"></view>
            <input 
              class="search-input" 
              v-model="keyword" 
              placeholder="搜索动物、水果、交通工具..." 
              placeholder-class="placeholder"
              @confirm="doSearch"
              @input="onInput"
              focus
            />
            <view v-if="keyword" class="clear-btn" @click="clearKeyword">
              <text class="clear-icon">×</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 搜索建议 (输入时显示) -->
      <view v-if="keyword && !hasSearched && suggestions.length > 0" class="suggestions">
        <view 
          v-for="(item, index) in suggestions" 
          :key="index" 
          class="suggestion-item"
          @click="searchKeyword(item)"
        >
          <view class="suggestion-prefix">{{ index + 1 }}</view>
          <text class="suggestion-text">{{ item }}</text>
          <text class="suggestion-arrow">→</text>
        </view>
      </view>

      <!-- 热门搜索 (无输入时显示) -->
      <view v-if="!keyword && !hasSearched" class="hot-section">
        <view class="hot-panel">
          <view class="section-header">
            <view class="header-left">
              <view class="section-dot hot"></view>
              <text class="section-title">热门搜索</text>
            </view>
          </view>
          <view class="hot-tags">
            <view 
              v-for="(item, index) in hotKeywords" 
              :key="item" 
              class="hot-tag"
              :class="'color-' + (index % 5)"
              @click="searchKeyword(item)"
            >
              <text class="tag-rank" v-if="index < 3">{{ index + 1 }}</text>
              <text class="tag-text">{{ item }}</text>
            </view>
          </view>
        </view>

        <!-- 搜索历史 -->
        <view v-if="searchHistory.length > 0" class="history-section">
          <view class="section-header">
            <view class="header-left">
              <view class="section-dot"></view>
              <text class="section-title">搜索历史</text>
            </view>
            <view class="clear-history" @click="clearHistory">
              <text class="clear-text">清空</text>
            </view>
          </view>
          <view class="history-tags">
            <view 
              v-for="item in searchHistory" 
              :key="item" 
              class="history-tag"
              @click="searchKeyword(item)"
            >
              {{ item }}
            </view>
          </view>
        </view>
      </view>

      <!-- 空结果 -->
      <view v-if="hasSearched && searchResults.length === 0" class="empty-state">
        <view class="empty-illustration">
          <view class="empty-ring"></view>
          <view class="empty-center"></view>
        </view>
        <text class="empty-title">没有找到"{{ keyword }}"</text>
        <text class="empty-subtitle">换个关键词试试吧</text>
        <view class="empty-suggestions">
          <text class="suggestion-label">试试搜索：</text>
          <view class="suggestion-tags">
            <view 
              v-for="item in emptySuggestions" 
              :key="item" 
              class="suggestion-tag"
              @click="searchKeyword(item)"
            >
              {{ item }}
            </view>
          </view>
        </view>
      </view>

      <!-- 搜索结果 -->
      <scroll-view v-if="hasSearched && searchResults.length > 0" scroll-y class="results-scroll">
        <view class="results-header">
          <text class="results-count">共 {{ searchResults.length }} 个结果</text>
          <view class="filter-btn">
            <text class="filter-text">按热度</text>
          </view>
        </view>
        
        <view class="results-grid">
          <view 
            v-for="(item, index) in searchResults" 
            :key="item._id" 
            class="result-card"
            :class="'delay-' + index"
            @click="goCardDetail(item._id)"
          >
            <view class="card-image-wrapper">
              <image class="card-image" :src="item.image" mode="aspectFill" />
              <view class="card-category" :style="{ background: getCategoryBackground(item) }">
                {{ getCategoryName(item) }}
              </view>
            </view>
            <view class="card-content">
              <text class="card-name">{{ item.name }}</text>
              <view class="card-meta">
                <text class="meta-label">浏览</text>
                <text class="meta-value">{{ formatNumber(item.view_count || 0) }}</text>
              </view>
            </view>
          </view>
        </view>
        
        <view class="results-footer">
          <text class="footer-text">— 已显示全部结果 —</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { formatNumber, getStatusBarHeight, getNavBarHeight, navigateBack, navigateTo, showToast } from '@/utils'
import { cardApi, type Card, type Category } from '@/api'

const HISTORY_KEY = 'SEARCH_HISTORY'

const keyword = ref('')
const hasSearched = ref(false)
const isSearching = ref(false)
const searchResults = ref<Card[]>([])
const searchHistory = ref<string[]>([])
const categoryMap = ref<Record<string, Category>>({})
const statusBarHeight = ref(getStatusBarHeight())
const navBarHeight = ref(getNavBarHeight())

const hotKeywords = ref(['老虎', '苹果', '汽车', '香蕉', '狮子', '飞机', '西瓜', '熊猫', '大象', '火车'])
const emptySuggestions = ref(['动物', '水果', '交通工具'])

const suggestions = computed(() => {
  if (!keyword.value.trim()) return []
  const allWords = ['老虎', '狮子', '苹果', '香蕉', '汽车', '飞机', '熊猫', '大象', '西瓜', '火车']
  return allWords.filter(w => w.includes(keyword.value)).slice(0, 5)
})

onLoad(() => {
  restoreHistory()
  loadCategories()
})

async function loadCategories() {
  try {
    const res = await cardApi.getCategories()
    if (res.code === 0 && res.data) {
      const map: Record<string, Category> = {}
      res.data.forEach((cat) => {
        map[cat._id] = cat
      })
      categoryMap.value = map
    }
  } catch (e) {
    console.error('加载分类失败:', e)
  }
}

function restoreHistory() {
  const stored = uni.getStorageSync(HISTORY_KEY)
  if (!stored) return
  try {
    const list = JSON.parse(stored)
    if (Array.isArray(list)) {
      searchHistory.value = list
    }
  } catch (e) {
    // ignore invalid cache
  }
}

function persistHistory() {
  uni.setStorageSync(HISTORY_KEY, JSON.stringify(searchHistory.value))
}

function onInput() {
  hasSearched.value = false
  searchResults.value = []
}

async function doSearch() {
  const term = keyword.value.trim()
  if (!term || isSearching.value) return

  hasSearched.value = true
  isSearching.value = true

  // 添加到搜索历史
  if (!searchHistory.value.includes(term)) {
    searchHistory.value.unshift(term)
    if (searchHistory.value.length > 10) {
      searchHistory.value.pop()
    }
    persistHistory()
  }

  try {
    const res = await cardApi.searchCards({ keyword: term, page: 1, pageSize: 50 })
    if (res.code === 0 && res.data) {
      searchResults.value = res.data.list || []
    } else {
      searchResults.value = []
      showToast(res.msg || '搜索失败')
    }
  } catch (e) {
    console.error('搜索失败:', e)
    searchResults.value = []
    showToast('搜索失败，请稍后重试')
  } finally {
    isSearching.value = false
  }
}

function searchKeyword(word: string) {
  keyword.value = word
  doSearch()
}

function clearKeyword() {
  keyword.value = ''
  hasSearched.value = false
  searchResults.value = []
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
</script>

<style src="./search.scss" scoped lang="scss"></style>
