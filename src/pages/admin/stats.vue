<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">数据统计</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="content-container">
      <view class="hero-card">
        <view class="hero-top">
          <view class="hero-badge">
            <image class="hero-badge-icon" src="/static/icons/line/bar-chart.svg" mode="aspectFit" />
            <text class="hero-badge-text">运营快照</text>
          </view>
          <view class="hero-chip" :class="{ 'is-loading': loading }">{{ liveStatusLabel }}</view>
        </view>

        <view class="hero-main">
          <view class="hero-copy">
            <text class="hero-title">{{ heroTitle }}</text>
            <text class="hero-desc">{{ heroSummary }}</text>
          </view>

          <view class="hero-aside">
            <text class="hero-aside-label">活跃渗透</text>
            <text class="hero-aside-value">{{ activeRate }}%</text>
            <text class="hero-aside-note">今日活跃 / 总用户</text>
          </view>
        </view>

        <view class="overview-grid">
          <view v-for="item in overviewCards" :key="item.key" class="overview-card">
            <view class="overview-icon-shell" :class="item.tone">
              <image class="overview-icon" :src="item.icon" mode="aspectFit" />
            </view>
            <text class="overview-label">{{ item.label }}</text>
            <text class="overview-value">{{ item.value }}</text>
            <text class="overview-meta">{{ item.meta }}</text>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <view class="section-icon-shell tone-blue">
              <image class="section-icon" src="/static/icons/line/heart.svg" mode="aspectFit" />
            </view>
            <view class="section-copy">
              <text class="section-title">今日动态</text>
              <text class="section-subtitle">只保留最关键的增长和活跃信号</text>
            </view>
          </view>
          <text class="section-caption">Today</text>
        </view>

        <view class="daily-grid">
          <view v-for="item in dailyCards" :key="item.key" class="daily-card" :class="item.tone">
            <view class="daily-card-top">
              <view class="daily-icon-shell">
                <image class="daily-icon" :src="item.icon" mode="aspectFit" />
              </view>
              <text class="daily-note">{{ item.note }}</text>
            </view>
            <text class="daily-label">{{ item.label }}</text>
            <view class="daily-value-row">
              <text class="daily-value">{{ item.value }}</text>
              <text class="daily-unit">{{ item.unit }}</text>
            </view>
            <text class="daily-desc">{{ item.desc }}</text>
          </view>
        </view>

        <view class="activity-strip">
          <view class="activity-copy">
            <text class="activity-title">活跃率 {{ activeRate }}%</text>
            <text class="activity-desc">{{ activityHint }}</text>
          </view>
          <view class="activity-track">
            <view
              class="activity-fill"
              :class="{ 'has-data': activeRate > 0 }"
              :style="{ width: activityFillWidth }"
            ></view>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head section-head-points">
          <view class="section-title-wrap">
            <view class="section-icon-shell tone-amber">
              <image class="section-icon" src="/static/icons/line/coins.svg" mode="aspectFit" />
            </view>
            <view class="section-copy">
              <text class="section-title">积分流向</text>
              <text class="section-subtitle">{{ pointsHeadline }}</text>
            </view>
          </view>
          <view class="section-aside">
            <text class="section-aside-label">净变化</text>
            <text class="section-aside-value" :class="{ negative: netPointChange < 0 }">
              {{ netPointChangeLabel }}
            </text>
          </view>
        </view>

        <view v-if="loading" class="state-panel">
          <text class="state-title">正在同步积分流水</text>
          <text class="state-desc">稍等一下，最新统计会自动补进来。</text>
        </view>

        <view v-else-if="pointItems.length === 0" class="state-panel empty">
          <text class="state-title">今天还没有积分变动</text>
          <text class="state-desc">等第一笔签到、奖励或消费发生后，这里会自动出现流向明细。</text>
        </view>

        <view v-else class="points-list">
          <view v-for="item in pointItems" :key="item.key" class="point-item">
            <view class="point-icon-shell" :class="item.tone">
              <image class="point-icon" :src="item.icon" mode="aspectFit" />
            </view>

            <view class="point-main">
              <view class="point-title-row">
                <text class="point-type">{{ item.label }}</text>
                <text class="point-badge" :class="{ negative: item.isNegative }">
                  {{ item.flowLabel }}
                </text>
              </view>
              <text class="point-meta">{{ item.countLabel }}</text>
            </view>

            <view class="point-value">
              <text class="point-amount" :class="{ negative: item.isNegative }">
                {{ item.amountLabel }}
              </text>
              <text class="point-amount-note">积分</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="safe-bottom"></view>
  </view>
</template>

<script setup lang="ts">
import { useAdminStatsPage } from './hooks/useAdminStatsPage'

const {
  activeRate,
  activityFillWidth,
  activityHint,
  dailyCards,
  goBack,
  heroSummary,
  heroTitle,
  liveStatusLabel,
  loading,
  netPointChange,
  netPointChangeLabel,
  overviewCards,
  pointItems,
  pointsHeadline,
  statusBarHeight,
} = useAdminStatsPage()
</script>

<style src="./styles/stats.scss" scoped lang="scss"></style>
