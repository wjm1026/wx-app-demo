<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>

        <text class="nav-title">管理后台</text>
        <view class="nav-placeholder" :style="navPlaceholderStyle"></view>
      </view>
    </view>

    <view class="hero-card">
      <view class="hero-grid-pattern"></view>
      <view class="hero-glow hero-glow-left"></view>
      <view class="hero-glow hero-glow-right"></view>

      <view class="hero-topline">
        <view class="hero-badge">
          <image class="hero-badge-icon" src="/static/icons/line/shield.svg" mode="aspectFit" />
          <text class="hero-badge-text">数据控制中心</text>
        </view>
        <view class="hero-chip" :class="adminStateTone">{{ heroStatusLabel }}</view>
      </view>

      <view class="hero-main">
        <view class="hero-copy">
          <text class="hero-eyebrow">MOBILE OPS DASHBOARD</text>
          <text class="hero-title">统一调度用户、内容与维护动作</text>
          <text class="hero-desc">从这里查看核心指标、进入管理模块，并快速执行高频运维操作。</text>
        </view>

        <view class="hero-aside">
          <text class="hero-aside-label">今日活跃</text>
          <text class="hero-aside-value">{{ formatNumber(stats.todayActiveUsers) }}</text>
          <text class="hero-aside-meta">{{ heroSnapshotLabel }}</text>
        </view>
      </view>

      <view class="kpi-grid">
        <view v-for="item in kpiCards" :key="item.key" class="kpi-card" @click="item.onClick">
          <view class="kpi-card-top">
            <view class="kpi-icon-shell">
              <image class="kpi-icon" :src="item.icon" mode="aspectFit" />
            </view>
            <image class="kpi-arrow" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
          </view>
          <text class="kpi-value">{{ item.valueLabel }}</text>
          <text class="kpi-label">{{ item.label }}</text>
          <text class="kpi-meta">{{ item.meta }}</text>
        </view>
      </view>
    </view>

    <view v-if="checkingAdmin" class="loading-panel">
      <view class="loading-card">
        <view class="loading-spinner"></view>
        <text class="loading-title">正在校验管理员权限</text>
        <text class="loading-desc">稍等一下，后台数据就会同步出来。</text>
      </view>
    </view>

    <view v-else-if="isAdmin" class="content">
      <view class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/bar-chart.svg" mode="aspectFit" />
            <view class="section-title-copy">
              <text class="section-title">运营脉冲</text>
              <text class="section-subtitle">把有限字段整理成可读的控制面板指标</text>
            </view>
          </view>
          <text class="section-caption">Snapshot</text>
        </view>

        <view class="pulse-grid">
          <view v-for="item in pulseCards" :key="item.key" class="pulse-card" :class="item.tone">
            <view class="pulse-icon-shell">
              <image class="pulse-icon" :src="item.icon" mode="aspectFit" />
            </view>
            <text class="pulse-label">{{ item.label }}</text>
            <text class="pulse-value">{{ item.value }}</text>
            <text class="pulse-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/crown.svg" mode="aspectFit" />
            <view class="section-title-copy">
              <text class="section-title">模块入口</text>
              <text class="section-subtitle">把高频动作和当前模块状态一起暴露出来</text>
            </view>
          </view>
          <text class="section-caption">Modules</text>
        </view>

        <view class="menu-grid">
          <view v-for="item in menuCards" :key="item.key" class="menu-card" @click="item.onClick">
            <view class="menu-card-head">
              <view class="menu-icon-shell" :class="item.tone">
                <image class="menu-icon" :src="item.icon" mode="aspectFit" />
              </view>
              <text class="menu-badge" :class="{ pending: !item.available }">{{ item.badge }}</text>
            </view>
            <text class="menu-title">{{ item.title }}</text>
            <text class="menu-metric">{{ item.metric }}</text>
            <text class="menu-desc">{{ item.desc }}</text>
            <view class="menu-link-row">
              <text class="menu-link-text">{{ item.available ? '进入模块' : '开发中' }}</text>
              <image class="menu-link-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
            </view>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view class="section-title-wrap">
            <image class="section-title-icon" src="/static/icons/line/info.svg" mode="aspectFit" />
            <view class="section-title-copy">
              <text class="section-title">维护动作</text>
              <text class="section-subtitle">把高风险与安全操作分开，让执行预期更清楚</text>
            </view>
          </view>
          <text class="section-caption">Ops</text>
        </view>

        <view class="action-list">
          <view v-for="item in maintenanceCards" :key="item.key" class="action-card" :class="item.tone">
            <view class="action-main">
              <view class="action-icon-shell">
                <image class="action-icon" :src="item.icon" mode="aspectFit" />
              </view>

              <view class="action-copy">
                <text class="action-title">{{ item.title }}</text>
                <text class="action-desc">{{ item.desc }}</text>
                <text class="action-note">{{ item.note }}</text>
              </view>
            </view>

            <view class="action-btn" @click="item.onClick">{{ item.buttonLabel }}</view>
          </view>
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
  heroSnapshotLabel,
  heroStatusLabel,
  isAdmin,
  kpiCards,
  maintenanceCards,
  menuCards,
  navPlaceholderStyle,
  pulseCards,
  stats,
  statusBarHeight,
  adminStateTone,
} = useAdminPage()
</script>

<style src="./admin.scss" scoped lang="scss"></style>
