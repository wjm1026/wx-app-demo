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
        <text class="invite-code">{{ inviteCode }}</text>
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
      
      <view v-if="invitedList.length === 0" class="empty-invited">
        <text class="empty-text">还没有邀请好友，快去分享吧</text>
      </view>

      <view v-else class="invited-list">
        <view v-for="item in invitedList" :key="item.id" class="invited-item">
          <image class="invited-avatar" :src="item.avatar" mode="aspectFill" />
          <view class="invited-info">
            <text class="invited-name">{{ item.nickname }}</text>
            <text class="invited-time">{{ item.time }}</text>
          </view>
          <text class="invited-reward">+100积分</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { showToast } from '@/utils'

const inviteCode = ref('ABC123')

const invitedList = ref([
  { id: '1', nickname: '可爱宝贝', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', time: '2天前' },
  { id: '2', nickname: '快乐妈妈', avatar: 'https://randomuser.me/api/portraits/women/2.jpg', time: '5天前' },
  { id: '3', nickname: '阳光爸爸', avatar: 'https://randomuser.me/api/portraits/men/1.jpg', time: '1周前' }
])

function copyCode() {
  uni.setClipboardData({
    data: inviteCode.value,
    success: () => {
      showToast('邀请码已复制', 'success')
    }
  })
}

function generatePoster() {
  showToast('生成海报中...')
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background-color: #FFF9F0;
}

.invite-header {
  background: linear-gradient(135deg, #FF6B6B, #FF8E8E);
  padding: 48rpx 32rpx;
}

.reward-card {
  background-color: #FFFFFF;
  border-radius: 32rpx;
  padding: 40rpx;
  text-align: center;
}

.reward-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #333333;
  display: block;
}

.reward-desc {
  font-size: 26rpx;
  color: #999999;
  margin-top: 12rpx;
  display: block;
}

.reward-items {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40rpx;
}

.reward-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.reward-value {
  font-size: 48rpx;
  font-weight: 700;
  color: #FF6B6B;
}

.reward-label {
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
}

.reward-divider {
  margin: 0 48rpx;
}

.reward-icon {
  font-size: 48rpx;
}

.invite-code-section {
  padding: 32rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 24rpx;
  display: block;
}

.code-box {
  display: flex;
  align-items: center;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.invite-code {
  flex: 1;
  font-size: 48rpx;
  font-weight: 700;
  color: #FF6B6B;
  letter-spacing: 8rpx;
}

.copy-btn {
  padding: 16rpx 32rpx;
  background: linear-gradient(135deg, #4ECDC4, #6EDDD4);
  border-radius: 999rpx;
}

.copy-text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.share-section {
  padding: 0 32rpx 32rpx;
}

.share-buttons {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100rpx;
  border-radius: 24rpx;
  border: none;
  background-color: #FFFFFF;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.share-btn.wechat {
  background: linear-gradient(135deg, #07C160, #10D56A);
}

.share-btn.wechat .share-text {
  color: #FFFFFF;
}

.share-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.share-text {
  font-size: 30rpx;
  color: #333333;
  font-weight: 500;
}

.invited-section {
  padding: 0 32rpx 32rpx;
}

.section-header {
  margin-bottom: 24rpx;
}

.empty-invited {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 60rpx;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

.invited-list {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.invited-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #F5F5F5;
}

.invited-item:last-child {
  border-bottom: none;
}

.invited-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.invited-info {
  flex: 1;
}

.invited-name {
  font-size: 28rpx;
  color: #333333;
  display: block;
}

.invited-time {
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
  display: block;
}

.invited-reward {
  font-size: 26rpx;
  color: #FF6B6B;
  font-weight: 500;
}
</style>
