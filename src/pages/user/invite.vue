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
            <text class="invited-time">{{ formatDate(item.create_time || item.created_at || item.time) }}</text>
          </view>
          <text class="invited-reward">+100积分</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useInvitePage } from './useInvitePage'

const {
  copyCode,
  defaultAvatar,
  formatDate,
  generatePoster,
  inviteCode,
  invitedList,
  loading,
} = useInvitePage()
</script>

<style src="./invite.scss" scoped lang="scss"></style>
