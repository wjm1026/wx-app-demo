<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">积分明细</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="hero-card">
      <view class="hero-glow hero-glow-left"></view>
      <view class="hero-glow hero-glow-right"></view>

      <view class="hero-badge">
        <image class="hero-badge-icon" src="/static/icons/line/coins.svg" mode="aspectFit" />
        <text class="hero-badge-text">积分钱包</text>
      </view>

      <view class="hero-main">
        <view class="hero-copy">
          <text class="hero-label">当前可用积分</text>
          <text class="hero-value">{{ store.userInfo?.points || 0 }}</text>
          <text class="hero-desc">学习、签到和邀请奖励都会沉淀在这里</text>
        </view>

        <view class="hero-orbit">
          <view class="hero-orbit-ring"></view>
          <view class="hero-orbit-core">
            <image class="hero-orbit-icon" src="/static/icons/line/gift.svg" mode="aspectFit" />
          </view>
        </view>
      </view>

      <view class="hero-stats">
        <view v-for="item in summaryCards" :key="item.key" class="hero-stat" :class="item.tone">
          <text class="hero-stat-value">{{ item.value }}</text>
          <text class="hero-stat-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <view class="content-wrapper">
      <view class="section-head">
        <view class="section-title-wrap">
          <image class="section-title-icon" src="/static/icons/line/bar-chart.svg" mode="aspectFit" />
          <view class="section-title-copy">
            <text class="section-title">积分流水</text>
            <text class="section-subtitle">{{ sectionHint }}</text>
          </view>
        </view>
      </view>

      <view v-if="loading && logs.length === 0" class="skeleton-list">
        <view v-for="item in 3" :key="item" class="skeleton-card">
          <view class="skeleton-icon"></view>
          <view class="skeleton-copy">
            <view class="skeleton-line skeleton-line-lg"></view>
            <view class="skeleton-line skeleton-line-sm"></view>
          </view>
          <view class="skeleton-amount"></view>
        </view>
      </view>

      <view v-else-if="decoratedLogs.length > 0" class="log-list">
        <view v-for="item in decoratedLogs" :key="item.key" class="log-card">
          <view class="log-main">
            <view class="log-icon-shell" :class="item.iconTone">
              <image class="log-icon" :src="item.icon" mode="aspectFit" />
            </view>

            <view class="log-copy">
              <view class="log-title-row">
                <text class="log-title">{{ item.title }}</text>
                <text class="log-chip" :class="item.chipTone">{{ item.chipLabel }}</text>
              </view>

              <view class="log-meta">
                <text class="log-time">{{ item.timeLabel }}</text>
                <text class="log-dot"></text>
                <text class="log-relative">{{ item.relativeTimeLabel }}</text>
              </view>

              <text v-if="item.balanceLabel" class="log-balance">{{ item.balanceLabel }}</text>
            </view>

            <view class="log-amount-block">
              <text class="log-amount" :class="item.amountTone">{{ item.amountLabel }}</text>
              <text class="log-direction">{{ item.directionLabel }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="!loading" class="empty-state">
        <view class="empty-visual">
          <image class="empty-icon" src="/static/icons/line/coins.svg" mode="aspectFit" />
        </view>
        <text class="empty-title">还没有积分流水</text>
        <text class="empty-text">去学习卡片、完成签到或邀请好友，记录就会出现在这里。</text>
      </view>

      <view v-if="loading || logs.length > 0" class="loading-status">
        <text>{{ loading ? '正在同步积分流水...' : finished ? '已经看到最后一条了' : '继续下拉查看更多记录' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { usePointsLogPage } from './hooks/usePointsLogPage'

const { decoratedLogs, finished, goBack, loading, logs, sectionHint, statusBarHeight, store, summaryCards } = usePointsLogPage()
</script>

<style src="./styles/points-log.scss" scoped lang="scss"></style>
