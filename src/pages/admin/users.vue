<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">用户管理</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="filter-card">
      <view class="section-head">
        <view class="section-copy">
          <text class="section-title">筛选条件</text>
          <text class="section-subtitle">按昵称、用户 ID 或账号状态快速定位目标用户。</text>
        </view>
        <view v-if="hasFilters" class="section-action" @click="resetFilters">重置</view>
      </view>

      <view class="search-panel">
        <text class="field-label">关键词检索</text>
        <view class="search-shell">
          <input
            v-model="keyword"
            class="search-input"
            type="text"
            placeholder="输入昵称或用户 ID"
            confirm-type="search"
            @confirm="onSearch"
          />
          <view class="search-button" @click="onSearch">搜索</view>
        </view>

        <view v-if="keyword" class="search-meta">
          <text class="search-meta-text">当前输入：{{ keyword }}</text>
          <view class="search-clear" @click="clearSearch">清空</view>
        </view>
      </view>

      <view class="filter-panel">
        <text class="field-label">状态筛选</text>
        <view class="tab-rail">
          <view
            v-for="tab in statusTabs"
            :key="tab.value"
            class="tab-item"
            :class="{ active: currentTab === tab.value }"
            @click="switchTab(tab.value)"
          >
            <text class="tab-label">{{ tab.label }}</text>
            <text class="tab-note">{{ tab.note }}</text>
          </view>
        </view>
      </view>

      <view class="filter-summary">
        <text class="filter-summary-primary">{{ resultSummary }}</text>
        <text class="filter-summary-secondary">{{ resultHint }}</text>
      </view>
    </view>

    <view v-if="loading && userList.length === 0" class="state-panel loading-panel">
      <view class="loading-spinner"></view>
      <text class="state-title">正在同步用户列表</text>
      <text class="state-desc">拉取最新数据中，马上就好。</text>
    </view>

    <template v-else-if="userList.length > 0">
      <view class="list-section">
        <view class="section-head">
          <view class="section-copy">
            <text class="section-title">用户列表</text>
            <text class="section-subtitle">点击卡片进入详情页，继续执行账号管理动作。</text>
          </view>
        </view>

        <view class="user-list">
          <view
            v-for="user in userList"
            :key="user._id"
            class="user-card"
            @click="goDetail(user._id)"
          >
            <view class="user-card-top">
              <image
                class="user-avatar"
                :src="user.avatar || defaultAvatar"
                mode="aspectFill"
              />

              <view class="user-identity">
                <view class="user-name-row">
                  <text class="user-name">{{ user.nickname || '未命名用户' }}</text>
                  <view v-if="user.role === 'admin'" class="role-badge">管理员</view>
                </view>
                <text class="user-id">ID {{ user._id }}</text>
              </view>

              <view
                class="status-badge"
                :class="user.status === 2 ? 'status-banned' : 'status-normal'"
              >
                {{ user.status === 2 ? '封禁' : '正常' }}
              </view>
            </view>

            <view class="metric-row">
              <view class="metric-card">
                <text class="metric-label">积分</text>
                <text class="metric-value">{{ formatMetric(user.points) }}</text>
              </view>
              <view class="metric-card">
                <text class="metric-label">邀请</text>
                <text class="metric-value">{{ formatMetric(user.invite_count) }}</text>
              </view>
            </view>

            <view class="user-foot">
              <text class="user-time">注册于 {{ formatDate(user.create_time) }}</text>
              <view class="detail-link">
                <text class="detail-link-text">查看详情</text>
                <image
                  class="detail-link-icon"
                  src="/static/icons/line/chevron-right.svg"
                  mode="aspectFit"
                />
              </view>
            </view>
          </view>
        </view>

        <view v-if="loading" class="list-footer">正在加载更多...</view>
        <view v-else-if="hasMore" class="list-footer">继续上拉加载更多</view>
        <view v-else class="list-footer">已加载全部用户</view>
      </view>
    </template>

    <view v-else class="state-panel empty-panel">
      <view class="empty-icon-shell">
        <image class="empty-icon" src="/static/icons/line/users.svg" mode="aspectFit" />
      </view>
      <text class="state-title">{{ emptyTitle }}</text>
      <text class="state-desc">{{ emptyDescription }}</text>
      <view v-if="hasFilters" class="reset-btn" @click="resetFilters">重置筛选</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useAdminUsersPage } from './hooks/useAdminUsersPage'

const {
  clearSearch,
  currentTab,
  defaultAvatar,
  emptyDescription,
  emptyTitle,
  formatDate,
  formatMetric,
  goBack,
  goDetail,
  hasFilters,
  hasMore,
  keyword,
  loading,
  onSearch,
  resetFilters,
  resultHint,
  resultSummary,
  statusBarHeight,
  switchTab,
  tabOptions: statusTabs,
  userList,
} = useAdminUsersPage()
</script>

<style src="./styles/users.scss" scoped lang="scss"></style>
