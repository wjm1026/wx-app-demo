<template>
  <view class="page">
    <view class="invite-header">
      <view class="reward-card">
        <text class="reward-title">邀请好友 一起学习</text>
        <text class="reward-desc">每邀请1位好友，双方各得积分奖励</text>
        <view class="reward-items">
          <view class="reward-item">
            <text class="reward-value">+100</text>
            <text class="reward-label">你获得积分</text>
          </view>
          <view class="reward-divider">
            <text class="reward-icon">🎁</text>
          </view>
          <view class="reward-item">
            <text class="reward-value">+50</text>
            <text class="reward-label">好友获得积分</text>
          </view>
        </view>
      </view>
    </view>

    <view class="invite-code-section">
      <text class="section-title">我的邀请码</text>
      <view class="code-box">
        <text class="invite-code">{{ inviteCode || '------' }}</text>
        <view class="copy-btn" @click="copyCode">
          <text class="copy-text">复制</text>
        </view>
      </view>
    </view>

    <view class="share-section">
      <text class="section-title">分享方式</text>
      <view class="share-buttons">
        <button class="share-btn wechat" open-type="share">
          <text class="share-icon">💬</text>
          <text class="share-text">分享给微信好友</text>
        </button>
        <view class="share-btn poster" @click="generatePoster">
          <text class="share-icon">🖼️</text>
          <text class="share-text">生成分享海报</text>
        </view>
      </view>
    </view>

    <view class="invited-section">
      <view class="section-header">
        <text class="section-title">已邀请好友 ({{ invitedList.length }}人)</text>
      </view>
      
      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="invitedList.length === 0" class="empty-invited">
        <text class="empty-text">还没有邀请好友，快去分享吧</text>
      </view>

      <view v-else class="invited-list">
        <view v-for="(item, index) in invitedList" :key="item._id || index" class="invited-item">
          <image class="invited-avatar" :src="item.avatar || defaultAvatar" mode="aspectFill" />
          <view class="invited-info">
            <text class="invited-name">{{ item.nickname || '微信用户' }}</text>
            <text class="invited-time">{{ formatDate(item.created_at || item.time) }}</text>
          </view>
          <text class="invited-reward">+100积分</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { userApi } from '@/api'
import { useStore } from '@/store'
import { showToast } from '@/utils'

const store = useStore()
const inviteCode = ref('')
const invitedList = ref<any[]>([])
const loading = ref(false)
const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

function formatDate(date: string | number) {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  if (diff < 86400000) {
    return '今天'
  } else if (diff < 86400000 * 2) {
    return '昨天'
  } else if (diff < 86400000 * 7) {
    return Math.floor(diff / 86400000) + '天前'
  } else {
    return d.toISOString().split('T')[0]
  }
}

onShow(async () => {
  if (!store.isLoggedIn) {
    showToast('请先登录', 'none')
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login/login' })
    }, 1500)
    return
  }
  
  // Use store invite code as initial value/fallback
  if (store.userInfo?.invite_code) {
    inviteCode.value = store.userInfo.invite_code
  }
  
  await loadInviteData()
})

