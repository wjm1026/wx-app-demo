<template>
  <view class="page">
    <!-- 头部信息区 -->
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <!-- 装饰背景 -->
      <view class="header-decoration">
        <text class="deco-star d1">⭐</text>
        <text class="deco-star d2">✨</text>
        <text class="deco-star d3">🌟</text>
      </view>
      
      <!-- 用户信息 -->
      <view class="user-info">
        <view class="avatar-wrapper" @click="chooseAvatar">
          <image class="avatar" :src="userInfo.avatar || defaultAvatar" mode="aspectFill" />
          <view v-if="userInfo.isVip" class="vip-badge">VIP</view>
        </view>
        <view class="info-content">
          <view class="nickname-row">
            <text class="nickname">{{ userInfo.nickname || '点击登录' }}</text>
            <view v-if="userInfo.isVip" class="vip-tag">
              <text class="vip-icon">👑</text>
              <text class="vip-text">尊贵会员</text>
            </view>
          </view>
          <text class="user-id" v-if="isLoggedIn">ID: {{ userInfo.inviteCode }}</text>
        </view>
      </view>

      <!-- 统计数据 -->
      <view class="stats-card">
        <view class="stat-item" @click="goPointsLog">
          <view class="stat-icon-wrapper points">
            <text class="stat-icon">💰</text>
          </view>
          <text class="stat-value">{{ userInfo.points }}</text>
          <text class="stat-label">积分</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <view class="stat-icon-wrapper views">
            <text class="stat-icon">🎫</text>
          </view>
          <text class="stat-value">{{ userInfo.freeViews }}</text>
          <text class="stat-label">免费次数</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item" @click="goInvite">
          <view class="stat-icon-wrapper invite">
            <text class="stat-icon">👥</text>
          </view>
          <text class="stat-value">{{ userInfo.inviteCount }}</text>
          <text class="stat-label">邀请人数</text>
        </view>
      </view>

      <!-- 每日任务 -->
      <view class="daily-tasks">
        <view class="task-card sign-in" :class="{ completed: hasSigned }" @click="doSignIn">
          <view class="task-content">
            <text class="task-icon">{{ hasSigned ? '✅' : '📅' }}</text>
            <view class="task-info">
              <text class="task-title">{{ hasSigned ? '已签到' : '每日签到' }}</text>
              <text class="task-reward">+5 积分</text>
            </view>
          </view>
          <view class="task-arrow">→</view>
        </view>
        <view class="task-card watch-ad" @click="watchAd">
          <view class="task-content">
            <text class="task-icon">🎬</text>
            <view class="task-info">
              <text class="task-title">看视频</text>
              <text class="task-reward">+10 积分</text>
            </view>
          </view>
          <view class="task-arrow">→</view>
        </view>
      </view>
    </view>

    <!-- 菜单列表 -->
    <view class="menu-section">
      <view class="menu-group">
        <view class="menu-item" @click="goFavorites">
          <view class="menu-icon-wrapper favorites">
            <text class="menu-icon">❤️</text>
          </view>
          <text class="menu-title">我的收藏</text>
          <text class="menu-arrow">→</text>
        </view>
        <view class="menu-item" @click="goInvite">
          <view class="menu-icon-wrapper invite">
            <text class="menu-icon">🎁</text>
          </view>
          <text class="menu-title">邀请好友</text>
          <view class="menu-badge">+100积分</view>
          <text class="menu-arrow">→</text>
        </view>
        <view class="menu-item" @click="goPointsLog">
          <view class="menu-icon-wrapper points">
            <text class="menu-icon">📊</text>
          </view>
          <text class="menu-title">积分明细</text>
          <text class="menu-arrow">→</text>
        </view>
      </view>

      <view class="menu-group">
        <view class="menu-item" @click="goFeedback">
          <view class="menu-icon-wrapper feedback">
            <text class="menu-icon">💬</text>
          </view>
          <text class="menu-title">意见反馈</text>
          <text class="menu-arrow">→</text>
        </view>
        <view class="menu-item" @click="goAbout">
          <view class="menu-icon-wrapper about">
            <text class="menu-icon">ℹ️</text>
          </view>
          <text class="menu-title">关于我们</text>
          <text class="menu-arrow">→</text>
        </view>
        <button class="menu-item share-btn" open-type="share">
          <view class="menu-icon-wrapper share">
            <text class="menu-icon">📤</text>
          </view>
          <text class="menu-title">分享给朋友</text>
          <text class="menu-arrow">→</text>
        </button>
      </view>
    </view>

    <!-- 登录按钮 -->
    <view v-if="!isLoggedIn" class="login-section">
      <view class="login-btn" @click="doLogin">
        <text class="login-icon">💚</text>
        <text class="login-text">微信一键登录</text>
      </view>
      <text class="login-tip">登录后可保存学习进度和收藏</text>
    </view>

    <!-- 底部安全区 -->
    <view class="safe-bottom"></view>
    <CustomTabbar :current="2" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getStatusBarHeight, navigateTo, showToast } from '@/utils'
