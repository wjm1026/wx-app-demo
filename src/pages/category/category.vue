<template>
  <view class="page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">🎨 分类探索</text>
      <text class="page-subtitle">选择一个分类开始学习吧！</text>
    </view>

    <!-- 分类列表 -->
    <view v-if="!isInitialLoading" class="category-list">
      <view 
        v-for="(item, index) in categories" 
        :key="item._id" 
        class="category-section"
        :class="'delay-' + index"
      >
        <view class="category-header" @click="toggleExpand(item._id)">
          <view class="category-left">
            <view class="category-icon" :style="{ background: item.gradient }">
              <text class="category-emoji">{{ item.icon }}</text>
            </view>
            <view class="category-info">
              <text class="category-name">{{ item.name }}</text>
              <text class="category-count">{{ item.count }}个卡片</text>
            </view>
          </view>
          <view class="expand-btn" :class="{ expanded: expandedIds.includes(item._id) }">
            <text class="expand-icon">▼</text>
          </view>
        </view>
        
        <!-- 展开的卡片列表 -->
        <view v-if="expandedIds.includes(item._id)" class="card-grid">
          <view 
            v-for="card in item.cards" 
            :key="card._id" 
            class="card-item"
            @click="goCardDetail(card._id)"
          >
            <view class="card-image-wrapper">
              <image class="card-image" :src="card.image" mode="aspectFill" />
            </view>
            <text class="card-name">{{ card.name }}</text>
          </view>
          
          <!-- 加载更多 -->
          <view v-if="item.cards.length > 0 && item.hasMore" class="load-more" @click="loadMore(item._id)">
            <text class="load-more-icon">+</text>
            <text class="load-more-text">更多</text>
          </view>
        </view>
        
        <!-- 空状态 -->
        <view v-if="expandedIds.includes(item._id) && item.cards.length === 0 && !item.isLoading" class="empty-state">
          <text class="empty-icon">📭</text>
          <text class="empty-text">暂无卡片</text>
        </view>
        
        <!-- 加载中状态 -->
        <view v-if="item.isLoading" class="item-loading">
          <text class="loading-dot">. . .</text>
        </view>
      </view>
    </view>

    <!-- 底部安全区 -->
    <view class="safe-bottom"></view>
    <CustomTabbar :current="1" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { navigateTo, showToast } from '@/utils'
import CustomTabbar from '@/components/CustomTabbar/CustomTabbar.vue'
import { cardApi, type Category, type Card } from '@/api'

interface CategoryWithCards extends Category {
  cards: Card[]
  page: number
  hasMore: boolean
  isLoading: boolean
}

const categories = ref<CategoryWithCards[]>([])
const expandedIds = ref<string[]>([])
const isInitialLoading = ref(true)

onShow(async () => {
  await loadCategories()
  
  try {
    const targetId = uni.getStorageSync('TARGET_CATEGORY_ID')
    if (targetId) {
      if (!expandedIds.value.includes(targetId)) {
        toggleExpand(targetId)
      }
      uni.removeStorageSync('TARGET_CATEGORY_ID')
    }
  } catch (e) {
    console.error('读取分类参数失败', e)
  }
})

async function loadCategories() {
  isInitialLoading.value = true
  try {
    const res = await cardApi.getCategories()
    if (res.code === 0 && res.data) {
      // 保持之前的展开状态和已加载的卡片
      const oldCategories = categories.value
      categories.value = res.data.map(cat => {
        const oldCat = oldCategories.find(oc => oc._id === cat._id)
        return {
          ...cat,
          cards: oldCat ? oldCat.cards : [],
          page: oldCat ? oldCat.page : 1,
          hasMore: oldCat ? oldCat.hasMore : true,
          isLoading: false
        }
      })
      
      // 默认展开第一个（如果是第一次加载）
      if (expandedIds.value.length === 0 && categories.value.length > 0) {
        toggleExpand(categories.value[0]._id)
      }
    }
  } catch (e) {
    console.error('加载分类失败:', e)
  } finally {
    isInitialLoading.value = false
  }
}

async function loadCards(categoryId: string) {
  const category = categories.value.find(c => c._id === categoryId)
  if (!category || category.isLoading || !category.hasMore) return

  category.isLoading = true
  try {
    const res = await cardApi.getCardsByCategory({
      categoryId,
      page: category.page,
      pageSize: 12
    })
    
    if (res.code === 0 && res.data) {
      if (category.page === 1) {
        category.cards = res.data.list
      } else {
        category.cards = [...category.cards, ...res.data.list]
      }
      
      category.hasMore = category.cards.length < res.data.total
      category.page++
    }
  } catch (e) {
    console.error('加载卡片失败:', e)
  } finally {
    category.isLoading = false
  }
}

