<template>
  <view class="page">
    <view class="hero" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="hero-glow glow-left"></view>
      <view class="hero-glow glow-right"></view>

      <view class="hero-topbar">
        <view class="hero-badge">
          <image class="hero-badge-icon" src="/static/icons/line/shield.svg" mode="aspectFit" />
          <text class="hero-badge-text">管理员控制台</text>
        </view>
        <text class="hero-meta">实时数据</text>
      </view>

      <view class="hero-content">
        <text class="hero-title">管理后台</text>
        <text class="hero-subtitle">宝宝识物 · 数据管理中心</text>
      </view>

      <view class="kpi-grid">
        <view
          v-for="item in kpiCards"
          :key="item.key"
          class="kpi-card"
          :class="{ clickable: item.onClick }"
          @click="onKpiCardClick(item.onClick)"
        >
          <view class="kpi-icon-shell">
            <image class="kpi-icon" :src="item.icon" mode="aspectFit" />
          </view>
          <text class="kpi-value">{{ formatNumber(item.value) }}</text>
          <text class="kpi-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <view v-if="isAdmin" class="content">
      <view class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/calendar.svg" mode="aspectFit" />
            <text class="section-title">今日数据</text>
          </view>
          <text class="section-caption">关键趋势</text>
        </view>

        <view class="today-grid">
          <view
            v-for="item in todayCards"
            :key="item.key"
            class="today-card"
            :class="item.tone"
          >
            <view class="today-icon-shell">
              <image class="today-icon" :src="item.icon" mode="aspectFit" />
            </view>
            <view class="today-info">
              <text class="today-value">{{ formatNumber(item.value) }}</text>
              <text class="today-label">{{ item.label }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/crown.svg" mode="aspectFit" />
            <text class="section-title">管理功能</text>
          </view>
          <text class="section-caption">核心入口</text>
        </view>

        <view class="menu-grid">
          <view v-for="item in menuCards" :key="item.key" class="menu-item" @click="item.onClick">
            <view class="menu-item-top">
              <view class="menu-icon-shell" :class="item.tone">
                <image class="menu-icon" :src="item.icon" mode="aspectFit" />
              </view>
              <image class="menu-arrow" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
            </view>
            <text class="menu-title">{{ item.title }}</text>
            <text class="menu-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/info.svg" mode="aspectFit" />
            <text class="section-title">快捷操作</text>
          </view>
          <text class="section-caption">维护工具</text>
        </view>

        <view class="quick-action">
          <view class="quick-action-info">
            <view class="quick-action-icon-shell">
              <image class="quick-action-icon" src="/static/icons/line/check-circle.svg" mode="aspectFit" />
            </view>
            <view class="quick-action-text-wrap">
              <text class="quick-action-title">初始化数据</text>
              <text class="quick-action-desc">重建分类与卡片测试数据</text>
            </view>
          </view>
          <view class="quick-action-btn" @click="initData">执行</view>
        </view>
      </view>
    </view>

    <view v-if="!checkingAdmin && !isAdmin" class="permission-mask">
      <view class="permission-card">
        <view class="permission-icon-shell">
          <image class="permission-icon" src="/static/icons/line/shield.svg" mode="aspectFit" />
        </view>
        <text class="permission-title">无管理员权限</text>
        <text class="permission-desc">当前账号未开通管理端访问，请联系管理员授权后重试。</text>
        <view class="permission-btn" @click="goBack">返回上一页</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { navigateTo, showToast } from '@/utils'
import { adminApi, cardApi } from '@/api'
import { usePageLayout } from '@/composables/usePageLayout'

const { statusBarHeight } = usePageLayout()
const isAdmin = ref(false)
const checkingAdmin = ref(true)

interface AdminStats {
  userCount: number
  cardCount: number
  categoryCount: number
  todayNewUsers: number
  todayActiveUsers: number
}

const stats = ref<AdminStats>({
  userCount: 0,
  cardCount: 0,
  categoryCount: 0,
  todayNewUsers: 0,
  todayActiveUsers: 0
})

const kpiCards = computed(() => [
  {
    key: 'users',
    value: stats.value.userCount,
    label: '用户总数',
    icon: '/static/icons/line/users.svg',
    onClick: goUsers
  },
  {
    key: 'cards',
    value: stats.value.cardCount,
    label: '卡片总数',
    icon: '/static/icons/line/ticket.svg',
    onClick: goCards
  },
  {
    key: 'categories',
    value: stats.value.categoryCount,
    label: '分类数量',
    icon: '/static/icons/line/bar-chart.svg',
    onClick: goStats
  }
])

const todayCards = computed(() => [
  {
    key: 'new',
    value: stats.value.todayNewUsers,
    label: '今日新增用户',
    icon: '/static/icons/line/users.svg',
    tone: 'new'
  },
  {
    key: 'active',
    value: stats.value.todayActiveUsers,
    label: '今日活跃用户',
    icon: '/static/icons/line/bar-chart.svg',
    tone: 'active'
  }
])

const menuCards = [
  {
    key: 'users',
    title: '用户管理',
    desc: '查看用户状态与行为',
    icon: '/static/icons/line/users.svg',
    tone: 'tone-blue',
    onClick: goUsers
  },
  {
    key: 'stats',
    title: '数据统计',
    desc: '关键指标与运营趋势',
    icon: '/static/icons/line/bar-chart.svg',
    tone: 'tone-indigo',
    onClick: goStats
  },
  {
    key: 'categories',
    title: '分类管理',
    desc: '维护内容分类结构',
    icon: '/static/icons/line/info.svg',
    tone: 'tone-orange',
    onClick: goCategories
  },
  {
    key: 'cards',
    title: '卡片管理',
    desc: '内容库录入与审核',
    icon: '/static/icons/line/ticket.svg',
    tone: 'tone-teal',
    onClick: goCards
  }
]

onMounted(() => {
  void checkAdmin()
})

onShow(() => {
  if (isAdmin.value) {
    void loadStats()
  }
})

async function checkAdmin() {
  checkingAdmin.value = true
  try {
    const res = await adminApi.checkAdmin()
    if (res.code === 0 && res.data?.isAdmin) {
      isAdmin.value = true
      await loadStats()
    } else {
      isAdmin.value = false
    }
  } catch {
    isAdmin.value = false
    showToast('权限验证失败')
  } finally {
    checkingAdmin.value = false
  }
}

async function loadStats() {
  try {
    const res = await adminApi.getStats()
    if (res.code === 0 && res.data) {
      stats.value = {
        userCount: res.data.userCount || 0,
        cardCount: res.data.cardCount || 0,
        categoryCount: res.data.categoryCount || 0,
        todayNewUsers: res.data.todayNewUsers || 0,
        todayActiveUsers: res.data.todayActiveUsers || 0
      }
    }
  } catch (e) {
    console.error('加载统计数据失败:', e)
  }
}

function onKpiCardClick(action?: (() => void) | null) {
  if (action) {
    action()
  }
}

function formatNumber(value: number) {
  return (value || 0).toLocaleString()
}

async function initData() {
  uni.showModal({
    title: '确认初始化',
    content: '将清除现有分类和卡片数据，重新创建测试数据，确定继续吗？',
    success: async (res) => {
      if (res.confirm) {
        showToast('初始化中...', 'loading')
        try {
          await cardApi.initData()
          uni.hideToast()
          showToast('初始化完成', 'success')
          void loadStats()
        } catch (e) {
          uni.hideToast()
          showToast('初始化失败')
        }
      }
    }
  })
}

function goUsers() {
  navigateTo('/pages/admin/users')
}

function goStats() {
  navigateTo('/pages/admin/stats')
}

function goCategories() {
  showToast('分类管理开发中')
}

function goCards() {
  showToast('卡片管理开发中')
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% -8%, rgba(59, 130, 246, 0.22), transparent 50%),
    radial-gradient(circle at 88% 4%, rgba(245, 158, 11, 0.16), transparent 46%),
    $color-bg-primary;
}

