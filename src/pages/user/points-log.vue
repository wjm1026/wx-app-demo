<template>
  <view class="page">
    <!-- Header Area -->
    <view class="header">
      <view class="points-display">
        <text class="points-label">当前积分</text>
        <text class="points-value">{{ store.userInfo?.points || 0 }}</text>
      </view>
      <view class="header-decoration">
        <text class="deco-coin c1">🪙</text>
        <text class="deco-coin c2">💰</text>
      </view>
    </view>

    <!-- Content Area -->
    <view class="content-wrapper">
      <view class="section-title">
        <text>积分明细</text>
      </view>

      <!-- List -->
      <view v-if="logs.length > 0" class="log-list">
        <view 
          v-for="(item, index) in logs" 
          :key="index" 
          class="log-item"
        >
          <view class="item-icon-wrapper" :class="item.amount > 0 ? 'earn' : 'consume'">
            <text class="item-icon">{{ item.amount > 0 ? '🎁' : '🛍️' }}</text>
          </view>
          
          <view class="item-content">
          <text class="item-title">{{ item.description || (item.amount > 0 ? '获取积分' : '使用积分') }}</text>
          <text class="item-time">{{ formatDate(item.create_time) }}</text>
        </view>
        
          <view class="item-amount" :class="item.amount > 0 ? 'plus' : 'minus'">
            {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}
          </view>
        </view>
      </view>

      <!-- Empty State -->
      <view v-else-if="!loading" class="empty-state">
        <text class="empty-icon">📝</text>
        <text class="empty-text">暂无积分记录</text>
      </view>

      <!-- Loading Status -->
      <view v-if="loading || logs.length > 0" class="loading-status">
        <text>{{ loading ? '加载中...' : (finished ? '没有更多记录了' : '上拉加载更多') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { showToast } from '@/utils'
import { userApi, type PointsLogItem } from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'
import { usePagedList } from '@/composables/usePagedList'

const { store, ensureLoggedIn } = useLoginGuard()
const {
  list: logs,
  loading,
  hasMore,
  refresh,
  loadMore,
} = usePagedList<PointsLogItem>({
  pageSize: 20,
  fetcher: ({ page, pageSize }) => userApi.getPointsLog({ page, pageSize }),
  onError: (message) => showToast(message || '获取记录失败')
})
const finished = computed(() => !hasMore.value)

// Lifecycle
onMounted(() => {
  if (!ensureLoggedIn()) {
    return
  }
  void refresh()
})

onShow(() => {
  if (!ensureLoggedIn()) {
    return
  }

  // Refresh points balance
  if (store.userInfo) {
    void userApi.getUserInfo().then((res) => {
      if (res.code === 0 && res.data) {
        store.setUserInfo(res.data)
      }
    })
  }
})

onPullDownRefresh(async () => {
  if (!ensureLoggedIn()) {
    uni.stopPullDownRefresh()
    return
  }

  await refresh()
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (!finished.value && !loading.value) {
    void loadMore()
  }
})

function formatDate(timestamp: number | string): string {
  if (!timestamp) return ''
  const date = new Date(Number(timestamp))
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}
</script>

<style scoped lang="scss">
@import '@/styles/design-system.scss';

.page {
  min-height: 100vh;
  background-color: $color-bg-primary;
  padding-bottom: $spacing-8;
}

// Header
.header {
  background: $gradient-sunset;
  padding: $spacing-10 $spacing-6 $spacing-16;
  border-radius: 0 0 $radius-2xl $radius-2xl;
  position: relative;
  overflow: hidden;
  box-shadow: $shadow-colored;
  margin-bottom: -$spacing-8; // Overlap effect
  z-index: 1;
}

.points-display {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: $color-text-inverse;
}

.points-label {
  font-size: $font-size-base;
  opacity: 0.9;
  margin-bottom: $spacing-2;
}

.points-value {
  font-size: 80rpx;
  font-weight: $font-weight-bold;
  text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  font-family: 'PingFang SC', sans-serif; // Ensure number looks good
}

.header-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  
  .deco-coin {
    position: absolute;
    font-size: 60rpx;
    opacity: 0.2;
    animation: float 3s ease-in-out infinite;
    
    &.c1 { top: 20%; left: 15%; animation-delay: 0s; font-size: 80rpx; }
    &.c2 { bottom: 30%; right: 15%; animation-delay: 1.5s; font-size: 50rpx; }
  }
}

// Content
.content-wrapper {
  position: relative;
  z-index: 2;
  padding: 0 $spacing-4;
}

.section-title {
  margin-bottom: $spacing-3;
  padding-left: $spacing-2;
  
  text {
    font-size: $font-size-lg;
    font-weight: $font-weight-bold;
    color: $color-text-primary;
  }
}

// List
.log-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.log-item {
  display: flex;
  align-items: center;
  padding: $spacing-4;
  background: $color-bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  transition: transform $duration-fast $ease-out;
  
  &:active {
    transform: scale(0.98);
  }
}

.item-icon-wrapper {
  width: 88rpx;
  height: 88rpx;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: $spacing-3;
  font-size: 40rpx;
  
  &.earn {
    background: rgba($color-success, 0.1);
  }
  
  &.consume {
    background: rgba($color-warning, 0.1);
  }
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-1;
}

.item-title {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.item-time {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.item-amount {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  font-family: monospace; // For number alignment
  
  &.plus {
    color: $color-success;
  }
  
  &.minus {
    color: $color-text-primary;
  }
}

// Empty State
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
  
  .empty-icon {
    font-size: 100rpx;
    margin-bottom: $spacing-4;
    opacity: 0.5;
  }
  
  .empty-text {
    font-size: $font-size-base;
    color: $color-text-tertiary;
  }
}

// Loading
.loading-status {
  text-align: center;
  padding: $spacing-4;
  
  text {
    font-size: $font-size-sm;
    color: $color-text-tertiary;
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
