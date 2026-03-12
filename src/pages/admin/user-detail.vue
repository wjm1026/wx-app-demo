<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">←</text>
        </view>
        <text class="nav-title">用户详情</text>
      </view>
    </view>

    <!-- Header Section -->
    <view class="header">
      <view class="header-decoration">
        <text class="deco-star d1">⭐</text>
        <text class="deco-star d2">✨</text>
      </view>
      
      <view class="user-profile" v-if="userInfo">
        <view class="avatar-wrapper">
          <image class="avatar" :src="userInfo.avatar || defaultAvatar" mode="aspectFill" />
          <view v-if="userInfo.role === 'admin'" class="role-badge admin">管理员</view>
          <view v-if="userInfo.status === 2" class="status-badge banned">已封禁</view>
        </view>
        <view class="info-content">
          <view class="nickname-row">
            <text class="nickname">{{ userInfo.nickname || '未设置昵称' }}</text>
            <view v-if="userInfo.is_vip" class="vip-tag">
              <text class="vip-icon">👑</text>
            </view>
          </view>
          <view class="id-row">
            <text class="label">ID: </text>
            <text class="value">{{ userInfo._id }}</text>
            <text class="copy-btn" @click="copyId">复制</text>
          </view>
          <view class="time-row">
            <text class="label">注册时间: </text>
            <text class="value">{{ formatDate(userInfo.create_time) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="content-body" v-if="userInfo">
      <!-- Stats Cards -->
      <view class="stats-grid">
        <view class="stat-card points">
          <view class="stat-icon">💰</view>
          <view class="stat-info">
            <text class="stat-value">{{ userInfo.points || 0 }}</text>
            <text class="stat-label">当前积分</text>
          </view>
        </view>
        <view class="stat-card favorites">
          <view class="stat-icon">❤️</view>
          <view class="stat-info">
            <text class="stat-value">{{ favoriteCount }}</text>
            <text class="stat-label">收藏数量</text>
          </view>
        </view>
        <view class="stat-card invites">
          <view class="stat-icon">👥</view>
          <view class="stat-info">
            <text class="stat-value">{{ invitedCount }}</text>
            <text class="stat-label">邀请人数</text>
          </view>
        </view>
      </view>

      <!-- Action Buttons -->
      <view class="section-title">管理操作</view>
      <view class="action-grid">
        <button 
          class="action-btn" 
          :class="userInfo.status === 2 ? 'unban' : 'ban'"
          @click="toggleUserStatus"
        >
          <text class="btn-icon">{{ userInfo.status === 2 ? '🔓' : '🚫' }}</text>
          <text>{{ userInfo.status === 2 ? '解封用户' : '封禁用户' }}</text>
        </button>
        
        <button class="action-btn adjust" @click="openPointsModal">
          <text class="btn-icon">⚖️</text>
          <text>调整积分</text>
        </button>
        
        <button 
          class="action-btn role" 
          :class="{ 'is-admin': userInfo.role === 'admin' }"
          @click="toggleUserRole"
        >
          <text class="btn-icon">🛡️</text>
          <text>{{ userInfo.role === 'admin' ? '取消管理员' : '设为管理员' }}</text>
        </button>
      </view>

      <!-- Recent Points Log -->
      <view class="section-title">最近积分记录</view>
      <view class="log-list">
        <view v-if="recentPoints && recentPoints.length > 0">
          <view class="log-item" v-for="(log, index) in recentPoints" :key="index">
            <view class="log-left">
              <text class="log-reason">{{ log.reason || '积分变动' }}</text>
              <text class="log-time">{{ formatDate(log.create_time) }}</text>
            </view>
            <view class="log-right">
              <text class="log-amount" :class="log.amount > 0 ? 'plus' : 'minus'">
                {{ log.amount > 0 ? '+' : '' }}{{ log.amount }}
              </text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text>暂无积分记录</text>
        </view>
      </view>
    </view>

    <!-- Points Adjustment Modal -->
    <view class="modal-mask" v-if="showPointsModal" @click="closePointsModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">调整积分</text>
          <text class="close-icon" @click="closePointsModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">变动数量 (+/-)</text>
            <input 
              class="form-input" 
              type="number" 
              v-model="adjustForm.amount" 
              placeholder="例如: 100 或 -50" 
            />
          </view>
          <view class="form-item">
            <text class="form-label">变动原因</text>
            <input 
              class="form-input" 
              type="text" 
              v-model="adjustForm.reason" 
              placeholder="请输入调整原因" 
            />
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel" @click="closePointsModal">取消</button>
          <button class="modal-btn confirm" @click="submitPointsAdjust">确认调整</button>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { useAdminUserDetailPage } from './useAdminUserDetailPage'

const {
  adjustForm,
  closePointsModal,
  copyId,
  defaultAvatar,
  favoriteCount,
  formatDate,
  goBack,
  invitedCount,
  openPointsModal,
  recentPoints,
  showPointsModal,
  statusBarHeight,
  submitPointsAdjust,
  toggleUserRole,
  toggleUserStatus,
  userInfo,
} = useAdminUserDetailPage()
</script>

<style src="./user-detail.scss" scoped lang="scss"></style>
