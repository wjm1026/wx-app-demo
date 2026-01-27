<template>
  <view class="page">
    <!-- 搜索头部 -->
    <view class="search-header">
      <view class="search-bar">
        <text class="search-icon">🔍</text>
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
          <text class="clear-icon">✕</text>
        </view>
      </view>
      <view class="cancel-btn" @click="goBack">
        <text class="cancel-text">取消</text>
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
        <text class="suggestion-icon">🔍</text>
        <text class="suggestion-text">{{ item }}</text>
        <text class="suggestion-arrow">↗</text>
      </view>
    </view>

    <!-- 热门搜索 (无输入时显示) -->
    <view v-if="!keyword && !hasSearched" class="hot-section">
      <view class="section-header">
        <text class="section-icon">🔥</text>
        <text class="section-title">热门搜索</text>
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

      <!-- 搜索历史 -->
      <view v-if="searchHistory.length > 0" class="history-section">
        <view class="section-header">
          <view class="header-left">
            <text class="section-icon">🕐</text>
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
        <text class="empty-icon">🔍</text>
        <text class="empty-question">❓</text>
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
        <text class="results-count">找到 {{ searchResults.length }} 个结果</text>
        <view class="filter-btn">
          <text class="filter-icon">📋</text>
          <text class="filter-text">筛选</text>
        </view>
      </view>
      
      <view class="results-grid">
        <view 
          v-for="(item, index) in searchResults" 
          :key="item.id" 
          class="result-card"
          :class="'delay-' + index"
          @click="goCardDetail(item.id)"
        >
          <view class="card-image-wrapper">
            <image class="card-image" :src="item.image" mode="aspectFill" />
            <view class="card-category" :style="{ backgroundColor: item.categoryColor }">
              {{ item.category }}
            </view>
          </view>
          <view class="card-content">
            <text class="card-name">{{ item.name }}</text>
            <view class="card-meta">
              <text class="meta-icon">👀</text>
              <text class="meta-value">{{ item.views }}</text>
            </view>
          </view>
        </view>
      </view>
      
      <view class="results-footer">
        <text class="footer-text">— 已显示全部结果 —</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo, navigateBack, showToast } from '@/utils'

const keyword = ref('')
const hasSearched = ref(false)
const searchResults = ref<any[]>([])
const searchHistory = ref<string[]>(['老虎', '苹果', '汽车'])

const hotKeywords = ref(['老虎', '苹果', '汽车', '香蕉', '狮子', '飞机', '西瓜', '熊猫', '大象', '火车'])
const emptySuggestions = ref(['动物', '水果', '交通工具'])

const suggestions = computed(() => {
  if (!keyword.value.trim()) return []
  const allWords = ['老虎', '狮子', '苹果', '香蕉', '汽车', '飞机', '熊猫', '大象', '西瓜', '火车']
  return allWords.filter(w => w.includes(keyword.value)).slice(0, 5)
})

function onInput() {
  hasSearched.value = false
}