async function loadInviteData() {
  loading.value = true
  try {
    const res = await userApi.getInviteInfo()
    if (res.code === 0) {
      if (res.data) {
        // Handle various possible response structures gracefully
        if (res.data.invite_code || res.data.inviteCode) {
          inviteCode.value = res.data.invite_code || res.data.inviteCode
        }
        
        const list = res.data.list || res.data.invitedList || res.data.invited_users || []
        invitedList.value = Array.isArray(list) ? list : []
      }
    } else {
      showToast(res.msg || '获取邀请信息失败')
    }
  } catch (error) {
    console.error('Failed to load invite info:', error)
    showToast('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

function copyCode() {
  if (!inviteCode.value) return
  
  uni.setClipboardData({
    data: inviteCode.value,
    success: () => {
      showToast('邀请码已复制', 'success')
    }
  })
}

function generatePoster() {
  showToast('生成海报中...')
  // Placeholder for poster generation logic
}
</script>

<style scoped lang="scss">
@import "@/styles/design-system.scss";

.page {
  min-height: 100vh;
  background-color: $color-bg-primary;
}

.invite-header {
  background: linear-gradient(135deg, $color-primary, $color-primary-light);
  padding: $spacing-6 $spacing-4;
}

.reward-card {
  background-color: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-5;
  text-align: center;
  box-shadow: $shadow-md;
}

.reward-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  display: block;
}

.reward-desc {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  margin-top: $spacing-2;
  display: block;
}

.reward-items {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: $spacing-5;
}

.reward-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.reward-value {
  font-size: $font-size-2xl; // 48rpx -> 56rpx approx, or stick to exact if needed. 48rpx is between xl and 2xl. Let's use 2xl for emphasis or raw value. Design system base is 30rpx. 
  // Original was 48rpx. $font-size-xl is 44rpx. $font-size-2xl is 56rpx.
  // I'll stick to variable for consistency.
  font-size: 48rpx; // Keeping manually if variables don't match exactly, or use closest.
  font-weight: $font-weight-bold;
  color: $color-primary;
}

.reward-label {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-top: $spacing-1;
}

.reward-divider {
  margin: 0 $spacing-6;
}

.reward-icon {
  font-size: 48rpx;
}

.invite-code-section {
  padding: $spacing-4;
}

.section-title {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-3;
  display: block;
}

.code-box {
  display: flex;
  align-items: center;
  background-color: $color-bg-card;
  border-radius: $radius-md;
  padding: $spacing-4;
  box-shadow: $shadow-sm;
}

.invite-code {
  flex: 1;
  font-size: 48rpx;
  font-weight: $font-weight-bold;
  color: $color-primary;
  letter-spacing: 8rpx;
}

.copy-btn {
  padding: $spacing-2 $spacing-4;
  background: linear-gradient(135deg, $color-secondary, $color-secondary-light);
  border-radius: $radius-full;
  box-shadow: 0 4rpx 12rpx rgba($color-secondary, 0.3);
  
  &:active {
    opacity: 0.9;
    transform: scale(0.98);
  }
}

.copy-text {
  font-size: $font-size-sm;
  color: $color-text-inverse;
  font-weight: $font-weight-medium;
}

.share-section {
  padding: 0 $spacing-4 $spacing-4;
}

.share-buttons {
  display: flex;
  flex-direction: column;
  gap: $spacing-2; // 20rpx is close to spacing-2 (16rpx) or spacing-3 (24rpx)
}

.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100rpx;
  border-radius: $radius-md;
  border: none;
  background-color: $color-bg-card;
  box-shadow: $shadow-sm;
  
  &::after {
    border: none;
  }
  
  &:active {
    background-color: #FAFAFA;
  }
}

.share-btn.wechat {
  background: linear-gradient(135deg, #07C160, #10D56A);
}

.share-btn.wechat .share-text {
  color: $color-text-inverse;
}

.share-icon {
  font-size: $font-size-lg;
  margin-right: $spacing-2;
}

.share-text {
  font-size: $font-size-base;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

.invited-section {
  padding: 0 $spacing-4 $spacing-4;
}

.section-header {
  margin-bottom: $spacing-3;
}

.empty-invited {
  background-color: $color-bg-card;
  border-radius: $radius-md;
  padding: $spacing-8;
  text-align: center;
}

.empty-text {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.loading-state {
  padding: $spacing-8;
  text-align: center;
}

.loading-text {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.invited-list {
  background-color: $color-bg-card;
  border-radius: $radius-md;
  overflow: hidden;
  box-shadow: $shadow-sm;
}

.invited-item {
  display: flex;
  align-items: center;
  padding: $spacing-3;
  border-bottom: 1rpx solid $color-border;
}

.invited-item:last-child {
  border-bottom: none;
}

.invited-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: $spacing-2;
  background-color: $color-bg-secondary;
}

.invited-info {
  flex: 1;
}

.invited-name {
  font-size: $font-size-sm;
  color: $color-text-primary;
  display: block;
}

.invited-time {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-top: 4rpx;
  display: block;
}

.invited-reward {
  font-size: $font-size-sm;
  color: $color-primary;
  font-weight: $font-weight-medium;
}
</style>