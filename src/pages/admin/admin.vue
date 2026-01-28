<template>
  <view class="page">
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-decoration">
        <text class="deco-star d1">⚙️</text>
        <text class="deco-star d2">📊</text>
        <text class="deco-star d3">👥</text>
      </view>
      
      <view class="header-content">
        <text class="header-title">管理后台</text>
        <text class="header-subtitle">宝宝识物 · 数据管理中心</text>
      </view>

      <view class="stats-overview">
        <view class="stat-card" @click="goStats">
          <text class="stat-icon">👥</text>
          <text class="stat-value">{{ stats.userCount }}</text>
          <text class="stat-label">用户总数</text>
        </view>
        <view class="stat-card">
          <text class="stat-icon">🃏</text>
          <text class="stat-value">{{ stats.cardCount }}</text>
          <text class="stat-label">卡片总数</text>
        </view>
        <view class="stat-card">
          <text class="stat-icon">📁</text>
          <text class="stat-value">{{ stats.categoryCount }}</text>
          <text class="stat-label">分类数量</text>
        </view>
      </view>
    </view>

    <view class="content">
      <view class="section">
        <text class="section-title">今日数据</text>
        <view class="today-stats">
          <view class="today-item">
            <view class="today-icon new">🆕</view>
            <view class="today-info">
              <text class="today-value">{{ stats.todayNewUsers }}</text>
              <text class="today-label">今日新增</text>
            </view>
          </view>
          <view class="today-item">
            <view class="today-icon active">🔥</view>
            <view class="today-info">
              <text class="today-value">{{ stats.todayActiveUsers }}</text>
              <text class="today-label">今日活跃</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">管理功能</text>
        <view class="menu-grid">
          <view class="menu-item" @click="goUsers">
            <view class="menu-icon-wrapper users">
              <text class="menu-icon">👥</text>
            </view>
            <text class="menu-label">用户管理</text>
          </view>
          <view class="menu-item" @click="goStats">
            <view class="menu-icon-wrapper stats">
              <text class="menu-icon">📊</text>
            </view>
            <text class="menu-label">数据统计</text>
          </view>
          <view class="menu-item" @click="goCategories">
            <view class="menu-icon-wrapper categories">
              <text class="menu-icon">📁</text>
            </view>
            <text class="menu-label">分类管理</text>
          </view>
          <view class="menu-item" @click="goCards">
            <view class="menu-icon-wrapper cards">
              <text class="menu-icon">🃏</text>
            </view>
            <text class="menu-label">卡片管理</text>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">快捷操作</text>
        <view class="quick-actions">
          <view class="action-btn" @click="initData">
            <text class="action-icon">🔄</text>
            <text class="action-text">初始化数据</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!isAdmin" class="no-permission">
      <text class="no-permission-icon">🔒</text>
      <text class="no-permission-text">无管理员权限</text>
      <view class="back-btn" @click="goBack">返回</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getStatusBarHeight, navigateTo, showToast } from '@/utils'
import { adminApi, cardApi } from '@/api'
const statusBarHeight = ref(getStatusBarHeight())
const isAdmin = ref(false)

const stats = ref({
  userCount: 0,
  cardCount: 0,
  categoryCount: 0,
  todayNewUsers: 0,
  todayActiveUsers: 0
})

onMounted(() => {
  checkAdmin()
})

onShow(() => {
  if (isAdmin.value) {
    loadStats()
  }
})

async function checkAdmin() {
  try {
    const res = await adminApi.checkAdmin()
    if (res.code === 0 && res.data?.isAdmin) {
      isAdmin.value = true
      loadStats()
    } else {
      isAdmin.value = false
    }
  } catch (e: any) {
    isAdmin.value = false
    showToast('权限验证失败')
  }
}

async function loadStats() {
  try {
    const res = await adminApi.getStats()
    if (res.code === 0 && res.data) {
      stats.value = {
        userCount: res.data.userCount || 0,
        cardCount: res.data.cardCount || 0,
        categoryCount: res.data.categoryCount || 0,
        todayNewUsers: res.data.todayNewUsers || 0,
        todayActiveUsers: res.data.todayActiveUsers || 0
      }
    }
  } catch (e) {
    console.error('加载统计数据失败:', e)
  }
}

