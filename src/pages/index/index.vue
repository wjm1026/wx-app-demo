<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content" :style="navContentStyle">
        <view class="nav-logo" :style="navLogoStyle">
          <text class="logo-icon">🐣</text>
          <text class="nav-title">宝宝识物</text>
        </view>
      </view>
    </view>

    <view class="main-scroll" :style="mainScrollStyle">
      <view v-if="!isInitialLoading" class="merged-category-list">
        <view
          v-for="(item, index) in categories"
          :key="item._id"
          class="merged-category-section"
          :class="'delay-' + index"
        >
          <view class="merged-category-header" @click="toggleExpand(item._id)">
            <view class="merged-category-left">
              <view class="merged-category-icon" :style="{ background: item.gradient }">
                <image
                  v-if="isImageIcon(item.icon)"
                  class="merged-category-icon-image"
                  :src="item.icon"
                  mode="aspectFill"
                />
                <text v-else class="merged-category-emoji">{{ item.icon }}</text>
              </view>
              <view class="merged-category-info">
                <text class="merged-category-name">{{ item.name }}</text>
                <text class="merged-category-count">{{ item.card_count || 0 }}个卡片</text>
              </view>
            </view>
            <view class="merged-expand-btn" :class="{ expanded: expandedIds.includes(item._id) }">
              <text class="merged-expand-icon">▼</text>
            </view>
          </view>

          <view v-if="expandedIds.includes(item._id)" class="merged-card-grid">
            <template v-if="item.cards.length > 0">
              <view
                v-for="card in item.cards"
                :key="card._id"
                class="merged-card-item"
              >
                <view class="merged-card-image-wrapper">
                  <CardImage
                    class="merged-card-image"
                    :src="card.image"
                    :label="card.name"
                    :category="item.name"
                    mode="aspectFill"
                  />
                </view>
                <text class="merged-card-name">{{ card.name }}</text>
              </view>

              <view
                v-if="!item.isLoading && item.hasMore"
                class="merged-load-more"
                @click="loadMore(item._id)"
              >
                <text class="merged-load-more-icon">+</text>
                <text class="merged-load-more-text">更多</text>
              </view>

              <view v-if="item.isLoading" class="merged-load-state-inline">
                <view class="merged-loading-spinner"></view>
                <text class="merged-load-state-text">正在加载更多</text>
              </view>
            </template>

            <template v-else-if="item.isLoading">
              <view
                v-for="n in 4"
                :key="`loading-${item._id}-${n}`"
                class="merged-card-item merged-skeleton-card"
              >
                <view class="merged-card-image-wrapper merged-skeleton-shimmer"></view>
                <text class="merged-card-name merged-skeleton-text merged-skeleton-shimmer"></text>
              </view>
            </template>
          </view>

          <view
            v-if="expandedIds.includes(item._id) && item.cards.length === 0 && !item.isLoading"
            class="merged-empty-state"
          >
            <text class="merged-empty-icon">📭</text>
            <text class="merged-empty-text">暂无卡片</text>
          </view>
        </view>
      </view>

      <view v-else class="merged-category-list">
        <view v-for="n in 3" :key="n" class="merged-category-section merged-skeleton-section">
          <view class="merged-category-header">
            <view class="merged-category-left">
              <view class="merged-category-icon"></view>
              <view class="merged-category-info">
                <text class="merged-category-name">加载中...</text>
                <text class="merged-category-count">请稍候</text>
              </view>
            </view>
            <view class="merged-expand-btn">
              <text class="merged-expand-icon">▼</text>
            </view>
          </view>
        </view>
      </view>

      <view class="safe-bottom" :style="safeBottomStyle"></view>
    </view>

    <CustomTabbar :current="0" :reserve-space="false" />
  </view>
</template>

<script setup lang="ts">
import CardImage from '@/components/CardImage/CardImage.vue'
import CustomTabbar from '@/components/CustomTabbar/CustomTabbar.vue'
import { useIndexPage } from './hooks/useIndexPage'

const {
  categories,
  expandedIds,
  isImageIcon,
  isInitialLoading,
  loadMore,
  mainScrollStyle,
  navContentStyle,
  navLogoStyle,
  safeBottomStyle,
  statusBarHeight,
  toggleExpand,
} = useIndexPage()
</script>

<style src="./styles/index.scss" scoped lang="scss"></style>
