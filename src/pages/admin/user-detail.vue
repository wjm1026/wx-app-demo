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
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { showToast } from '@/utils'
import { adminApi, type AdminUserDetailResult, type PointsLogItem } from '@/api'
import { usePageLayout } from '@/composables/usePageLayout'

const { statusBarHeight } = usePageLayout()
const userId = ref('')
const userInfo = ref<AdminUserDetailResult['user'] | null>(null)
const favoriteCount = ref(0)
const invitedCount = ref(0)
const recentPoints = ref<PointsLogItem[]>([])
const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

// Modal State
const showPointsModal = ref(false)
const adjustForm = reactive({
  amount: '',
  reason: ''
})

onLoad((options) => {
  const id = typeof options?.id === 'string' ? options.id : ''
  if (id) {
    userId.value = id
    loadUserDetail()
  } else {
    showToast('参数错误')
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

function goBack() {
  uni.navigateBack()
}

function formatDate(timestamp: number | string | undefined) {
  if (!timestamp) return '-'
  const date = new Date(Number(timestamp))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function copyId() {
  if (!userInfo.value?._id) {
    return
  }

  uni.setClipboardData({
    data: userInfo.value._id,
    success: () => showToast('ID已复制')
  })
}

async function loadUserDetail() {
  try {
    uni.showLoading({ title: '加载中...' })
    const res = await adminApi.getUserDetail(userId.value)
    if (res.code === 0 && res.data) {
      userInfo.value = res.data.user
      favoriteCount.value = res.data.favoriteCount || 0
      invitedCount.value = res.data.invitedCount || 0
      recentPoints.value = res.data.recentPoints || []
    }
  } catch (e) {
    showToast('加载失败')
    console.error(e)
  } finally {
    uni.hideLoading()
  }
}

async function toggleUserStatus() {
  if (!userInfo.value) return
  
  const isBanned = userInfo.value.status === 2
  const actionText = isBanned ? '解封' : '封禁'
  const newStatus = isBanned ? 1 : 2
  
  uni.showModal({
    title: '确认操作',
    content: `确定要${actionText}该用户吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' })
          const apiRes = await adminApi.updateUserStatus(userId.value, newStatus)
          if (apiRes.code === 0) {
            showToast(`${actionText}成功`)
            loadUserDetail()
          } else {
            showToast(apiRes.msg || '操作失败')
          }
        } catch (e) {
          showToast('操作失败')
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

async function toggleUserRole() {
  if (!userInfo.value) return
  
  const isAdmin = userInfo.value.role === 'admin'
  const actionText = isAdmin ? '取消管理员' : '设为管理员'
  const newRole = isAdmin ? 'user' : 'admin'
  
  uni.showModal({
    title: '确认操作',
    content: `确定要${actionText}吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' })
          const apiRes = await adminApi.setUserRole(userId.value, newRole)
          if (apiRes.code === 0) {
            showToast('设置成功')
            loadUserDetail()
          } else {
            showToast(apiRes.msg || '操作失败')
          }
        } catch (e) {
          showToast('操作失败')
        } finally {
          uni.hideLoading()
        }
      }
    }
  })
}

function openPointsModal() {
  adjustForm.amount = ''
  adjustForm.reason = ''
  showPointsModal.value = true
}

function closePointsModal() {
  showPointsModal.value = false
}

async function submitPointsAdjust() {
  if (!adjustForm.amount) {
    showToast('请输入变动数量')
    return
  }
  
  const amount = parseInt(adjustForm.amount)
  if (isNaN(amount)) {
    showToast('请输入有效的数字')
    return
  }
  
  try {
    uni.showLoading({ title: '处理中...' })
    const res = await adminApi.adjustUserPoints(userId.value, amount, adjustForm.reason || '管理员调整')
    if (res.code === 0) {
      showToast('调整成功')
      closePointsModal()
      loadUserDetail()
    } else {
      showToast(res.msg || '调整失败')
    }
  } catch (e) {
    showToast('调整失败')
  } finally {
    uni.hideLoading()
  }
}
</script>

<style scoped lang="scss">
@import '@/styles/design-system.scss';

.page {
  min-height: 100vh;
  background-color: $color-bg-primary;
  padding-bottom: $spacing-6;
}

.nav-bar {
  background: $gradient-primary;
  color: #fff;
}

.nav-content {
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 $spacing-2;
  position: relative;
}

.back-btn {
  padding: $spacing-2;
  font-size: $font-size-xl;
}

.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
}

.header {
  background: $gradient-primary;
  padding: $spacing-4 $spacing-4 $spacing-8;
  border-radius: 0 0 $radius-2xl $radius-2xl;
  position: relative;
  overflow: hidden;
  margin-bottom: $spacing-4;
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
}

