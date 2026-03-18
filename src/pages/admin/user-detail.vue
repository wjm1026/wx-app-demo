<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">用户详情</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <template v-if="userInfo">
      <view class="profile-card">
        <view class="profile-glow profile-glow-left"></view>
        <view class="profile-glow profile-glow-right"></view>

        <view class="profile-main">
          <image class="profile-avatar" :src="userInfo.avatar || defaultAvatar" mode="aspectFill" />

          <view class="profile-copy">
            <view v-if="profileBadges.length > 0" class="profile-badge-row">
              <view
                v-for="badge in profileBadges"
                :key="badge.key"
                class="profile-badge"
                :class="badge.tone"
              >
                {{ badge.label }}
              </view>
            </view>

            <text class="profile-name">{{ userInfo.nickname || '未设置昵称' }}</text>
            <text class="profile-subtitle">账号状态、权限与积分变动都在这里处理。</text>
          </view>
        </view>

        <view class="profile-detail-list">
          <view class="profile-detail-row">
            <view class="profile-detail-main">
              <image class="profile-detail-icon" src="/static/icons/line/info.svg" mode="aspectFit" />
              <view class="profile-detail-copy">
                <text class="profile-detail-label">用户 ID</text>
                <text class="profile-detail-value break-all">{{ userInfo._id }}</text>
              </view>
            </view>
            <view class="profile-inline-btn" @click="copyId">复制</view>
          </view>

          <view class="profile-detail-row">
            <view class="profile-detail-main">
              <image class="profile-detail-icon" src="/static/icons/line/calendar.svg" mode="aspectFit" />
              <view class="profile-detail-copy">
                <text class="profile-detail-label">注册时间</text>
                <text class="profile-detail-value">{{ formatDate(userInfo.create_time) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="metric-grid">
        <view v-for="item in metricCards" :key="item.key" class="metric-card">
          <view class="metric-icon-shell">
            <image class="metric-icon" :src="item.icon" mode="aspectFit" />
          </view>
          <text class="metric-value">{{ item.value }}</text>
          <text class="metric-label">{{ item.label }}</text>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view class="section-copy">
            <text class="section-title">账号操作</text>
            <text class="section-subtitle">把高频动作做成清晰的操作行，避免误触和误判。</text>
          </view>
        </view>

        <view class="action-list">
          <view
            v-for="item in actionCards"
            :key="item.key"
            class="action-item"
            :class="item.tone"
            @click="item.onClick"
          >
            <view class="action-icon-shell" :class="item.tone">
              <image class="action-icon" :src="item.icon" mode="aspectFit" />
            </view>

            <view class="action-copy">
              <text class="action-title">{{ item.title }}</text>
              <text class="action-desc">{{ item.desc }}</text>
            </view>

            <view class="action-cta" :class="item.tone">
              <text class="action-cta-text">{{ item.cta }}</text>
              <image
                class="action-cta-icon"
                src="/static/icons/line/chevron-right.svg"
                mode="aspectFit"
              />
            </view>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <view class="section-copy">
            <text class="section-title">最近积分记录</text>
            <text class="section-subtitle">最近 10 条变动记录，方便核对管理员操作和奖励发放。</text>
          </view>
        </view>

        <view v-if="recentPoints.length > 0" class="log-list">
          <view v-for="(log, index) in recentPoints" :key="log._id || index" class="log-item">
            <view class="log-main">
              <text class="log-title">{{ getLogTitle(log) }}</text>
              <text class="log-meta">
                {{ formatDate(log.create_time) }}
                <text v-if="typeof log.balance === 'number'"> · 余额 {{ formatMetric(log.balance) }}</text>
              </text>
            </view>

            <text class="log-amount" :class="getLogAmountClass(log.amount)">
              {{ formatSignedAmount(log.amount) }}
            </text>
          </view>
        </view>

        <view v-else class="empty-state">
          <view class="empty-icon-shell">
            <image class="empty-icon" src="/static/icons/line/coins.svg" mode="aspectFit" />
          </view>
          <text class="empty-title">暂无积分记录</text>
          <text class="empty-desc">后续的奖励、扣减和管理员调整都会出现在这里。</text>
        </view>
      </view>
    </template>

    <view class="modal-mask" v-if="showPointsModal" @click="closePointsModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <view class="modal-copy">
            <text class="modal-title">调整积分</text>
            <text class="modal-subtitle">支持正负数，提交后会写入积分记录。</text>
          </view>
          <view class="modal-close" @click="closePointsModal">关闭</view>
        </view>

        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">变动数量</text>
            <input
              v-model="adjustForm.amount"
              class="form-input"
              type="number"
              placeholder="例如 100 或 -50"
            />
          </view>

          <view class="form-item">
            <text class="form-label">变动原因</text>
            <input
              v-model="adjustForm.reason"
              class="form-input"
              type="text"
              placeholder="请输入调整原因"
            />
          </view>
        </view>

        <view class="modal-footer">
          <view class="modal-btn cancel" @click="closePointsModal">取消</view>
          <view class="modal-btn confirm" @click="submitPointsAdjust">确认调整</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PointsLogItem } from '@/api'
import { useAdminUserDetailPage } from './hooks/useAdminUserDetailPage'

const {
  adjustForm,
  closePointsModal,
  copyId,
  defaultAvatar,
  favoriteCount,
  formatDate,
  formatMetric,
  goBack,
  invitedCount,
  openPointsModal,
  recentPoints,
  showPointsModal,
  statusBarHeight,
  submitPointsAdjust,
  toggleUserRole,
  toggleUserStatus,
  userInfo,
} = useAdminUserDetailPage()

const profileBadges = computed(() => {
  if (!userInfo.value) {
    return []
  }

  const badges = [
    {
      key: 'status',
      label: userInfo.value.status === 2 ? '已封禁' : '正常',
      tone: userInfo.value.status === 2 ? 'danger' : 'success',
    },
  ]

  if (userInfo.value.role === 'admin') {
    badges.push({
      key: 'role',
      label: '管理员',
      tone: 'neutral',
    })
  }

  if (userInfo.value.is_vip) {
    badges.push({
      key: 'vip',
      label: 'VIP',
      tone: 'accent',
    })
  }

  return badges
})

const metricCards = computed(() => {
  if (!userInfo.value) {
    return []
  }

  return [
    {
      key: 'points',
      label: '当前积分',
      value: formatMetric(userInfo.value.points),
      icon: '/static/icons/line/coins.svg',
    },
    {
      key: 'favorites',
      label: '收藏数量',
      value: formatMetric(favoriteCount.value),
      icon: '/static/icons/line/heart.svg',
    },
    {
      key: 'invites',
      label: '邀请人数',
      value: formatMetric(invitedCount.value),
      icon: '/static/icons/line/users.svg',
    },
  ]
})

const actionCards = computed(() => {
  if (!userInfo.value) {
    return []
  }

  return [
    {
      key: 'points',
      title: '调整积分',
      desc: '手动增加或扣减积分，并同步写入积分记录。',
      cta: '调整',
      icon: '/static/icons/line/coins.svg',
      tone: 'primary',
      onClick: openPointsModal,
    },
    {
      key: 'role',
      title: userInfo.value.role === 'admin' ? '取消管理员' : '设为管理员',
      desc: userInfo.value.role === 'admin'
        ? '移除后台访问权限，恢复为普通用户。'
        : '授予后台访问能力和管理权限。',
      cta: userInfo.value.role === 'admin' ? '取消' : '授权',
      icon: '/static/icons/line/crown.svg',
      tone: userInfo.value.role === 'admin' ? 'warning' : 'neutral',
      onClick: toggleUserRole,
    },
    {
      key: 'status',
      title: userInfo.value.status === 2 ? '解封用户' : '封禁用户',
      desc: userInfo.value.status === 2
        ? '恢复账号访问权限并重新允许使用功能。'
        : '立即限制账号访问，适用于违规处理。',
      cta: userInfo.value.status === 2 ? '解封' : '封禁',
      icon: '/static/icons/line/shield.svg',
      tone: userInfo.value.status === 2 ? 'success' : 'danger',
      onClick: toggleUserStatus,
    },
  ]
})

function getLogTitle(log: PointsLogItem) {
  return log.reason || log.description || '积分变动'
}

function getLogAmountClass(value: number) {
  if (value > 0) {
    return 'plus'
  }

  if (value < 0) {
    return 'minus'
  }

  return 'neutral'
}

function formatSignedAmount(value: number) {
  const amount = Number(value || 0)
  return `${amount > 0 ? '+' : ''}${formatMetric(amount)}`
}
</script>

<style src="./styles/user-detail.scss" scoped lang="scss"></style>