function toggleExpand(id: string) {
  const index = expandedIds.value.indexOf(id)
  if (index > -1) {
    expandedIds.value.splice(index, 1)
  } else {
    expandedIds.value.push(id)
    // 展开时如果没数据则加载
    const category = categories.value.find(c => c._id === id)
    if (category && category.cards.length === 0) {
      loadCards(id)
    }
  }
}

function goCardDetail(id: string) {
  navigateTo(`/pages/card/detail?id=${id}`)
}

function loadMore(categoryId: string) {
  loadCards(categoryId)
}
</script>

<style scoped lang="scss">
@import '@/styles/design-system.scss';

.page {
  min-height: 100vh;
  background-color: $color-bg-primary;
  padding-bottom: env(safe-area-inset-bottom);
}

// 页面标题
.page-header {
  padding: $spacing-6 $spacing-4 $spacing-4;
  background: $gradient-primary;
  border-radius: 0 0 $radius-xl $radius-xl;
  margin-bottom: $spacing-4;
}

.page-title {
  display: block;
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
  margin-bottom: $spacing-1;
}

.page-subtitle {
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.85);
}

// 分类列表
.category-list {
  padding: 0 $spacing-4;
}

.category-section {
  background-color: $color-bg-card;
  border-radius: $radius-lg;
  margin-bottom: $spacing-4;
  overflow: hidden;
  box-shadow: $shadow-md;
  
  @for $i from 0 through 6 {
    &.delay-#{$i} {
      animation: bounce-in 0.5s $ease-bounce backwards;
      animation-delay: #{$i * 0.08}s;
    }
  }
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-4;
  transition: background-color $duration-fast $ease-out;
  
  &:active {
    background-color: $color-bg-secondary;
  }
}

.category-left {
  display: flex;
  align-items: center;
  gap: $spacing-4;
}

.category-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: $radius-xl;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.12);
  transition: transform $duration-normal $ease-bounce;
}

.category-header:active .category-icon {
  transform: scale(1.05) rotate(-3deg);
}

.category-emoji {
  font-size: 48rpx;
}

.category-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.category-name {
  font-size: $font-size-md;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.category-count {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.expand-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $color-bg-secondary;
  border-radius: $radius-full;
  transition: transform $duration-normal $ease-bounce,
              background-color $duration-fast $ease-out;
  
  &.expanded {
    transform: rotate(180deg);
    background-color: rgba($color-primary, 0.15);
    
    .expand-icon {
      color: $color-primary;
    }
  }
}

.expand-icon {
  font-size: 24rpx;
  color: $color-text-tertiary;
  transition: color $duration-fast $ease-out;
}

// 卡片网格
.card-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 $spacing-4 $spacing-4;
  gap: $spacing-3;
  animation: bounce-in 0.4s $ease-bounce;
}

.card-item {
  width: calc(25% - #{$spacing-3 * 0.75});
  text-align: center;
  transition: transform $duration-normal $ease-bounce;
  
  &:active {
    transform: scale(0.92);
  }
}

.card-image-wrapper {
  width: 100%;
  aspect-ratio: 1;
  border-radius: $radius-md;
  overflow: hidden;
  box-shadow: $shadow-sm;
  margin-bottom: $spacing-2;
}

.card-image {
  width: 100%;
  height: 100%;
}

.card-name {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

// 加载更多
.load-more {
  width: calc(25% - #{$spacing-3 * 0.75});
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $color-bg-secondary, #F0EBE3);
  border-radius: $radius-md;
  border: 3rpx dashed $color-border;
  transition: transform $duration-fast $ease-bounce,
              background-color $duration-fast $ease-out;
  
  &:active {
    transform: scale(0.95);
    background-color: $color-bg-secondary;
  }
}

.load-more-icon {
  font-size: 40rpx;
  color: $color-text-tertiary;
  font-weight: $font-weight-bold;
}

.load-more-text {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-top: 4rpx;
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-8;
  animation: bounce-in 0.4s $ease-bounce;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: $spacing-2;
}

.empty-text {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.safe-bottom {
  height: 120rpx;
}
</style>
