<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">学习成就</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="hero-card">
      <view class="hero-grid-pattern"></view>

      <view class="hero-topline">
        <view class="hero-badge">
          <image class="hero-badge-icon" src="/static/icons/line/trophy.svg" mode="aspectFit" />
          <text class="hero-badge-text">成长旅程</text>
        </view>
        <text class="hero-progress">{{ progress.progress }}%</text>
      </view>

      <view class="hero-main">
        <view class="hero-copy">
          <text class="hero-label">学习进度</text>
          <text class="hero-value">{{ progress.cardsLearned }}/{{ progress.totalCards }}</text>
          <text class="hero-desc">{{ completionLabel }}</text>
        </view>
      </view>

      <view class="hero-track">
        <view class="hero-track-fill" :style="{ width: `${progress.progress}%` }"></view>
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
      <view v-if="decoratedCategories.length > 0" class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/bar-chart.svg" mode="aspectFit" />
            <view class="section-title-copy">
              <text class="section-title">分类进度</text>
              <text class="section-subtitle">每个分类都是一段新的学习旅程</text>
            </view>
          </view>
        </view>

        <view class="category-list">
          <view
            v-for="item in decoratedCategories"
            :key="item.key"
            class="category-card"
            :class="[item.tone, { complete: item.isComplete }]"
          >
            <view class="category-main">
              <view class="category-copy">
                <text class="category-name">{{ item.name }}</text>
                <text class="category-status">{{ item.statusLabel }}</text>
              </view>
              <text class="category-count">{{ item.progressLabel }}</text>
            </view>

            <view class="category-track">
              <view class="category-track-fill" :style="{ width: `${item.progress}%` }"></view>
            </view>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/crown.svg" mode="aspectFit" />
            <view class="section-title-copy">
              <text class="section-title">已解锁勋章</text>
              <text class="section-subtitle">每一个阶段都值得被记录</text>
            </view>
          </view>
        </view>

        <view v-if="unlockedAchievements.length > 0" class="achievement-grid unlocked-grid">
          <view
            v-for="item in unlockedAchievements"
            :key="item.id"
            class="achievement-card unlocked"
            :class="item.tone"
          >
            <view class="achievement-icon-shell">
              <image class="achievement-icon" :src="item.iconSrc" mode="aspectFit" />
            </view>
            <text class="achievement-name">{{ item.name }}</text>
            <text class="achievement-desc">{{ item.description }}</text>
            <view class="achievement-reward">{{ item.rewardLabel }}</view>
          </view>
        </view>

        <view v-else class="empty-inline">
          <text class="empty-inline-text">继续学习第一张卡片，这里会出现你的第一枚勋章。</text>
        </view>
      </view>

      <view v-if="lockedAchievements.length > 0" class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/check-circle.svg" mode="aspectFit" />
            <view class="section-title-copy">
              <text class="section-title">待解锁目标</text>
              <text class="section-subtitle">快去完成这些小挑战</text>
            </view>
          </view>
        </view>

        <view class="achievement-grid locked-grid">
          <view
            v-for="item in lockedAchievements"
            :key="item.id"
            class="achievement-card locked"
            :class="item.tone"
          >
            <view class="achievement-icon-shell locked-shell">
              <image class="achievement-icon locked-icon" :src="item.iconSrc" mode="aspectFit" />
            </view>
            <text class="achievement-name">{{ item.name }}</text>
            <text class="achievement-desc">{{ item.description }}</text>
            <text class="achievement-status">{{ item.statusLabel }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="isLoading" class="loading-overlay">
      <view class="loading-card">
        <view class="loading-spinner"></view>
        <text class="loading-text">正在整理你的成长记录...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useAchievementsPage } from './hooks/useAchievementsPage'

const {
  completionLabel,
  decoratedCategories,
  isLoading,
  lockedAchievements,
  progress,
  statusBarHeight,
  summaryCards,
  unlockedAchievements,
} = useAchievementsPage()

/** 返回上一页 */
function goBack() {
  uni.navigateBack()
}
</script>

<style src="./styles/achievements.scss" scoped lang="scss"></style>