.hero {
  position: relative;
  overflow: hidden;
  padding: 0 $spacing-4 $spacing-8;
  border-radius: 0 0 $radius-2xl $radius-2xl;
  background: linear-gradient(138deg, #0f2f7c 0%, #1d4ed8 55%, #3b82f6 100%);
  box-shadow: 0 24rpx 64rpx rgba(30, 64, 175, 0.34);
}

.hero-glow {
  position: absolute;
  border-radius: $radius-full;
  filter: blur(4rpx);
  pointer-events: none;

  &.glow-left {
    width: 280rpx;
    height: 280rpx;
    left: -120rpx;
    top: -64rpx;
    background: rgba(96, 165, 250, 0.34);
  }

  &.glow-right {
    width: 240rpx;
    height: 240rpx;
    right: -80rpx;
    bottom: 24rpx;
    background: rgba(251, 191, 36, 0.24);
  }
}

.hero-topbar {
  margin-top: $spacing-3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 20rpx;
  border-radius: $radius-full;
  background: rgba(255, 255, 255, 0.92);
  border: 1rpx solid rgba(255, 255, 255, 0.98);
}

.hero-badge-icon {
  width: 28rpx;
  height: 28rpx;
}

.hero-badge-text {
  font-size: $font-size-xs;
  color: #0f2f7c;
  font-weight: $font-weight-medium;
}

.hero-meta {
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.74);
}