import CustomTabbar from '@/components/CustomTabbar/CustomTabbar.vue'

const statusBarHeight = ref(getStatusBarHeight())
const isLoggedIn = ref(true)
const hasSigned = ref(false)

const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

const userInfo = ref({
  nickname: '宝宝妈妈',
  avatar: '',
  points: 150,
  freeViews: 8,
  inviteCount: 3,
  inviteCode: 'BABY2024',
  isVip: false
})

function chooseAvatar() {
  if (!isLoggedIn.value) {
    doLogin()
    return
  }
  showToast('选择头像')
}

function doLogin() {
  showToast('微信登录中...')
  setTimeout(() => {
    isLoggedIn.value = true
    showToast('登录成功 🎉', 'success')
  }, 1000)
}

function doSignIn() {
  if (hasSigned.value) {
    showToast('今日已签到 ✅')
    return
  }
  hasSigned.value = true
  userInfo.value.points += 5
  showToast('签到成功 +5积分 🎉', 'success')
}

function watchAd() {
  showToast('加载广告中...')
  setTimeout(() => {
    userInfo.value.points += 10
    showToast('获得10积分 🎉', 'success')
  }, 2000)
}

function goFavorites() {
  navigateTo('/pages/user/favorites')
}

function goInvite() {
  navigateTo('/pages/user/invite')
}

function goPointsLog() {
  showToast('积分明细')
}

function goFeedback() {
  showToast('意见反馈')
}

function goAbout() {
  showToast('关于我们')
}
</script>

<style scoped lang="scss">
@import '@/styles/design-system.scss';

.page {
  min-height: 100vh;
  background-color: $color-bg-primary;
}

// 头部区域
.header {
  background: $gradient-primary;
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
  opacity: 0.3;
  animation: float 4s ease-in-out infinite;
  
  &.d1 { top: 20%; left: 10%; animation-delay: 0s; }
  &.d2 { top: 40%; right: 15%; animation-delay: 1s; }
  &.d3 { top: 60%; left: 20%; animation-delay: 2s; }
}

// 用户信息
.user-info {
  display: flex;
  align-items: center;
  padding: $spacing-5 $spacing-4;
  gap: $spacing-4;
}

.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: $radius-full;
  border: 6rpx solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}

.vip-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  padding: 4rpx 12rpx;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  border-radius: $radius-full;
  font-size: 18rpx;
  font-weight: $font-weight-bold;
  color: #FFF;
  box-shadow: 0 4rpx 12rpx rgba(255, 165, 0, 0.4);
}

.info-content {
  flex: 1;
}

.nickname-row {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  margin-bottom: $spacing-1;
}

.nickname {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
}

.vip-tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: $radius-full;
}

.vip-icon {
  font-size: 20rpx;
}

.vip-text {
  font-size: 20rpx;
  color: $color-text-inverse;
}

.user-id {
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.8);
}

