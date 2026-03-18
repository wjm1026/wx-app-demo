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
import { useAdminUsersPage } from './hooks/useAdminUsersPage'

const {
  clearSearch,
  currentTab,
  formatDate,
  goDetail,
  hasMore,
  keyword,
  loading,
  onSearch,
  switchTab,
  userList,
} = useAdminUsersPage()
</script>

<style src="./styles/users.scss" scoped lang="scss"></style>