.hero-content {
  position: relative;
  z-index: 1;
  margin-top: $spacing-5;
}

.hero-title {
  display: block;
  font-size: 54rpx;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
  letter-spacing: 1rpx;
}

.hero-subtitle {
  display: block;
  margin-top: $spacing-1;
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.8);
}

.kpi-grid {
  position: relative;
  z-index: 1;
  margin-top: $spacing-5;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $spacing-2;
}

.kpi-card {
  min-height: 176rpx;
  border-radius: $radius-md;
  border: 1rpx solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.16);
  padding: $spacing-3 $spacing-2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10rpx;
  transition: transform $duration-fast $ease-out,
    background-color $duration-fast $ease-out;

  &.clickable {
    cursor: pointer;
  }

  &:active {
    transform: translateY(2rpx) scale(0.98);
    background: rgba(255, 255, 255, 0.24);
  }
}

.kpi-icon-shell {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.94);
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-icon {
  width: 34rpx;
  height: 34rpx;
}

.kpi-value {
  font-size: 44rpx;
  line-height: 1.1;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
}

.kpi-label {
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.84);
}

.content {
  margin-top: -$spacing-4;
  padding: 0 $spacing-4 $spacing-10;
  padding: 0 $spacing-4 calc($spacing-10 + env(safe-area-inset-bottom));
  position: relative;
  z-index: 2;
}

.section-card {
  border-radius: $radius-lg;
  background: $color-bg-card;
  border: 2rpx solid rgba(148, 163, 184, 0.14);
  box-shadow: 0 10rpx 34rpx rgba(15, 23, 42, 0.08);
  padding: $spacing-4;
  margin-bottom: $spacing-3;
  animation: fade-up 280ms $ease-out both;

  &:nth-child(2) {
    animation-delay: 50ms;
  }

  &:nth-child(3) {
    animation-delay: 100ms;
  }
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-3;
}

.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.section-title-icon {
  width: 30rpx;
  height: 30rpx;
}

.section-title {
  font-size: $font-size-md;
  color: $color-text-primary;
  font-weight: $font-weight-semibold;
}

.section-caption {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.today-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $spacing-2;
}

.today-card {
  border-radius: $radius-md;
  border: 2rpx solid transparent;
  padding: $spacing-3;
  display: flex;
  align-items: center;
  gap: $spacing-2;
  min-height: 132rpx;

  &.new {
    background: linear-gradient(145deg, rgba(30, 64, 175, 0.12), rgba(59, 130, 246, 0.06));
    border-color: rgba(59, 130, 246, 0.22);
  }

  &.active {
    background: linear-gradient(145deg, rgba(245, 158, 11, 0.14), rgba(251, 191, 36, 0.08));
    border-color: rgba(245, 158, 11, 0.24);
  }
}

.today-icon-shell {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
}

.today-icon {
  width: 34rpx;
  height: 34rpx;
}

.today-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.today-value {
  font-size: 38rpx;
  line-height: 1.2;
  color: $color-text-primary;
  font-weight: $font-weight-bold;
}

