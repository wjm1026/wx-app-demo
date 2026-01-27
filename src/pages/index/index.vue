<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-logo">
          <text class="logo-icon">🐣</text>
          <text class="nav-title">宝宝识物</text>
        </view>
        <view class="nav-actions">
          <view class="nav-btn" @click="goSearch">
            <text class="nav-icon">🔍</text>
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="main-scroll" :style="{ paddingTop: navBarHeight + 'px' }">
      <!-- 欢迎横幅 -->
      <view class="welcome-banner">
        <view class="welcome-content">
          <view class="welcome-text">
            <text class="welcome-greeting">👋 嗨，小朋友！</text>
            <text class="welcome-message">今天想认识什么新朋友？</text>
          </view>
          <view class="welcome-decoration">
            <text class="deco-emoji bounce-1">🦁</text>
            <text class="deco-emoji bounce-2">🍎</text>
            <text class="deco-emoji bounce-3">🚗</text>
          </view>
        </view>
      </view>

      <!-- 搜索入口 -->
      <view class="search-entry" @click="goSearch">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <text class="search-placeholder">搜索动物、水果、交通工具...</text>
        </view>
      </view>

      <!-- 分类探索 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">🎨</text>
            <text class="title-text">探索分类</text>
          </view>
          <view class="section-more" @click="goCategory">
            <text class="more-text">全部</text>
            <text class="more-arrow">→</text>
          </view>
        </view>
        <view class="category-grid">
          <view 
            v-for="(item, index) in categories" 
            :key="item.id" 
            class="category-card"
            :class="'delay-' + index"
            @click="goCategoryDetail(item.id)"
          >
            <view class="category-icon-wrapper" :style="{ background: item.gradient }">
              <text class="category-emoji">{{ item.icon }}</text>
            </view>
            <text class="category-name">{{ item.name }}</text>
            <text class="category-count">{{ item.count }}个</text>
          </view>
        </view>
      </view>

      <!-- 热门推荐 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">🔥</text>
            <text class="title-text">热门推荐</text>
          </view>
        </view>
        <scroll-view scroll-x class="hot-scroll" :show-scrollbar="false">
          <view class="hot-list">
            <view 
              v-for="card in hotCards" 
              :key="card.id" 
              class="hot-card"
              @click="goCardDetail(card.id)"
            >
              <view class="hot-image-wrapper">
                <image class="hot-image" :src="card.image" mode="aspectFill" />
                <view class="hot-badge">
                  <text class="badge-text">HOT</text>
                </view>
              </view>
              <view class="hot-info">
                <text class="hot-name">{{ card.name }}</text>
                <text class="hot-name-en">{{ card.nameEn }}</text>
              </view>
              <view class="hot-play-btn">
                <text class="play-icon">▶</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 最新上线 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">✨</text>
            <text class="title-text">最新上线</text>
          </view>
          <view class="section-more">
            <text class="more-text">更多</text>
            <text class="more-arrow">→</text>
          </view>
        </view>
        <view class="card-grid">
          <view 
            v-for="card in recentCards" 
            :key="card.id" 
            class="card-item"
            @click="goCardDetail(card.id)"
          >
            <view class="card-image-wrapper">
              <image class="card-image" :src="card.image" mode="aspectFill" />
              <view v-if="card.isNew" class="new-badge">NEW</view>
            </view>
            <view class="card-content">
              <text class="card-name">{{ card.name }}</text>
              <view class="card-footer">
                <view class="card-stat">
                  <text class="stat-icon">👀</text>
                  <text class="stat-value">{{ formatViews(card.views) }}</text>
                </view>
                <view class="card-tag" :style="{ backgroundColor: card.tagColor }">
                  {{ card.category }}
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 学习进度 -->
      <view class="progress-section">
        <view class="progress-card">
          <view class="progress-header">
            <text class="progress-title">📚 今日学习</text>
            <text class="progress-detail">查看详情 →</text>
          </view>
          <view class="progress-stats">
            <view class="stat-item">
              <text class="stat-number">{{ todayStats.learned }}</text>
              <text class="stat-label">已学习</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat-item">
              <text class="stat-number">{{ todayStats.streak }}</text>
              <text class="stat-label">连续天数</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat-item">
              <text class="stat-number">{{ todayStats.points }}</text>
              <text class="stat-label">获得积分</text>
            </view>
          </view>
          <view class="progress-bar-wrapper">
            <view class="progress-bar" :style="{ width: progressPercent + '%' }"></view>
          </view>
          <text class="progress-tip">再学习 {{ remainCards }} 个卡片完成今日目标 🎯</text>
        </view>
      </view>

      <view class="safe-bottom"></view>
    </scroll-view>
    <CustomTabbar :current="0" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getStatusBarHeight, getNavBarHeight, navigateTo } from '@/utils'