.user-profile {
  display: flex;
  align-items: center;
  gap: $spacing-4;
  position: relative;
  z-index: 1;
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: $radius-full;
  border: 6rpx solid rgba(255, 255, 255, 0.5);
  background-color: #fff;
}

.role-badge {
  position: absolute;
  bottom: -10rpx;
  left: 50%;
  transform: translateX(-50%);
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: $radius-full;
  color: #fff;
  white-space: nowrap;
  
  &.admin {
    background: $color-secondary-dark;
    box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.2);
  }
}

.status-badge {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: $radius-full;
  color: #fff;
  
  &.banned {
    background: $color-error;
    border: 2rpx solid #fff;
  }
}

.info-content {
  flex: 1;
  color: #fff;
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
}

.vip-tag {
  background: rgba(255, 255, 255, 0.2);
  padding: 2rpx 8rpx;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
}

.vip-icon {
  font-size: 24rpx;
}

.id-row, .time-row {
  font-size: $font-size-sm;
  opacity: 0.9;
  margin-bottom: 4rpx;
}

.copy-btn {
  display: inline-block;
  font-size: 20rpx;
  background: rgba(255, 255, 255, 0.2);
  padding: 0 10rpx;
  border-radius: 8rpx;
  margin-left: $spacing-2;
}

.content-body {
  padding: 0 $spacing-4;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-3;
  margin-bottom: $spacing-6;
}

.stat-card {
  @include card-base;
  padding: $spacing-3;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: $spacing-2;
  
  .stat-icon {
    font-size: 48rpx;
  }
  
  .stat-value {
    font-size: $font-size-lg;
    font-weight: $font-weight-bold;
    color: $color-text-primary;
    display: block;
  }
  
  .stat-label {
    font-size: $font-size-xs;
    color: $color-text-tertiary;
  }
}

.section-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: $spacing-3;
  padding-left: $spacing-2;
  border-left: 8rpx solid $color-primary;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-3;
  margin-bottom: $spacing-6;
}

.action-btn {
  @include card-base;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-3;
  height: 160rpx;
  font-size: $font-size-sm;
  color: $color-text-primary;
  border: none;
  background: #fff;
  line-height: 1.4;
  
  .btn-icon {
    font-size: 48rpx;
    margin-bottom: $spacing-2;
  }
  
  &.ban {
    color: $color-error;
    background: rgba($color-error, 0.05);
  }
  
  &.unban {
    color: $color-success;
    background: rgba($color-success, 0.05);
  }
  
  &.role.is-admin {
    color: $color-warning;
    background: rgba($color-warning, 0.05);
  }
  
  &:active {
    transform: scale(0.96);
  }
}

.log-list {
  background: #fff;
  border-radius: $radius-lg;
  padding: $spacing-2;
  box-shadow: $shadow-sm;
}

.log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-3;
  border-bottom: 2rpx solid $color-border;
  
  &:last-child {
    border-bottom: none;
  }
}

.log-left {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.log-reason {
  font-size: $font-size-base;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

.log-time {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.log-amount {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-secondary;
  
  &.plus {
    color: $color-success;
  }
  
  &.minus {
    color: $color-error;
  }
}

.empty-state {
  padding: $spacing-8;
  text-align: center;
  color: $color-text-tertiary;
  font-size: $font-size-sm;
}

/* Modal Styles */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 80%;
  background: #fff;
  border-radius: $radius-xl;
  overflow: hidden;
  animation: bounce-in 0.3s $ease-bounce;
}

.modal-header {
  padding: $spacing-4;
  background: $gradient-primary;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
}

.modal-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
}

.close-icon {
  font-size: 40rpx;
  line-height: 1;
  padding: 0 $spacing-2;
}

.modal-body {
  padding: $spacing-4;
}

.form-item {
  margin-bottom: $spacing-4;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  display: block;
  font-size: $font-size-sm;
  color: $color-text-secondary;
  margin-bottom: $spacing-2;
}

.form-input {
  @include input-base;
  background: $color-bg-secondary;
}

.modal-footer {
  padding: $spacing-4;
  display: flex;
  gap: $spacing-3;
  border-top: 2rpx solid $color-border;
}

.modal-btn {
  flex: 1;
  @include button-base;
  font-size: $font-size-sm;
  
  &.cancel {
    background: $color-bg-secondary;
    color: $color-text-secondary;
  }
  
  &.confirm {
    background: $gradient-primary;
    color: #fff;
    box-shadow: $shadow-colored;
  }
}
</style>