function doSearch() {
  if (!keyword.value.trim()) return
  
  hasSearched.value = true
  
  // 添加到搜索历史
  if (!searchHistory.value.includes(keyword.value)) {
    searchHistory.value.unshift(keyword.value)
    if (searchHistory.value.length > 10) {
      searchHistory.value.pop()
    }
  }
  
  const allCards = [
    { id: '1', name: '老虎', category: '动物', categoryColor: 'rgba(255, 159, 127, 0.9)', image: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=400', views: 1234 },
    { id: '2', name: '狮子', category: '动物', categoryColor: 'rgba(255, 159, 127, 0.9)', image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=400', views: 856 },
    { id: '3', name: '苹果', category: '水果', categoryColor: 'rgba(126, 211, 33, 0.9)', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400', views: 2341 },
    { id: '4', name: '香蕉', category: '水果', categoryColor: 'rgba(126, 211, 33, 0.9)', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', views: 1567 },
    { id: '5', name: '汽车', category: '交通', categoryColor: 'rgba(96, 165, 250, 0.9)', image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400', views: 987 },
    { id: '6', name: '飞机', category: '交通', categoryColor: 'rgba(96, 165, 250, 0.9)', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400', views: 654 }
  ]
  
  searchResults.value = allCards.filter(card => 
    card.name.includes(keyword.value) || card.category.includes(keyword.value)
  )
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
  showToast('已清空搜索历史')
}

function goBack() {
  navigateBack()
}

function goCardDetail(id: string) {
  navigateTo(`/pages/card/detail?id=${id}`)
}
</script>

<style scoped lang="scss">
@import '@/styles/design-system.scss';

.page {
  min-height: 100vh;
  background-color: $color-bg-primary;
}

// 搜索头部
.search-header {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-4;
  background-color: $color-bg-card;
  box-shadow: $shadow-sm;
  position: sticky;
  top: 0;
  z-index: $z-sticky;
}

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  height: 88rpx;
  background-color: $color-bg-secondary;
  border-radius: $radius-full;
  padding: 0 $spacing-4;
  transition: box-shadow $duration-fast $ease-out;
  
  &:focus-within {
    box-shadow: 0 0 0 4rpx rgba($color-primary, 0.15);
  }
}

.search-icon {
  font-size: 36rpx;
  margin-right: $spacing-2;
}

.search-input {
  flex: 1;
  height: 100%;
  font-size: $font-size-base;
  color: $color-text-primary;
}

.placeholder {
  color: $color-text-placeholder;
}

.clear-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $color-text-tertiary;
  border-radius: $radius-full;
  transition: transform $duration-fast $ease-bounce;
  
  &:active {
    transform: scale(0.9);
  }
}

.clear-icon {
  font-size: 24rpx;
  color: $color-text-inverse;
}

.cancel-btn {
  padding: $spacing-2 $spacing-3;
  transition: opacity $duration-fast $ease-out;
  
  &:active {
    opacity: 0.7;
  }
}

.cancel-text {
  font-size: $font-size-base;
  color: $color-primary;
  font-weight: $font-weight-medium;
}

// 搜索建议
.suggestions {
  background-color: $color-bg-card;
  border-radius: 0 0 $radius-lg $radius-lg;
  margin: 0 $spacing-4 $spacing-4;
  box-shadow: $shadow-md;
  overflow: hidden;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: $spacing-4;
  border-bottom: 2rpx solid $color-border;
  transition: background-color $duration-fast $ease-out;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:active {
    background-color: $color-bg-secondary;
  }
}

.suggestion-icon {
  font-size: 28rpx;
  margin-right: $spacing-3;
  opacity: 0.5;
}

.suggestion-text {
  flex: 1;
  font-size: $font-size-base;
  color: $color-text-primary;
}

.suggestion-arrow {
  font-size: 28rpx;
  color: $color-text-tertiary;
}

// 热门搜索
.hot-section {
  padding: $spacing-4;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-4;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $spacing-2;
}

.section-icon {
  font-size: 36rpx;
}

.section-title {
  font-size: $font-size-md;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-3;
}

.hot-tag {
  display: flex;
  align-items: center;
  gap: $spacing-1;
  padding: $spacing-2 $spacing-4;
  background-color: $color-bg-card;
  border-radius: $radius-full;
  box-shadow: $shadow-sm;
  transition: transform $duration-fast $ease-bounce;
  
  &:active {
    transform: scale(0.95);
  }
  
  &.color-0 { background: linear-gradient(135deg, rgba(255, 107, 107, 0.15), rgba(255, 107, 107, 0.05)); }
  &.color-1 { background: linear-gradient(135deg, rgba(78, 205, 196, 0.15), rgba(78, 205, 196, 0.05)); }
  &.color-2 { background: linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(167, 139, 250, 0.05)); }
  &.color-3 { background: linear-gradient(135deg, rgba(255, 169, 77, 0.15), rgba(255, 169, 77, 0.05)); }
  &.color-4 { background: linear-gradient(135deg, rgba(96, 165, 250, 0.15), rgba(96, 165, 250, 0.05)); }
}

.tag-rank {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $gradient-primary;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
}

.tag-text {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

// 搜索历史
.history-section {
  margin-top: $spacing-6;
}

.clear-history {
  padding: $spacing-1 $spacing-3;
  
  &:active {
    opacity: 0.7;
  }
}

.clear-text {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-2;
}

.history-tag {
  padding: $spacing-2 $spacing-4;
  background-color: $color-bg-card;
  border-radius: $radius-full;
  font-size: $font-size-sm;
  color: $color-text-secondary;
  box-shadow: $shadow-sm;
  transition: transform $duration-fast $ease-bounce;
  
  &:active {
    transform: scale(0.95);
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-16 $spacing-4;
}

.empty-illustration {
  position: relative;
  margin-bottom: $spacing-5;
}

.empty-icon {
  font-size: 120rpx;
}

.empty-question {
  position: absolute;
  top: -20rpx;
  right: -20rpx;
  font-size: 48rpx;
  animation: float 2s ease-in-out infinite;
}

.empty-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: $spacing-2;
}

.empty-subtitle {
  font-size: $font-size-base;
  color: $color-text-tertiary;
  margin-bottom: $spacing-6;
}

.empty-suggestions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-3;
}

.suggestion-label {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.suggestion-tags {
  display: flex;
  gap: $spacing-3;
}

.suggestion-tag {
  padding: $spacing-2 $spacing-5;
  background: $gradient-primary;
  border-radius: $radius-full;
  font-size: $font-size-sm;
  color: $color-text-inverse;
  font-weight: $font-weight-medium;
  box-shadow: $shadow-colored;
  transition: transform $duration-fast $ease-bounce;
  
  &:active {
    transform: scale(0.95);
  }
}

// 搜索结果
.results-scroll {
  height: calc(100vh - 140rpx);
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-4;
}

.results-count {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: $spacing-1;
  padding: $spacing-2 $spacing-3;
  background-color: $color-bg-card;
  border-radius: $radius-full;
  box-shadow: $shadow-sm;
  
  &:active {
    opacity: 0.8;
  }
}

.filter-icon {
  font-size: 24rpx;
}

.filter-text {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.results-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-4;
  padding: 0 $spacing-4;
}

.result-card {
  width: calc(50% - #{$spacing-4 * 0.5});
  background-color: $color-bg-card;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-md;
  transition: transform $duration-normal $ease-bounce;
  
  &:active {
    transform: scale(0.97);
  }
  
  @for $i from 0 through 5 {
    &.delay-#{$i} {
      animation: bounce-in 0.4s $ease-bounce backwards;
      animation-delay: #{$i * 0.05}s;
    }
  }
}

.card-image-wrapper {
  position: relative;
  width: 100%;
  height: 240rpx;
}

.card-image {
  width: 100%;
  height: 100%;
}

.card-category {
  position: absolute;
  top: $spacing-2;
  left: $spacing-2;
  padding: 4rpx 16rpx;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  color: $color-text-inverse;
  font-weight: $font-weight-medium;
}

.card-content {
  padding: $spacing-3;
}

.card-name {
  display: block;
  font-size: $font-size-md;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: $spacing-1;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.meta-icon {
  font-size: 24rpx;
}

.meta-value {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.results-footer {
  padding: $spacing-8;
  text-align: center;
}

.footer-text {
  font-size: $font-size-sm;
  color: $color-text-placeholder;
}
</style>