import CustomTabbar from '@/components/CustomTabbar/CustomTabbar.vue'

const statusBarHeight = ref(getStatusBarHeight())
const navBarHeight = ref(getNavBarHeight())

const categories = ref([
  { id: '1', name: '动物', icon: '🦁', count: 24, gradient: 'linear-gradient(135deg, #FF9F7F, #FFB347)' },
  { id: '2', name: '水果', icon: '🍎', count: 18, gradient: 'linear-gradient(135deg, #7ED321, #B4E33D)' },
  { id: '3', name: '蔬菜', icon: '🥕', count: 15, gradient: 'linear-gradient(135deg, #FFA94D, #FFD93D)' },
  { id: '4', name: '交通', icon: '🚗', count: 20, gradient: 'linear-gradient(135deg, #60A5FA, #A78BFA)' },
  { id: '5', name: '数字', icon: '🔢', count: 10, gradient: 'linear-gradient(135deg, #F472B6, #FF6B6B)' },
  { id: '6', name: '形状', icon: '⭐', count: 8, gradient: 'linear-gradient(135deg, #FFE66D, #FFA94D)' },
  { id: '7', name: '颜色', icon: '🌈', count: 12, gradient: 'linear-gradient(135deg, #4ECDC4, #60A5FA)' },
  { id: '8', name: '更多', icon: '📚', count: 50, gradient: 'linear-gradient(135deg, #9CA3AF, #6B7280)' }
])

