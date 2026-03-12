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
import { useAdminPage } from './useAdminPage'

const {
  checkingAdmin,
  formatNumber,
  goBack,
  initData,
  isAdmin,
  kpiCards,
  menuCards,
  onKpiCardClick,
  statusBarHeight,
  todayCards,
} = useAdminPage()
</script>

<style src="./admin.scss" scoped lang="scss"></style>