// 统计卡片
.stats-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin: 0 $spacing-4;
  padding: $spacing-4;
  background: rgba(255, 255, 255, 0.2);
  border-radius: $radius-lg;
  backdrop-filter: blur(10px);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-1;
  transition: transform $duration-fast $ease-bounce;
  
  &:active {
    transform: scale(0.95);
  }
}

.stat-icon-wrapper {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  margin-bottom: $spacing-1;
  
  &.points { background: rgba(255, 215, 0, 0.3); }
  &.views { background: rgba(52, 211, 153, 0.3); }
  &.invite { background: rgba(167, 139, 250, 0.3); }
}

.stat-icon {
  font-size: 32rpx;
}

.stat-value {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
}

.stat-label {
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.85);
}

.stat-divider {
  width: 2rpx;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.25);
}

// 每日任务
.daily-tasks {
  display: flex;
  gap: $spacing-3;
  padding: $spacing-4;
  padding-top: $spacing-5;
}

.task-card {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-3 $spacing-4;
  background: rgba(255, 255, 255, 0.95);
  border-radius: $radius-lg;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
  transition: transform $duration-fast $ease-bounce;
  
  &:active {
    transform: scale(0.97);
  }
  
  &.completed {
    background: rgba(255, 255, 255, 0.7);
    
    .task-title {
      color: $color-text-tertiary;
    }
  }
}

.task-content {
  display: flex;
  align-items: center;
  gap: $spacing-3;
}

.task-icon {
  font-size: 40rpx;
}

.task-info {
  display: flex;
  flex-direction: column;
}

.task-title {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.task-reward {
  font-size: $font-size-xs;
  color: $color-primary;
  font-weight: $font-weight-medium;
}

.task-arrow {
  font-size: $font-size-base;
  color: $color-text-tertiary;
}

// 菜单区域
.menu-section {
  padding: $spacing-4;
}

.menu-group {
  background-color: $color-bg-card;
  border-radius: $radius-lg;
  margin-bottom: $spacing-4;
  overflow: hidden;
  box-shadow: $shadow-md;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: $spacing-4;
  border-bottom: 2rpx solid $color-border;
  transition: background-color $duration-fast $ease-out;
  background: transparent;
  border: none;
  width: 100%;
  box-sizing: border-box;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:active {
    background-color: $color-bg-secondary;
  }
}

.menu-icon-wrapper {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-md;
  margin-right: $spacing-3;
  
  &.favorites { background: rgba(255, 107, 107, 0.12); }
  &.invite { background: rgba(167, 139, 250, 0.12); }
  &.points { background: rgba(255, 193, 7, 0.12); }
  &.feedback { background: rgba(78, 205, 196, 0.12); }
  &.about { background: rgba(96, 165, 250, 0.12); }
  &.share { background: rgba(52, 211, 153, 0.12); }
}

.menu-icon {
  font-size: 36rpx;
}

.menu-title {
  flex: 1;
  font-size: $font-size-base;
  color: $color-text-primary;
  text-align: left;
}

.menu-badge {
  padding: $spacing-1 $spacing-3;
  background: rgba($color-primary, 0.12);
  border-radius: $radius-full;
  font-size: $font-size-xs;
  color: $color-primary;
  font-weight: $font-weight-medium;
  margin-right: $spacing-2;
}

.menu-arrow {
  font-size: $font-size-base;
  color: $color-text-tertiary;
}

// 登录区域
.login-section {
  padding: $spacing-5 $spacing-4;
  text-align: center;
}

.login-btn {
  @include button-base;
  background: linear-gradient(135deg, #07C160, #10D56A);
  color: $color-text-inverse;
  box-shadow: 0 12rpx 32rpx rgba(7, 193, 96, 0.35);
  padding: $spacing-4 $spacing-8;
  margin-bottom: $spacing-3;
  
  &:active {
    box-shadow: 0 8rpx 24rpx rgba(7, 193, 96, 0.4);
  }
}

.login-icon {
  font-size: 40rpx;
  margin-right: $spacing-2;
}

.login-text {
  font-size: $font-size-md;
  font-weight: $font-weight-bold;
}

.login-tip {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.safe-bottom {
  height: 120rpx;
}
</style>