const hotCards = ref([
  { id: '1', name: '老虎', nameEn: 'Tiger', image: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=400' },
  { id: '2', name: '狮子', nameEn: 'Lion', image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=400' },
  { id: '3', name: '大象', nameEn: 'Elephant', image: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=400' },
  { id: '4', name: '长颈鹿', nameEn: 'Giraffe', image: 'https://images.unsplash.com/photo-1547721064-da6cfb341d50?w=400' },
  { id: '5', name: '熊猫', nameEn: 'Panda', image: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400' }
])

const recentCards = ref([
  { id: '1', name: '苹果', category: '水果', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400', views: 1234, isNew: true, tagColor: 'rgba(126, 211, 33, 0.15)' },
  { id: '2', name: '香蕉', category: '水果', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', views: 856, isNew: true, tagColor: 'rgba(126, 211, 33, 0.15)' },
  { id: '3', name: '汽车', category: '交通', image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400', views: 2341, isNew: false, tagColor: 'rgba(96, 165, 250, 0.15)' },
  { id: '4', name: '飞机', category: '交通', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400', views: 1567, isNew: false, tagColor: 'rgba(96, 165, 250, 0.15)' },
  { id: '5', name: '火车', category: '交通', image: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400', views: 987, isNew: false, tagColor: 'rgba(96, 165, 250, 0.15)' },
  { id: '6', name: '西瓜', category: '水果', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400', views: 654, isNew: true, tagColor: 'rgba(126, 211, 33, 0.15)' }
])

const todayStats = ref({
  learned: 5,
  streak: 3,
  points: 25
})

const dailyGoal = 10
const remainCards = computed(() => Math.max(0, dailyGoal - todayStats.value.learned))
const progressPercent = computed(() => Math.min(100, (todayStats.value.learned / dailyGoal) * 100))

function formatViews(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

function goSearch() {
  navigateTo('/pages/search/search')
}

function goCategory() {
  uni.switchTab({ url: '/pages/category/category' })
}

function goCategoryDetail(id: string) {
  navigateTo(`/pages/category/category?id=${id}`)
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

// 导航栏
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: $z-fixed;
  background: $gradient-primary;
  border-radius: 0 0 $radius-xl $radius-xl;
  box-shadow: 0 8rpx 32rpx rgba(255, 107, 107, 0.3);
}

.nav-content {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-4;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: $spacing-2;
}

.logo-icon {
  font-size: 48rpx;
  animation: float 3s ease-in-out infinite;
}

.nav-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
  letter-spacing: 2rpx;
}

.nav-actions {
  display: flex;
  gap: $spacing-2;
}

.nav-btn {
  @include icon-button;
  background-color: rgba(255, 255, 255, 0.25);
  
  &:active {
    background-color: rgba(255, 255, 255, 0.35);
  }
}

.nav-icon {
  font-size: 40rpx;
}

.main-scroll {
  height: 100vh;
}

// 欢迎横幅
.welcome-banner {
  margin: $spacing-4;
  padding: $spacing-5;
  background: linear-gradient(135deg, #FFF5EB, #FFE4D6);
  border-radius: $radius-xl;
  box-shadow: $shadow-md;
  overflow: hidden;
}

.welcome-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.welcome-text {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;
}

.welcome-greeting {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.welcome-message {
  font-size: $font-size-base;
  color: $color-text-secondary;
}

.welcome-decoration {
  display: flex;
  gap: $spacing-1;
}

.deco-emoji {
  font-size: 44rpx;
  animation: float 2s ease-in-out infinite;
  
  &.bounce-1 { animation-delay: 0s; }
  &.bounce-2 { animation-delay: 0.3s; }
  &.bounce-3 { animation-delay: 0.6s; }
}

// 搜索入口
.search-entry {
  padding: 0 $spacing-4;
  margin-bottom: $spacing-4;
}

.search-box {
  display: flex;
  align-items: center;
  height: 96rpx;
  background-color: $color-bg-card;
  border-radius: $radius-full;
  padding: 0 $spacing-5;
  box-shadow: $shadow-md;
  transition: transform $duration-normal $ease-bounce,
              box-shadow $duration-normal $ease-out;
  
  &:active {
    transform: scale(0.98);
    box-shadow: $shadow-sm;
  }
}

.search-icon {
  font-size: 36rpx;
  margin-right: $spacing-3;
}

.search-placeholder {
  font-size: $font-size-base;
  color: $color-text-placeholder;
}

// 区块样式
.section {
  padding: 0 $spacing-4;
  margin-bottom: $spacing-6;
}

.section-header {
  @include section-header;
}

.section-title {
  display: flex;
  align-items: center;
  gap: $spacing-2;
}

.title-icon {
  font-size: 40rpx;
}

.title-text {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.section-more {
  display: flex;
  align-items: center;
  gap: $spacing-1;
  padding: $spacing-2 $spacing-3;
  background-color: rgba($color-primary, 0.1);
  border-radius: $radius-full;
  transition: background-color $duration-fast $ease-out;
  
  &:active {
    background-color: rgba($color-primary, 0.2);
  }
}

.more-text {
  font-size: $font-size-sm;
  color: $color-primary;
  font-weight: $font-weight-medium;
}

.more-arrow {
  font-size: $font-size-sm;
  color: $color-primary;
}

// 分类网格
.category-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-3;
}

.category-card {
  width: calc(25% - #{$spacing-3 * 0.75});
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-3 0;
  transition: transform $duration-normal $ease-bounce;
  
  &:active {
    transform: scale(0.92);
  }
  
  @for $i from 0 through 7 {
    &.delay-#{$i} {
      animation: bounce-in 0.5s $ease-bounce backwards;
      animation-delay: #{$i * 0.05}s;
    }
  }
}

.category-icon-wrapper {
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-xl;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $spacing-2;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.12);
  transition: transform $duration-normal $ease-bounce;
}

.category-card:active .category-icon-wrapper {
  transform: rotate(-5deg) scale(1.05);
}

.category-emoji {
  font-size: 52rpx;
}

.category-name {
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: 4rpx;
}

.category-count {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

// 热门推荐滚动
.hot-scroll {
  margin: 0 #{-$spacing-4};
  padding: 0 $spacing-4;
  white-space: nowrap;
}

.hot-list {
  display: inline-flex;
  gap: $spacing-4;
  padding: $spacing-2 0;
}

.hot-card {
  position: relative;
  width: 300rpx;
  background-color: $color-bg-card;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-md;
  transition: transform $duration-normal $ease-bounce,
              box-shadow $duration-normal $ease-out;
  
  &:active {
    transform: scale(0.97) translateY(4rpx);
    box-shadow: $shadow-sm;
  }
}

.hot-image-wrapper {
  position: relative;
  width: 100%;
  height: 220rpx;
}

.hot-image {
  width: 100%;
  height: 100%;
}

.hot-badge {
  position: absolute;
  top: $spacing-2;
  left: $spacing-2;
  padding: 6rpx 16rpx;
  background: $gradient-sunset;
  border-radius: $radius-full;
  box-shadow: 0 4rpx 12rpx rgba(255, 107, 107, 0.4);
}

.badge-text {
  font-size: 20rpx;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
  letter-spacing: 1rpx;
}

.hot-info {
  padding: $spacing-3;
}

.hot-name {
  display: block;
  font-size: $font-size-md;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.hot-name-en {
  display: block;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-top: 4rpx;
}

.hot-play-btn {
  position: absolute;
  right: $spacing-3;
  bottom: $spacing-3;
  width: 64rpx;
  height: 64rpx;
  background: $gradient-primary;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-colored;
  transition: transform $duration-fast $ease-bounce;
  
  &:active {
    transform: scale(0.9);
  }
}

.play-icon {
  font-size: 24rpx;
  color: $color-text-inverse;
  margin-left: 4rpx;
}

// 卡片网格
.card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-4;
}

.card-item {
  width: calc(50% - #{$spacing-4 * 0.5});
  background-color: $color-bg-card;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-md;
  transition: transform $duration-normal $ease-bounce,
              box-shadow $duration-normal $ease-out;
  
  &:active {
    transform: scale(0.97);
    box-shadow: $shadow-sm;
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

.new-badge {
  position: absolute;
  top: $spacing-2;
  right: $spacing-2;
  padding: 6rpx 16rpx;
  background: $gradient-forest;
  border-radius: $radius-full;
  font-size: 18rpx;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
  box-shadow: 0 4rpx 12rpx rgba(52, 211, 153, 0.4);
}

.card-content {
  padding: $spacing-3;
}

.card-name {
  display: block;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: $spacing-2;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-stat {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.stat-icon {
  font-size: 24rpx;
}

.stat-value {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.card-tag {
  padding: 4rpx 12rpx;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  color: $color-text-secondary;
  font-weight: $font-weight-medium;
}

// 学习进度
.progress-section {
  padding: 0 $spacing-4;
  margin-bottom: $spacing-6;
}

.progress-card {
  background: linear-gradient(135deg, $color-secondary, $color-secondary-light);
  border-radius: $radius-xl;
  padding: $spacing-5;
  box-shadow: 0 12rpx 32rpx rgba(78, 205, 196, 0.3);
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-4;
}

.progress-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
}

.progress-detail {
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.8);
}

.progress-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-bottom: $spacing-4;
  padding: $spacing-4;
  background: rgba(255, 255, 255, 0.15);
  border-radius: $radius-lg;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
}

.stat-label {
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4rpx;
}

.stat-divider {
  width: 2rpx;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.25);
}

.progress-bar-wrapper {
  height: 16rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: $radius-full;
  overflow: hidden;
  margin-bottom: $spacing-3;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #FFE66D, #FFA94D);
  border-radius: $radius-full;
  transition: width 0.5s $ease-out;
}

.progress-tip {
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
}

.safe-bottom {
  height: 180rpx;
}
</style>
