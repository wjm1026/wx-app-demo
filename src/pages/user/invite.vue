<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">邀请好友</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="hero-card">
      <view class="hero-glow hero-glow-left"></view>
      <view class="hero-glow hero-glow-right"></view>

      <view class="hero-badge">
        <image class="hero-badge-icon" src="/static/icons/line/share.svg" mode="aspectFit" />
        <text class="hero-badge-text">好友邀请计划</text>
      </view>

      <view class="hero-main">
        <view class="hero-copy">
          <text class="hero-title">分享邀请码，让好友一起学认知</text>
          <text class="hero-desc">每邀请 1 位好友加入学习计划，你可获得 +100 积分，好友同步获得 +50 欢迎奖励。</text>
        </view>
      </view>

      <view class="hero-reward-strip">
        <view class="reward-chip">
          <text class="reward-chip-label">你获得</text>
          <text class="reward-chip-value">+100</text>
        </view>
        <view class="reward-divider">
          <image class="reward-divider-icon" src="/static/icons/line/gift.svg" mode="aspectFit" />
        </view>
        <view class="reward-chip">
          <text class="reward-chip-label">好友获得</text>
          <text class="reward-chip-value">+50</text>
        </view>
      </view>

      <view class="invite-code-card">
        <view class="invite-code-copy">
          <text class="invite-code-label">专属邀请码</text>
          <text class="invite-code-value">{{ inviteCode || '------' }}</text>
        </view>
        <view class="invite-code-btn" @click="copyCode">复制</view>
      </view>

      <view class="hero-stats">
        <view v-for="item in summaryCards" :key="item.key" class="hero-stat" :class="item.tone">
          <view class="hero-stat-icon-shell">
            <image class="hero-stat-icon" :src="item.icon" mode="aspectFit" />
          </view>
          <text class="hero-stat-value">{{ item.value }}</text>
          <text class="hero-stat-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <view class="content-wrapper">
      <view class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/wechat.svg" mode="aspectFit" />
            <view class="section-title-copy">
              <text class="section-title">立即分享</text>
              <text class="section-subtitle">优先把邀请码发给微信好友，转换路径最短</text>
            </view>
          </view>
        </view>

        <view class="share-actions">
          <button class="share-action share-primary" open-type="share">
            <view class="share-action-main">
              <view class="share-action-icon-shell">
                <image class="share-action-icon" src="/static/icons/line/wechat.svg" mode="aspectFit" />
              </view>
              <view class="share-action-copy">
                <text class="share-action-title">分享给微信好友</text>
                <text class="share-action-desc">直接带上邀请码，邀请链路更顺畅</text>
              </view>
            </view>
            <image class="share-action-arrow" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
          </button>

          <view class="share-action share-secondary" @click="generatePoster">
            <view class="share-action-main">
              <view class="share-action-icon-shell">
                <image class="share-action-icon" src="/static/icons/line/message.svg" mode="aspectFit" />
              </view>
              <view class="share-action-copy">
                <text class="share-action-title">生成分享海报</text>
                <text class="share-action-desc">适合发朋友圈或聊天群</text>
              </view>
            </view>
            <image class="share-action-arrow" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/users.svg" mode="aspectFit" />
            <view class="section-title-copy">
              <text class="section-title">邀请记录</text>
              <text class="section-subtitle">{{ sectionHint }}</text>
            </view>
          </view>
        </view>

        <view v-if="loading" class="loading-panel">
          <view class="loading-spinner"></view>
          <text class="loading-text">正在同步邀请记录...</text>
        </view>

        <view v-else-if="decoratedInvitedList.length > 0" class="invite-list">
          <view v-for="item in decoratedInvitedList" :key="item.key" class="invite-item">
            <image class="invite-avatar" :src="item.avatar" mode="aspectFill" />

            <view class="invite-item-copy">
              <view class="invite-item-top">
                <text class="invite-name">{{ item.nickname }}</text>
                <text class="invite-reward">{{ item.rewardLabel }}</text>
              </view>
              <view class="invite-meta">
                <text class="invite-time">{{ item.timeLabel }}</text>
                <text class="invite-dot"></text>
                <text class="invite-relative">{{ item.relativeLabel }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty-state">
          <view class="empty-icon-shell">
            <image class="empty-icon" src="/static/icons/line/share.svg" mode="aspectFit" />
          </view>
          <text class="empty-title">还没有邀请好友</text>
          <text class="empty-text">把邀请码发出去后，成功加入的好友会在这里展示出来。</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useInvitePage } from './useInvitePage'

const {
  copyCode,
  decoratedInvitedList,
  generatePoster,
  goBack,
  inviteCode,
  loading,
  sectionHint,
  statusBarHeight,
  summaryCards,
} = useInvitePage()
</script>

<style src="./invite.scss" scoped lang="scss"></style>
