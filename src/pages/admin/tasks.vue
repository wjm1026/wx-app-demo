<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">任务配置</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="hero-card">
      <view class="hero-badge">
        <image class="hero-badge-icon" src="/static/icons/line/gift.svg" mode="aspectFit" />
        <text class="hero-badge-text">TASK CONFIG</text>
      </view>

      <text class="hero-title">把任务文案和积分交给后台维护</text>
      <text class="hero-desc">
        固定任务键继续控制前台动作逻辑，这里只维护展示字段、排序和启用状态。
      </text>

      <view class="hero-stats">
        <view class="hero-stat">
          <text class="hero-stat-value">{{ taskForms.length }}</text>
          <text class="hero-stat-label">固定任务</text>
        </view>
        <view class="hero-stat">
          <text class="hero-stat-value">{{ enabledTaskCount }}</text>
          <text class="hero-stat-label">当前启用</text>
        </view>
        <view class="hero-stat">
          <text class="hero-stat-value">{{ hasPendingChanges ? '待保存' : '已同步' }}</text>
          <text class="hero-stat-label">配置状态</text>
        </view>
      </view>

      <view class="hero-actions">
        <view class="hero-action secondary" @click="restoreDefaults">恢复默认</view>
        <view class="hero-action primary" @click="saveTaskConfigs">
          {{ saving ? '保存中...' : '保存配置' }}
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading-panel">
      <view class="loading-spinner"></view>
      <text class="loading-title">正在加载任务配置</text>
      <text class="loading-desc">任务名称、积分和按钮文案马上就绪。</text>
    </view>

    <view v-else class="content">
      <view v-for="(task, index) in taskForms" :key="task.key" class="task-card">
        <view class="task-card-head">
          <view class="task-card-title-wrap">
            <view class="task-icon-shell" :class="getTaskMetaByKey(task.key).tone">
              <image class="task-icon" :src="getTaskMetaByKey(task.key).icon" mode="aspectFit" />
            </view>

            <view class="task-card-copy">
              <text class="task-card-title">{{ task.title }}</text>
              <text class="task-card-key">{{ task.key }}</text>
            </view>
          </view>

          <view class="task-switch-wrap">
            <switch
              class="task-switch"
              color="#1f9d8b"
              :checked="task.enabled"
              @change="handleTaskEnabledChange(index, $event)"
            />
          </view>
        </view>

        <view class="task-grid">
          <view class="form-item span-2">
            <text class="form-label">任务名称</text>
            <input
              class="form-input"
              :value="task.title"
              placeholder="例如：分享给微信好友"
              @input="handleTaskFieldInput(index, 'title', $event)"
            />
          </view>

          <view class="form-item">
            <text class="form-label">渠道名称</text>
            <input
              class="form-input"
              :value="task.channel"
              placeholder="例如：微信好友"
              @input="handleTaskFieldInput(index, 'channel', $event)"
            />
          </view>

          <view class="form-item">
            <text class="form-label">按钮文案</text>
            <input
              class="form-input"
              :value="task.actionLabel"
              placeholder="例如：立即分享"
              @input="handleTaskFieldInput(index, 'actionLabel', $event)"
            />
          </view>

          <view class="form-item">
            <text class="form-label">奖励积分</text>
            <input
              class="form-input"
              type="number"
              :value="String(task.points)"
              placeholder="请输入积分"
              @input="handleTaskNumberInput(index, 'points', $event)"
            />
          </view>

          <view class="form-item">
            <text class="form-label">排序值</text>
            <input
              class="form-input"
              type="number"
              :value="String(task.sortOrder)"
              placeholder="排序越小越靠前"
              @input="handleTaskNumberInput(index, 'sortOrder', $event)"
            />
          </view>

          <view class="form-item span-2">
            <text class="form-label">任务描述</text>
            <textarea
              class="form-textarea"
              auto-height
              maxlength="120"
              :value="task.desc"
              placeholder="描述用户要做什么动作"
              @input="handleTaskFieldInput(index, 'desc', $event)"
            />
          </view>

          <view class="form-item span-2">
            <text class="form-label">补充说明</text>
            <textarea
              class="form-textarea"
              auto-height
              maxlength="120"
              :value="task.note"
              placeholder="说明任务的补充信息或场景"
              @input="handleTaskFieldInput(index, 'note', $event)"
            />
          </view>
        </view>
      </view>

      <view class="footer-card">
        <text class="footer-title">保存前提醒</text>
        <text class="footer-desc">
          这里只改任务展示层字段。分享逻辑、邀请码绑定和外部平台复制行为仍按固定任务键执行。
        </text>
        <view class="footer-actions">
          <view class="footer-action ghost" @click="restoreDefaults">恢复默认</view>
          <view class="footer-action solid" @click="saveTaskConfigs">
            {{ saving ? '保存中...' : '保存全部配置' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useAdminTasksPage } from './hooks/useAdminTasksPage'

const {
  enabledTaskCount,
  getTaskMetaByKey,
  goBack,
  handleTaskEnabledChange,
  handleTaskFieldInput,
  handleTaskNumberInput,
  hasPendingChanges,
  loading,
  restoreDefaults,
  saveTaskConfigs,
  saving,
  statusBarHeight,
  taskForms,
} = useAdminTasksPage()
</script>

<style src="./styles/tasks.scss" scoped lang="scss"></style>
