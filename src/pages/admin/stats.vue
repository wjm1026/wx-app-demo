<template>
  <view class="page">
    <!-- Header Section -->
    <view class="header">
      <view class="header-content">
        <text class="page-title">数据概览</text>
        <text class="page-subtitle">平台运营数据实时监控</text>
      </view>
      <view class="header-decoration">
        <text class="deco-circle c1"></text>
        <text class="deco-circle c2"></text>
      </view>
    </view>

    <!-- Content Area -->
    <view class="content-container">
      
      <!-- Overview Cards -->
      <view class="section-title">
        <text class="title-icon">📊</text>
        <text>总览数据</text>
      </view>
      
      <view class="overview-grid">
        <view class="stat-card primary">
          <view class="icon-wrapper">
            <text class="icon">👥</text>
          </view>
          <text class="stat-num">{{ formatNumber(stats.userCount) }}</text>
          <text class="stat-label">用户总数</text>
        </view>
        
        <view class="stat-card secondary">
          <view class="icon-wrapper">
            <text class="icon">🃏</text>
          </view>
          <text class="stat-num">{{ formatNumber(stats.cardCount) }}</text>
          <text class="stat-label">卡片总数</text>
        </view>
        
        <view class="stat-card accent">
          <view class="icon-wrapper">
            <text class="icon">📁</text>
          </view>
          <text class="stat-num">{{ formatNumber(stats.categoryCount) }}</text>
          <text class="stat-label">分类数量</text>
        </view>
      </view>

      <!-- Today's Stats -->
      <view class="section-title">
        <text class="title-icon">📅</text>
        <text>今日动态</text>
      </view>
      
      <view class="today-stats-row">
        <view class="today-card new-users">
          <view class="today-header">
            <text class="today-label">今日新增</text>
            <text class="trend-icon">↗</text>
          </view>
          <view class="today-body">
            <text class="today-num">{{ formatNumber(stats.todayNewUsers) }}</text>
            <text class="unit">人</text>
          </view>
        </view>
        
        <view class="today-card active-users">
          <view class="today-header">
            <text class="today-label">今日活跃</text>
            <text class="trend-icon">⚡</text>
          </view>
          <view class="today-body">
            <text class="today-num">{{ formatNumber(stats.todayActiveUsers) }}</text>
            <text class="unit">人</text>
          </view>
        </view>
      </view>

      <!-- Points Distribution -->
      <view class="section-title">
        <text class="title-icon">💰</text>
        <text>积分分布 (今日)</text>
      </view>

      <view class="points-list">
        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>
        
        <template v-else>
          <view v-if="!stats.todayPointsStats || stats.todayPointsStats.length === 0" class="empty-state">
            <text>暂无积分变动数据</text>
          </view>
          
          <view 
            v-else
            v-for="(item, index) in stats.todayPointsStats" 
            :key="index"
            class="point-item"
          >
            <view class="point-icon-box" :class="getPointTypeColor(item._id)">
              <text class="point-icon">{{ getPointTypeIcon(item._id) }}</text>
            </view>
            
            <view class="point-info">
              <text class="point-type">{{ getPointTypeName(item._id) }}</text>
              <text class="point-count">{{ formatNumber(item.count) }} 笔交易</text>
            </view>
            
            <view class="point-value">
              <text class="amount" :class="{ 'negative': isNegative(item._id) }">
                {{ isNegative(item._id) ? '-' : '+' }}{{ formatNumber(item.total) }}
              </text>
              <text class="label">积分</text>
            </view>
          </view>
        </template>
      </view>

    </view>
    
    <!-- Safe Area Bottom -->
    <view class="safe-bottom"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { showToast } from '@/utils'
import { adminApi } from '@/api'

// Data Interfaces
interface PointStat {
  _id: string
  total: number
  count: number
}

interface StatsData {
  userCount: number
  cardCount: number
  categoryCount: number
  todayNewUsers: number
  todayActiveUsers: number
  todayPointsStats: PointStat[]
}

// State
const loading = ref(false)
const stats = ref<StatsData>({
  userCount: 0,
  cardCount: 0,
  categoryCount: 0,
  todayNewUsers: 0,
  todayActiveUsers: 0,
  todayPointsStats: []
})

// Lifecycle
onMounted(() => {
  loadStats()
})

onPullDownRefresh(async () => {
  await loadStats()
  uni.stopPullDownRefresh()
})

// Methods
async function loadStats() {
  if (loading.value) return
  loading.value = true
  
  try {
    const res = await adminApi.getStats()
    if (res.code === 0 && res.data) {
      stats.value = res.data as StatsData
    }
  } catch (e) {
    console.error('获取统计数据失败:', e)
    showToast('获取数据失败')
  } finally {
    loading.value = false
  }
}

function formatNumber(num: number): string {
  return (num || 0).toLocaleString()
}

function getPointTypeName(type: string): string {
  const map: Record<string, string> = {
    'sign_in': '每日签到',
    'ad': '广告激励',
    'ad_reward': '广告激励',
    'invite': '邀请好友',
    'gift': '系统赠送',
    'consume': '积分消费',
    'refund': '积分退款',
    'admin_add': '管理员发放',
    'admin_deduct': '管理员扣除'
  }
  return map[type] || '其他'
}

function getPointTypeIcon(type: string): string {
  const map: Record<string, string> = {
    'sign_in': '📅',
    'ad': '🎬',
    'ad_reward': '🎬',
    'invite': '🤝',
    'gift': '🎁',
    'consume': '🛍️',
    'refund': '↩️',
    'admin_add': '👨‍💼',
    'admin_deduct': '📉'
  }
  return map[type] || '💰'
}

