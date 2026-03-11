<template>
  <view class="page">
    <!-- Header: Search & Tabs -->
    <view class="header">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input 
          class="search-input" 
          type="text" 
          v-model="keyword" 
          placeholder="搜索用户昵称/ID" 
          confirm-type="search"
          @confirm="onSearch"
        />
        <view v-if="keyword" class="clear-icon" @click="clearSearch">✕</view>
      </view>
      
      <view class="tabs">
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 0 }" 
          @click="switchTab(0)"
        >
          全部
        </view>
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 1 }" 
          @click="switchTab(1)"
        >
          正常
        </view>
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 2 }" 
          @click="switchTab(2)"
        >
          封禁
        </view>
      </view>
    </view>

    <!-- User List -->
    <view class="user-list">
      <view 
        v-for="user in userList" 
        :key="user._id" 
        class="user-card"
        @click="goDetail(user._id)"
      >
        <image class="user-avatar" :src="user.avatar || '/static/default-avatar.png'" mode="aspectFill" />
        
        <view class="user-info">
          <view class="info-header">
            <text class="user-name">{{ user.nickname || '未命名用户' }}</text>
            <view class="status-badge" :class="user.status === 1 ? 'status-normal' : 'status-banned'">
              {{ user.status === 1 ? '正常' : '封禁' }}
            </view>
          </view>
          
          <view class="info-stats">
            <text class="stat-item">积分: {{ user.points }}</text>
            <text class="stat-divider">|</text>
            <text class="stat-item">邀请: {{ user.invite_count }}</text>
          </view>
          
          <text class="user-time">注册: {{ formatDate(user.create_time) }}</text>
        </view>
        
        <text class="arrow-icon">›</text>
      </view>
    </view>

    <!-- Empty State -->
    <view v-if="!loading && userList.length === 0" class="empty-state">
      <text class="empty-icon">👥</text>
      <text class="empty-text">暂无相关用户</text>
    </view>

    <!-- Loading State -->
    <view v-if="loading && userList.length === 0" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>
    
    <view v-if="!loading && hasMore && userList.length > 0" class="load-more">
      <text>上拉加载更多</text>
    </view>
    
    <view v-if="!hasMore && userList.length > 0" class="no-more">
      <text>没有更多了</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import { navigateTo, showToast } from '@/utils'
import { adminApi, type AdminUserListItem } from '@/api'
import { usePagedList } from '@/composables/usePagedList'

const keyword = ref('')
const currentTab = ref(0)

interface UserListQuery {
  keyword: string
  status?: number
}

const {
  list: userList,
  loading,
  hasMore,
  refresh,
  loadMore,
} = usePagedList<AdminUserListItem, UserListQuery>({
  pageSize: 10,
  initialQuery: {
    keyword: ''
  },
  fetcher: (params) => adminApi.getUserList(params),
  onError: (message) => showToast(message || '加载失败')
})

onShow(() => {
  void refresh(buildQuery())
})

onPullDownRefresh(async () => {
  await refresh(buildQuery())
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    void loadMore()
  }
})

function buildQuery(): UserListQuery {
  const query: UserListQuery = {
    keyword: keyword.value.trim()
  }

  if (currentTab.value !== 0) {
    query.status = currentTab.value
  }

  return query
}

function switchTab(tab: number) {
  if (currentTab.value === tab) return
  currentTab.value = tab
  void refresh(buildQuery())
}

function onSearch() {
  void refresh(buildQuery())
}

function clearSearch() {
  keyword.value = ''
  void refresh(buildQuery())
}

function goDetail(id: string) {
  navigateTo(`/pages/admin/user-detail?id=${id}`)
}

function formatDate(dateStr: string | number | undefined) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background-color: $color-bg-primary;
  padding-bottom: 40rpx;
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 20rpx 24rpx 0;
  box-shadow: $shadow-sm;
}

.search-box {
  display: flex;
  align-items: center;
  background-color: $color-bg-secondary;
  border-radius: $radius-full;
  padding: 16rpx 24rpx;
  margin-bottom: 20rpx;
}

.search-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: $color-text-primary;
  height: 40rpx;
  line-height: 40rpx;
}

.clear-icon {
  font-size: 28rpx;
  color: $color-text-tertiary;
  padding: 8rpx;
}

.tabs {
  display: flex;
  justify-content: space-around;
  padding-bottom: 0;
}

.tab-item {
  font-size: 30rpx;
  color: $color-text-secondary;
  padding: 20rpx 32rpx;
  position: relative;
  transition: all 0.3s;
  
  &.active {
    color: $color-primary;
    font-weight: 600;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 40rpx;
      height: 6rpx;
      background: $color-primary;
      border-radius: $radius-full;
    }
  }
}

.user-list {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.user-card {
  display: flex;
  align-items: center;
  background-color: $color-bg-card;
  border-radius: $radius-lg;
  padding: 24rpx;
  box-shadow: $shadow-sm;
  transition: all 0.2s;
  
  &:active {
    transform: scale(0.98);
  }
}

.user-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: $radius-full;
  margin-right: 24rpx;
  border: 2rpx solid $color-border;
  background-color: $color-bg-secondary;
}

.user-info {
  flex: 1;
  overflow: hidden;
}

.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.user-name {
  font-size: 32rpx;
  font-weight: 600;
  color: $color-text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}

.status-badge {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: $radius-full;
  
  &.status-normal {
    background-color: rgba($color-success, 0.1);
    color: $color-success;
  }
  
  &.status-banned {
    background-color: rgba($color-error, 0.1);
    color: $color-error;
  }
}

.info-stats {
  font-size: 24rpx;
  color: $color-text-secondary;
  margin-bottom: 8rpx;
  display: flex;
  align-items: center;
}

.stat-divider {
  margin: 0 12rpx;
  color: $color-border;
}

.user-time {
  font-size: 22rpx;
  color: $color-text-tertiary;
  display: block;
}

.arrow-icon {
  font-size: 40rpx;
  color: $color-text-tertiary;
  margin-left: 16rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $color-text-tertiary;
}

.loading-state, .load-more, .no-more {
  text-align: center;
  padding: 24rpx;
  font-size: 24rpx;
  color: $color-text-tertiary;
}
</style>