async function initData() {
  uni.showModal({
    title: '确认初始化',
    content: '将清除现有分类和卡片数据，重新创建测试数据，确定继续吗？',
    success: async (res) => {
      if (res.confirm) {
        showToast('初始化中...', 'loading')
        try {
          await cardApi.initData()
          uni.hideToast()
          showToast('初始化完成', 'success')
          loadStats()
        } catch (e) {
          uni.hideToast()
          showToast('初始化失败')
        }
      }
    }
  })
}

function goUsers() {
  navigateTo('/pages/admin/users')
}

function goStats() {
  navigateTo('/pages/admin/stats')
}

function goCategories() {
  showToast('分类管理开发中')
}

function goCards() {
  showToast('卡片管理开发中')
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped lang="scss">
@import '@/styles/design-system.scss';

.page {
  min-height: 100vh;
  background-color: $color-bg-primary;
}

.header {
  background: linear-gradient(135deg, #EF4444, #F97316);
  padding-bottom: $spacing-5;
  border-radius: 0 0 $radius-2xl $radius-2xl;
  position: relative;
  overflow: hidden;
}

.header-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.deco-star {
  position: absolute;
  font-size: 32rpx;
  opacity: 0.2;
  
  &.d1 { top: 20%; left: 10%; }
  &.d2 { top: 30%; right: 15%; }
  &.d3 { top: 50%; left: 25%; }
}

.header-content {
  padding: $spacing-5 $spacing-4;
  text-align: center;
}

.header-title {
  font-size: 44rpx;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
  display: block;
}

.header-subtitle {
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.8);
  margin-top: $spacing-1;
  display: block;
}

.stats-overview {
  display: flex;
  justify-content: space-around;
  padding: 0 $spacing-4;
  margin-top: $spacing-3;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-3 $spacing-4;
  background: rgba(255, 255, 255, 0.2);
  border-radius: $radius-lg;
  min-width: 180rpx;
  backdrop-filter: blur(10px);
  
  &:active {
    transform: scale(0.95);
  }
}

.stat-icon {
  font-size: 40rpx;
  margin-bottom: $spacing-1;
}

.stat-value {
  font-size: 36rpx;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
}

.stat-label {
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.85);
  margin-top: $spacing-1;
}

.content {
  padding: $spacing-4;
}

.section {
  margin-bottom: $spacing-5;
}

.section-title {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-3;
  display: block;
  padding-left: $spacing-2;
  border-left: 6rpx solid $color-primary;
}

.today-stats {
  display: flex;
  gap: $spacing-3;
}

.today-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-4;
  background: $color-bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-md;
}

.today-icon {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-md;
  font-size: 36rpx;
  
  &.new { background: rgba(52, 211, 153, 0.15); }
  &.active { background: rgba(251, 146, 60, 0.15); }
}

.today-info {
  display: flex;
  flex-direction: column;
}

.today-value {
  font-size: 36rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.today-label {
  font-size: $font-size-xs;
  color: $color-text-secondary;
  margin-top: $spacing-1;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-3;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-4 $spacing-2;
  background: $color-bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  transition: transform $duration-fast $ease-bounce;
  
  &:active {
    transform: scale(0.95);
  }
}

.menu-icon-wrapper {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-md;
  margin-bottom: $spacing-2;
  
  &.users { background: rgba(96, 165, 250, 0.15); }
  &.stats { background: rgba(167, 139, 250, 0.15); }
  &.categories { background: rgba(251, 146, 60, 0.15); }
  &.cards { background: rgba(52, 211, 153, 0.15); }
}

.menu-icon {
  font-size: 40rpx;
}

.menu-label {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

.quick-actions {
  display: flex;
  gap: $spacing-3;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-2;
  padding: $spacing-4;
  background: $color-bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  
  &:active {
    transform: scale(0.98);
    background: $color-bg-secondary;
  }
}

.action-icon {
  font-size: 32rpx;
}

.action-text {
  font-size: $font-size-base;
  color: $color-text-primary;
}

.no-permission {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.no-permission-icon {
  font-size: 120rpx;
  margin-bottom: $spacing-4;
}

.no-permission-text {
  font-size: $font-size-lg;
  color: $color-text-inverse;
  margin-bottom: $spacing-6;
}

.back-btn {
  padding: $spacing-3 $spacing-8;
  background: $color-primary;
  color: $color-text-inverse;
  border-radius: $radius-full;
  font-size: $font-size-base;
}
</style>