function getPointTypeColor(type: string): string {
  if (['consume', 'admin_deduct'].includes(type)) return 'red'
  if (['ad', 'ad_reward', 'invite'].includes(type)) return 'purple'
  if (['sign_in', 'gift', 'refund'].includes(type)) return 'orange'
  return 'blue'
}

function isNegative(type: string): boolean {
  return ['consume', 'admin_deduct'].includes(type)
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background-color: $color-bg-primary;
}

// Header
.header {
  background: $gradient-primary;
  padding: 100rpx $spacing-4 $spacing-8;
  position: relative;
  overflow: hidden;
  border-radius: 0 0 $radius-2xl $radius-2xl;
  box-shadow: $shadow-colored;
  
  .header-content {
    position: relative;
    z-index: 2;
  }
  
  .page-title {
    display: block;
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
    color: $color-text-inverse;
    margin-bottom: $spacing-1;
  }
  
  .page-subtitle {
    font-size: $font-size-sm;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .header-decoration {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    
    .deco-circle {
      position: absolute;
      border-radius: $radius-full;
      background: rgba(255, 255, 255, 0.1);
      
      &.c1 {
        width: 200rpx;
        height: 200rpx;
        top: -60rpx;
        right: -40rpx;
      }
      
      &.c2 {
        width: 120rpx;
        height: 120rpx;
        bottom: 20rpx;
        left: -30rpx;
      }
    }
  }
}

// Content Container
.content-container {
  padding: $spacing-4;
  margin-top: -$spacing-4;
  position: relative;
  z-index: 3;
}

.section-title {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  margin: $spacing-6 0 $spacing-3;
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  
  .title-icon {
    font-size: $font-size-xl;
  }
  
  &:first-child {
    margin-top: 0;
  }
}

// Overview Grid
.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-3;
  margin-bottom: $spacing-2;
}

.stat-card {
  @include card-base;
  padding: $spacing-3;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: $color-bg-card;
  
  .icon-wrapper {
    width: 80rpx;
    height: 80rpx;
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: $spacing-2;
    background: rgba($color-primary, 0.1);
    
    .icon {
      font-size: 40rpx;
    }
  }
  
  .stat-num {
    font-size: $font-size-lg;
    font-weight: $font-weight-bold;
    color: $color-text-primary;
    line-height: 1.2;
    margin-bottom: 4rpx;
  }
  
  .stat-label {
    font-size: $font-size-xs;
    color: $color-text-tertiary;
  }
  
  &.primary .icon-wrapper { background: rgba($color-primary, 0.1); color: $color-primary; }
  &.secondary .icon-wrapper { background: rgba($color-secondary, 0.1); color: $color-secondary; }
  &.accent .icon-wrapper { background: rgba($color-accent-purple, 0.1); color: $color-accent-purple; }
}

// Today Stats
.today-stats-row {
  display: flex;
  gap: $spacing-3;
}

.today-card {
  @include card-base;
  flex: 1;
  padding: $spacing-4;
  position: relative;
  overflow: hidden;
  
  .today-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-2;
    
    .today-label {
      font-size: $font-size-sm;
      color: rgba(255, 255, 255, 0.9);
    }
    
    .trend-icon {
      font-size: $font-size-sm;
      color: rgba(255, 255, 255, 0.6);
    }
  }
  
  .today-body {
    display: flex;
    align-items: baseline;
    gap: $spacing-1;
    
    .today-num {
      font-size: 48rpx;
      font-weight: $font-weight-bold;
      color: $color-text-inverse;
    }
    
    .unit {
      font-size: $font-size-xs;
      color: rgba(255, 255, 255, 0.8);
    }
  }
  
  &.new-users {
    background: linear-gradient(135deg, $color-secondary, $color-secondary-dark);
    box-shadow: 0 8rpx 20rpx rgba($color-secondary, 0.3);
  }
  
  &.active-users {
    background: linear-gradient(135deg, $color-accent-orange, $color-primary);
    box-shadow: 0 8rpx 20rpx rgba($color-primary, 0.3);
  }
}

// Points List
.points-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.loading-state, .empty-state {
  padding: $spacing-8;
  text-align: center;
  color: $color-text-tertiary;
  font-size: $font-size-sm;
  background: rgba(255, 255, 255, 0.5);
  border-radius: $radius-lg;
}

.point-item {
  @include card-base;
  padding: $spacing-3 $spacing-4;
  display: flex;
  align-items: center;
  gap: $spacing-3;
  
  .point-icon-box {
    width: 88rpx;
    height: 88rpx;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .point-icon {
      font-size: 40rpx;
    }
    
    &.orange { background: rgba($color-accent-orange, 0.1); }
    &.purple { background: rgba($color-accent-purple, 0.1); }
    &.blue { background: rgba($color-info, 0.1); }
    &.red { background: rgba($color-error, 0.1); }
  }
  
  .point-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    
    .point-type {
      font-size: $font-size-base;
      font-weight: $font-weight-semibold;
      color: $color-text-primary;
    }
    
    .point-count {
      font-size: $font-size-xs;
      color: $color-text-tertiary;
    }
  }
  
  .point-value {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    
    .amount {
      font-size: $font-size-lg;
      font-weight: $font-weight-bold;
      color: $color-success; // Default to positive color
      
      &.negative {
        color: $color-text-primary;
      }
    }
    
    .label {
      font-size: $font-size-xs;
      color: $color-text-tertiary;
    }
  }
}

.safe-bottom {
  height: 40rpx;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