.today-label {
  font-size: $font-size-xs;
  color: $color-text-secondary;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $spacing-2;
}

.menu-item {
  position: relative;
  border-radius: $radius-md;
  border: 2rpx solid $color-border;
  background: #fcfdff;
  padding: $spacing-3;
  min-height: 196rpx;
  transition: transform $duration-fast $ease-out,
    box-shadow $duration-fast $ease-out,
    border-color $duration-fast $ease-out;
  cursor: pointer;

  &:active {
    transform: scale(0.98);
    border-color: rgba(30, 64, 175, 0.28);
    box-shadow: 0 10rpx 20rpx rgba(30, 64, 175, 0.1);
  }
}

.menu-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.menu-icon-shell {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &.tone-blue {
    background: rgba(30, 64, 175, 0.12);
  }

  &.tone-indigo {
    background: rgba(67, 56, 202, 0.12);
  }

  &.tone-orange {
    background: rgba(245, 158, 11, 0.14);
  }

  &.tone-teal {
    background: rgba(20, 184, 166, 0.13);
  }
}

.menu-icon {
  width: 36rpx;
  height: 36rpx;
}

.menu-arrow {
  width: 28rpx;
  height: 28rpx;
}

.menu-title {
  margin-top: $spacing-3;
  display: block;
  font-size: $font-size-base;
  color: $color-text-primary;
  font-weight: $font-weight-semibold;
}

.menu-desc {
  margin-top: $spacing-1;
  display: block;
  font-size: $font-size-xs;
  line-height: $line-height-normal;
  color: $color-text-secondary;
}

.quick-action {
  border-radius: $radius-md;
  background: linear-gradient(138deg, #0f172a, #1e293b);
  padding: $spacing-3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-2;
}

.quick-action-info {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  min-width: 0;
}

.quick-action-icon-shell {
  width: 68rpx;
  height: 68rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-action-icon {
  width: 36rpx;
  height: 36rpx;
}

.quick-action-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.quick-action-title {
  font-size: $font-size-base;
  color: $color-text-inverse;
  font-weight: $font-weight-semibold;
}

.quick-action-desc {
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.72);
}

.quick-action-btn {
  flex-shrink: 0;
  min-width: 132rpx;
  min-height: 88rpx;
  border-radius: $radius-full;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: $color-text-inverse;
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 $spacing-3;
  transition: transform $duration-fast $ease-out, opacity $duration-fast $ease-out;
  cursor: pointer;

  &:active {
    transform: scale(0.96);
    opacity: 0.9;
  }
}

.permission-mask {
  position: fixed;
  inset: 0;
  z-index: $z-modal;
  padding: 0 $spacing-6;
  background: rgba(15, 23, 42, 0.64);
  backdrop-filter: blur(12rpx);
  display: flex;
  align-items: center;
  justify-content: center;
}

.permission-card {
  width: 100%;
  max-width: 580rpx;
  border-radius: $radius-xl;
  background: $color-bg-card;
  box-shadow: 0 30rpx 80rpx rgba(15, 23, 42, 0.36);
  padding: $spacing-6 $spacing-5;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.permission-icon-shell {
  width: 128rpx;
  height: 128rpx;
  border-radius: $radius-full;
  background: linear-gradient(150deg, rgba(30, 64, 175, 0.14), rgba(59, 130, 246, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $spacing-4;
}

.permission-icon {
  width: 56rpx;
  height: 56rpx;
}

.permission-title {
  font-size: $font-size-lg;
  color: $color-text-primary;
  font-weight: $font-weight-semibold;
}

.permission-desc {
  margin-top: $spacing-2;
  font-size: $font-size-sm;
  line-height: $line-height-normal;
  color: $color-text-secondary;
}

.permission-btn {
  margin-top: $spacing-5;
  width: 100%;
  min-height: 88rpx;
  border-radius: $radius-full;
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: $color-text-inverse;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  transition: transform $duration-fast $ease-out, opacity $duration-fast $ease-out;
  cursor: pointer;

  &:active {
    transform: scale(0.97);
    opacity: 0.92;
  }
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .section-card {
    animation: none;
  }
}
</style>
