<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">我的收藏</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="hero-card">
      <view class="hero-glow hero-glow-left"></view>
      <view class="hero-glow hero-glow-right"></view>

      <view class="hero-badge">
        <image class="hero-badge-icon" src="/static/icons/line/heart.svg" mode="aspectFit" />
        <text class="hero-badge-text">学习收藏夹</text>
      </view>

        <view class="hero-main">
        <view class="hero-copy">
          <text class="hero-label">已收藏卡片</text>
          <text class="hero-value">{{ favoriteCount }}</text>
          <text class="hero-desc">把想反复学习的内容放在一起，回来就能继续看。</text>
        </view>

        <view class="hero-orbit">
          <view class="hero-orbit-ring"></view>
          <view class="hero-orbit-core">
            <image class="hero-orbit-icon" src="/static/icons/line/gift.svg" mode="aspectFit" />
          </view>
        </view>
      </view>

      <view class="hero-stats">
        <view v-for="item in summaryCards" :key="item.key" class="hero-stat" :class="item.tone">
          <text class="hero-stat-value">{{ item.value }}</text>
          <text class="hero-stat-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <view class="content-wrapper">
      <view class="section-head">
        <view class="section-title-wrap">
          <image class="section-title-icon" src="/static/icons/line/heart.svg" mode="aspectFit" />
          <view class="section-title-copy">
            <text class="section-title">收藏卡片</text>
            <text class="section-subtitle">{{ sectionHint }}</text>
          </view>
        </view>
      </view>

      <view v-if="isLoading && favorites.length === 0" class="skeleton-list">
        <view v-for="item in 3" :key="item" class="skeleton-card">
          <view class="skeleton-image"></view>
          <view class="skeleton-copy">
            <view class="skeleton-line skeleton-line-lg"></view>
            <view class="skeleton-line skeleton-line-sm"></view>
            <view class="skeleton-line skeleton-line-xs"></view>
          </view>
          <view class="skeleton-action"></view>
        </view>
      </view>

      <view v-else-if="favorites.length === 0" class="empty-state">
        <view class="empty-visual">
          <image class="empty-icon" src="/static/icons/line/heart.svg" mode="aspectFit" />
        </view>
        <text class="empty-title">收藏夹还是空的</text>
        <text class="empty-text">看到喜欢的卡片就点收藏，回来复习会方便很多。</text>
        <view class="empty-btn" @click="goHome">去发现更多</view>
      </view>

      <view v-else class="favorites-list">
        <view
          v-for="(item, index) in decoratedFavorites"
          :key="item._id"
          class="favorite-card"
          :class="item.tone"
          @click="openFavoriteDetail(item, index)"
        >
          <view class="favorite-media-wrap">
            <CardImage
              class="favorite-image"
              :src="item.image"
              :label="item.name"
              :category="item.categoryLabel"
              mode="aspectFill"
            />
            <view class="favorite-category-chip">{{ item.categoryLabel }}</view>
          </view>

          <view class="favorite-body">
            <view class="favorite-copy">
              <view class="favorite-topline">
                <text class="favorite-name">{{ item.name }}</text>
                <view class="favorite-remove" @click.stop="removeFavorite(item)">
                  <image class="favorite-remove-icon" src="/static/icons/line/heart.svg" mode="aspectFit" />
                </view>
              </view>

              <text class="favorite-subtitle">{{ item.detailLabel }}</text>

              <view class="favorite-meta">
                <text class="favorite-meta-item">{{ item.savedAtLabel || '刚刚收藏' }}</text>
                <text class="favorite-meta-dot"></text>
                <text class="favorite-meta-item">{{ item.savedRelativeLabel }}</text>
              </view>
            </view>

            <view class="favorite-footer">
              <text class="favorite-stats">{{ item.statsLabel }}</text>
              <view class="favorite-cta" @click.stop="openFavoriteDetail(item, index)">
                <text class="favorite-cta-text">继续学习</text>
                <image class="favorite-cta-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="isLoading && favorites.length > 0" class="loading-more">
        <text>正在加载更多收藏...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import CardImage from '@/components/CardImage/CardImage.vue'
import { useFavoritesPage } from './hooks/useFavoritesPage'

const {
  decoratedFavorites,
  favoriteCount,
  favorites,
  goBack,
  goHome,
  isLoading,
  openFavoriteDetail,
  removeFavorite,
  sectionHint,
  statusBarHeight,
  summaryCards,
} = useFavoritesPage()
</script>

<style src="./styles/favorites.scss" scoped lang="scss"></style>
