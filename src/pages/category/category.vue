<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <text class="nav-title">分类</text>
      </view>
    </view>

    <scroll-view :scroll-y="enableScroll" class="page-content" :style="contentScrollStyle">
      <view class="page-content-inner">
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
                <image
                  v-if="isImageIcon(item.icon)"
                  class="category-icon-image"
                  :src="item.icon"
                  mode="aspectFill"
                />
                <text v-else class="category-emoji">{{ item.icon }}</text>
              </view>
              <view class="category-info">
                <text class="category-name">{{ item.name }}</text>
                <text class="category-count">{{ item.card_count || 0 }}个卡片</text>
              </view>
            </view>
            <view class="expand-btn" :class="{ expanded: expandedIds.includes(item._id) }">
              <text class="expand-icon">▼</text>
            </view>
          </view>
          
          <!-- 展开的卡片列表 -->
          <view v-if="expandedIds.includes(item._id)" class="card-grid">
            <template v-if="item.cards.length > 0">
              <view 
                v-for="card in item.cards" 
                :key="card._id" 
                class="card-item"
                @click="goCardDetail(card._id)"
              >
                <view class="card-image-wrapper">
                  <CardImage
                    class="card-image"
                    :src="card.image"
                    :label="card.name"
                    :category="item.name"
                    mode="aspectFill"
                  />
                </view>
                <text class="card-name">{{ card.name }}</text>
              </view>
              
              <!-- 加载更多 -->
              <view v-if="!item.isLoading && item.hasMore" class="load-more" @click="loadMore(item._id)">
                <text class="load-more-icon">+</text>
                <text class="load-more-text">更多</text>
              </view>

              <!-- 分页加载中 -->
              <view v-if="item.isLoading" class="load-state-inline">
                <view class="loading-spinner"></view>
                <text class="load-state-text">正在加载更多</text>
              </view>
            </template>

            <!-- 首次加载骨架屏 -->
            <template v-else-if="item.isLoading">
              <view
                v-for="n in 4"
                :key="`loading-${item._id}-${n}`"
                class="card-item skeleton-card"
              >
                <view class="card-image-wrapper skeleton-shimmer"></view>
                <text class="card-name skeleton-text skeleton-shimmer"></text>
              </view>
            </template>
          </view>
          
          <!-- 空状态 -->
          <view v-if="expandedIds.includes(item._id) && item.cards.length === 0 && !item.isLoading" class="empty-state">
            <text class="empty-icon">📭</text>
            <text class="empty-text">暂无卡片</text>
          </view>
        </view>
      </view>

      <!-- 加载占位 -->
      <view v-else class="category-list">
        <view class="category-section skeleton" v-for="n in 3" :key="n">
          <view class="category-header">
            <view class="category-left">
              <view class="category-icon"></view>
              <view class="category-info">
                <text class="category-name">加载中...</text>
                <text class="category-count">请稍候</text>
              </view>
            </view>
            <view class="expand-btn">
              <text class="expand-icon">▼</text>
            </view>
          </view>
        </view>
      </view>

      </view>
      <!-- 底部安全区 -->
      <view class="safe-bottom" :style="safeBottomStyle"></view>
    </scroll-view>
    <CustomTabbar :current="1" :reserve-space="false" />
  </view>
</template>

<script setup lang="ts">
import CardImage from '@/components/CardImage/CardImage.vue'
import CustomTabbar from '@/components/CustomTabbar/CustomTabbar.vue'
import { useCategoryPage } from './hooks/useCategoryPage'

const {
  categories,
  contentScrollStyle,
  enableScroll,
  expandedIds,
  goCardDetail,
  isInitialLoading,
  isImageIcon,
  loadMore,
  safeBottomStyle,
  statusBarHeight,
  toggleExpand,
} = useCategoryPage()
</script>

<style src="./styles/category.scss" scoped lang="scss"></style>
