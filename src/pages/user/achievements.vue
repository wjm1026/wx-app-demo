<template>
  <view class="page">
    <view class="header">
      <view class="progress-section">
        <view class="progress-title">
          <text class="progress-label">学习进度</text>
          <text class="progress-value">{{ progress.cardsLearned }}/{{ progress.totalCards }}</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progress.progress + '%' }"></view>
        </view>
        <text class="progress-percent">{{ progress.progress }}%</text>
      </view>
      
      <view class="stats-row">
        <view class="stat-item">
          <text class="stat-icon">📚</text>
          <text class="stat-value">{{ progress.cardsLearned }}</text>
          <text class="stat-label">已学卡片</text>
        </view>
        <view class="stat-item">
          <text class="stat-icon">🔥</text>
          <text class="stat-value">{{ progress.signStreak }}</text>
          <text class="stat-label">连续签到</text>
        </view>
        <view class="stat-item">
          <text class="stat-icon">🏆</text>
          <text class="stat-value">{{ achievements.unlockedCount }}/{{ achievements.totalCount }}</text>
          <text class="stat-label">成就解锁</text>
        </view>
      </view>
    </view>

    <view class="content">
      <view v-if="progress.categoryProgress.length > 0" class="section">
        <text class="section-title">分类进度</text>
        <view class="category-list">
          <view 
            v-for="cat in progress.categoryProgress" 
            :key="cat.categoryId"
            class="category-item"
            :class="{ complete: cat.isComplete }"
          >
            <view class="category-header">
              <text class="category-icon">{{ cat.icon }}</text>
              <text class="category-name">{{ cat.name }}</text>
              <text v-if="cat.isComplete" class="complete-badge">✅</text>
            </view>
            <view class="category-progress">
              <view class="category-bar">
                <view class="category-fill" :style="{ width: cat.progress + '%' }"></view>
              </view>
              <text class="category-text">{{ cat.learned }}/{{ cat.total }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">成就徽章</text>
        <view class="achievements-grid">
          <view 
            v-for="achievement in achievements.achievements" 
            :key="achievement.id"
            class="achievement-item"
            :class="{ unlocked: achievement.unlocked, locked: !achievement.unlocked }"
          >
            <view class="achievement-icon-wrapper">
              <text class="achievement-icon">{{ achievement.icon }}</text>
              <view v-if="!achievement.unlocked" class="lock-overlay">🔒</view>
            </view>
            <text class="achievement-name">{{ achievement.name }}</text>
            <text class="achievement-desc">{{ achievement.description }}</text>
            <view v-if="achievement.unlocked" class="achievement-reward">
              <text class="reward-text">+{{ achievement.points }}积分</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="isLoading" class="loading-overlay">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useAchievementsPage } from './useAchievementsPage'

const { achievements, isLoading, progress } = useAchievementsPage()
</script>

<style src="./achievements.scss" scoped lang="scss"></style>
