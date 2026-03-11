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
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { achievementApi, type Achievement, type LearningProgress } from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'

const { ensureLoggedIn } = useLoginGuard()
const isLoading = ref(true)

const progress = ref<LearningProgress>({
  cardsLearned: 0,
  totalCards: 0,
  progress: 0,
  signStreak: 0,
  categoryProgress: []
})

const achievements = ref<{
  achievements: Achievement[]
  unlockedCount: number
  totalCount: number
}>({
  achievements: [],
  unlockedCount: 0,
  totalCount: 0
})

onMounted(() => {
  if (!ensureLoggedIn()) {
    return
  }
  void loadData()
})

onShow(() => {
  if (!ensureLoggedIn()) {
    return
  }
  void loadData()
})

async function loadData() {
  isLoading.value = true
  try {
    const [progressRes, achievementsRes] = await Promise.all([
      achievementApi.getLearningProgress(),
      achievementApi.getAchievements()
    ])

    if (progressRes.code === 0 && progressRes.data) {
      progress.value = progressRes.data
    }

    if (achievementsRes.code === 0 && achievementsRes.data) {
      achievements.value = achievementsRes.data
    }
  } catch (e) {
    console.error('加载数据失败:', e)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background-color: $color-bg-primary;
}

.header {
  background: $gradient-primary;
  padding: $spacing-5 $spacing-4;
  border-radius: 0 0 $radius-2xl $radius-2xl;
}

.progress-section {
  background: rgba(255, 255, 255, 0.2);
  border-radius: $radius-lg;
  padding: $spacing-4;
  backdrop-filter: blur(10px);
}

.progress-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-2;
}

.progress-label {
  font-size: $font-size-base;
  color: $color-text-inverse;
  font-weight: $font-weight-medium;
}

.progress-value {
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.8);
}

.progress-bar {
  height: 16rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: $radius-full;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FFD700, #FFA500);
  border-radius: $radius-full;
  transition: width 0.5s ease;
}

.progress-percent {
  display: block;
  text-align: right;
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.8);
  margin-top: $spacing-1;
}

.stats-row {
  display: flex;
  justify-content: space-around;
  margin-top: $spacing-4;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-1;
}

.stat-icon {
  font-size: 36rpx;
}

.stat-value {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
}

.stat-label {
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.8);
}

.content {
  padding: $spacing-4;
}

.section {
  margin-bottom: $spacing-5;
}

.section-title {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-3;
  display: block;
  padding-left: $spacing-2;
  border-left: 6rpx solid $color-primary;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.category-item {
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-4;
  box-shadow: $shadow-sm;
  
  &.complete {
    background: linear-gradient(135deg, rgba(52, 211, 153, 0.1), rgba(16, 185, 129, 0.05));
    border: 2rpx solid rgba(52, 211, 153, 0.3);
  }
}

.category-header {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  margin-bottom: $spacing-2;
}

.category-icon {
  font-size: 32rpx;
}

.category-name {
  flex: 1;
  font-size: $font-size-base;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.complete-badge {
  font-size: 24rpx;
}

.category-progress {
  display: flex;
  align-items: center;
  gap: $spacing-3;
}

.category-bar {
  flex: 1;
  height: 12rpx;
  background: $color-bg-secondary;
  border-radius: $radius-full;
  overflow: hidden;
}

.category-fill {
  height: 100%;
  background: $gradient-primary;
  border-radius: $radius-full;
  transition: width 0.3s ease;
}

.category-text {
  font-size: $font-size-xs;
  color: $color-text-secondary;
  min-width: 80rpx;
  text-align: right;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-3;
}

.achievement-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-4 $spacing-2;
  background: $color-bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  text-align: center;
  
  &.unlocked {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 165, 0, 0.05));
    border: 2rpx solid rgba(255, 215, 0, 0.3);
  }
  
  &.locked {
    opacity: 0.6;
    
    .achievement-icon {
      filter: grayscale(100%);
    }
  }
}

.achievement-icon-wrapper {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $spacing-2;
}

.achievement-icon {
  font-size: 48rpx;
}

.lock-overlay {
  position: absolute;
  bottom: -8rpx;
  right: -8rpx;
  font-size: 24rpx;
}

.achievement-name {
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-1;
}

.achievement-desc {
  font-size: 20rpx;
  color: $color-text-tertiary;
  line-height: 1.3;
}

.achievement-reward {
  margin-top: $spacing-2;
  padding: 4rpx 12rpx;
  background: rgba(255, 215, 0, 0.2);
  border-radius: $radius-full;
}

.reward-text {
  font-size: 20rpx;
  color: #D97706;
  font-weight: $font-weight-medium;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-text {
  font-size: $font-size-base;
  color: $color-text-secondary;
}
</style>
