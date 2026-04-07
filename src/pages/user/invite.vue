<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">赚取积分</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="hero-card">
      <view class="hero-grid"></view>
      <view class="hero-glow hero-glow-left"></view>
      <view class="hero-glow hero-glow-right"></view>

      <view class="hero-badge">
        <image class="hero-badge-icon" src="/static/icons/line/coins.svg" mode="aspectFit" />
        <text class="hero-badge-text">积分任务中心</text>
      </view>

      <view class="hero-main">
        <text class="hero-title">完成传播任务，把流量变成积分</text>
        <text class="hero-desc">
          分享给朋友、发朋友圈、发抖音、发小红书等任务都会带来不同的积分机会，先把分享口令准备好，再把内容发出去。
        </text>
      </view>

      <view v-if="!isLoggedIn && landingInviteCode" class="landing-tip">
        <text class="landing-tip-label">当前好友邀请码</text>
        <text class="landing-tip-value">{{ landingInviteCode }}</text>
        <text class="landing-tip-desc">登录后会自动绑定这次邀请关系，并生成你自己的分享口令。</text>
      </view>

      <view class="invite-code-card">
        <view class="invite-code-copy">
          <text class="invite-code-label">{{ inviteCodeLabel }}</text>
          <text class="invite-code-value">{{ displayInviteCode || '------' }}</text>
          <text class="invite-code-hint">{{ inviteCodeHint }}</text>
        </view>
        <view class="invite-code-btn" @click="copyCode">复制口令</view>
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
      <view v-if="!isLoggedIn" class="login-banner">
        <view class="login-banner-copy">
          <text class="login-banner-title">登录后开始积分任务</text>
          <text class="login-banner-desc">分享朋友任务会直接走真实邀请链路，其他平台任务也会同步解锁。</text>
        </view>
        <view class="login-banner-btn" @click="goLogin">立即登录</view>
      </view>

      <view v-if="showManualInviteInput" class="section-card manual-invite-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/message.svg" mode="aspectFit" />
            <view class="section-title-copy">
              <text class="section-title">手动输入好友邀请码</text>
              <text class="section-subtitle">站外来的流量可先留码；登录后若仍未绑定邀请人，也能在 24 小时内补绑一次。</text>
            </view>
          </view>
        </view>

        <view class="manual-invite-form">
          <input
            v-model="manualInviteCode"
            class="manual-invite-input"
            maxlength="6"
            placeholder="输入 6 位好友邀请码"
            placeholder-class="manual-invite-placeholder"
          />
          <view class="manual-invite-btn" @click="saveManualInviteCode">{{ manualInviteActionLabel }}</view>
        </view>

        <text class="manual-invite-hint">{{ manualInviteHint }}</text>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/gift.svg" mode="aspectFit" />
            <view class="section-title-copy">
              <text class="section-title">积分任务</text>
              <text class="section-subtitle">不同平台对应不同积分，先做最容易转化的动作。</text>
            </view>
          </view>
        </view>

        <view class="task-list">
          <view v-for="item in missionCards" :key="item.key" class="task-card" :class="item.tone">
            <view class="task-top">
              <view class="task-icon-shell">
                <image class="task-icon" :src="item.icon" mode="aspectFit" />
              </view>
              <view class="task-points">+{{ item.points }}</view>
            </view>

            <view class="task-tag-row">
              <text class="task-tag">{{ item.channel }}</text>
              <text class="task-reward-label">任务积分</text>
            </view>

            <text class="task-title">{{ item.title }}</text>
            <text class="task-desc">{{ item.desc }}</text>
            <text class="task-note">{{ item.note }}</text>

            <button
              v-if="item.actionType === 'share' && item.enabled"
              class="task-btn"
              open-type="share"
            >
              {{ item.actionLabel }}
            </button>
            <view
              v-else
              class="task-btn"
              :class="{ disabled: !item.enabled }"
              @click="handleMission(item.key)"
            >
              {{ item.actionLabel }}
            </view>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/users.svg" mode="aspectFit" />
            <view class="section-title-copy">
              <text class="section-title">分享转化</text>
              <text class="section-subtitle">{{ conversionHint }}</text>
            </view>
          </view>
        </view>

        <view v-if="loading" class="loading-panel">
          <view class="loading-spinner"></view>
          <text class="loading-text">正在同步转化记录...</text>
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
          <text class="empty-title">还没有新的转化</text>
          <text class="empty-text">先完成分享朋友任务，真实加入的小伙伴会在这里出现。</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useInvitePage } from './hooks/useInvitePage'

const {
  buildShareAppMessagePayload,
  buildShareTimelinePayload,
  conversionHint,
  copyCode,
  decoratedInvitedList,
  displayInviteCode,
  goBack,
  goLogin,
  handleMission,
  inviteCodeHint,
  inviteCodeLabel,
  isLoggedIn,
  landingInviteCode,
  loading,
  manualInviteActionLabel,
  manualInviteCode,
  manualInviteHint,
  missionCards,
  saveManualInviteCode,
  showManualInviteInput,
  statusBarHeight,
  summaryCards,
} = useInvitePage()

onShareAppMessage(() => buildShareAppMessagePayload())
onShareTimeline(() => buildShareTimelinePayload())
</script>

<style src="./styles/invite.scss" scoped lang="scss"></style>
