<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">批处理配置</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="hero-card">
      <view class="hero-badge">
        <text class="hero-badge-text">{{ actionTag }}</text>
      </view>
      <text class="hero-title">{{ actionMeta.title }}</text>
      <text class="hero-desc">{{ actionMeta.subtitle }}</text>
      <text class="hero-note">{{ actionMeta.requirement }}</text>
      <text v-if="isAudioAction" class="hero-warning">英文语音固定 autoTranslate=false，name_en 为空会跳过。</text>
    </view>

    <view class="section-card">
      <view class="section-head">
        <text class="section-title">阿里云凭据</text>
        <view class="section-toggle" @click="toggleSecretVisibility">
          {{ revealSecrets ? '隐藏密钥' : '显示密钥' }}
        </view>
      </view>
      <text class="section-subtitle">仅保存在当前设备本地，并随本次请求提交。</text>

      <view class="form-grid">
        <view class="form-item">
          <text class="form-label">AppKey</text>
          <input
            class="form-input"
            :value="credentials.appKey"
            placeholder="语音服务 AppKey"
            @input="handleCredentialInput('appKey', $event)"
          />
        </view>

        <view class="form-item">
          <text class="form-label">AccessKeyId (AK)</text>
          <input
            class="form-input"
            :value="credentials.accessKeyId"
            placeholder="阿里云 AccessKeyId"
            @input="handleCredentialInput('accessKeyId', $event)"
          />
        </view>

        <view class="form-item">
          <text class="form-label">AccessKeySecret</text>
          <input
            class="form-input"
            :value="credentials.accessKeySecret"
            :password="!revealSecrets"
            placeholder="阿里云 AccessKeySecret"
            @input="handleCredentialInput('accessKeySecret', $event)"
          />
        </view>

        <view class="form-item">
          <text class="form-label">NLS Token</text>
          <input
            class="form-input"
            :value="credentials.nlsToken"
            :password="!revealSecrets"
            placeholder="可选：阿里云 NLS Token（每日更新）"
            @input="handleCredentialInput('nlsToken', $event)"
          />
        </view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-head">
        <text class="section-title">批处理参数</text>
      </view>
      <text class="section-subtitle">每个动作会单独记忆最近一次参数，方便重复执行。</text>

      <view class="form-grid">
        <view class="form-item">
          <text class="form-label">limit（1-1000）</text>
          <input
            class="form-input"
            type="number"
            :value="params.limit"
            placeholder="默认 100"
            @input="handleLimitInput"
          />
        </view>

        <view class="form-item">
          <text class="form-label">startId（可空）</text>
          <input
            class="form-input"
            type="number"
            :value="params.startId"
            placeholder="留空表示从最小 ID 开始"
            @input="handleStartIdInput"
          />
        </view>
      </view>

      <view class="switch-list">
        <view class="switch-item">
          <view class="switch-copy">
            <text class="switch-title">onlyEnabled</text>
            <text class="switch-desc">仅处理启用状态（status=1）</text>
          </view>
          <switch :checked="params.onlyEnabled" color="#1f9d8b" @change="handleOnlyEnabledChange" />
        </view>

        <view class="switch-item">
          <view class="switch-copy">
            <text class="switch-title">overwrite</text>
            <text class="switch-desc">覆盖已有结果字段</text>
          </view>
          <switch :checked="params.overwrite" color="#f97316" @change="handleOverwriteChange" />
        </view>
      </view>
    </view>

    <view class="action-bar">
      <view class="action-btn ghost" @click="clearCredentials">清空凭据</view>
      <view class="action-btn primary" :class="{ disabled: running }" @click="submitBatch">
        {{ running ? '执行中...' : '确认并开始' }}
      </view>
    </view>

    <view v-if="resultMessage || resultSummary" class="result-card">
      <text class="result-title">执行结果</text>
      <text class="result-message">{{ resultMessage }}</text>
      <text v-if="resultSummary" class="result-summary">{{ resultSummary }}</text>
      <view v-if="result" class="result-grid">
        <view class="result-item">
          <text class="result-label">扫描</text>
          <text class="result-value">{{ result.scanned || 0 }}</text>
        </view>
        <view class="result-item">
          <text class="result-label">翻译</text>
          <text class="result-value">{{ result.translated || 0 }}</text>
        </view>
        <view class="result-item">
          <text class="result-label">生成</text>
          <text class="result-value">{{ result.generated || 0 }}</text>
        </view>
        <view class="result-item">
          <text class="result-label">跳过</text>
          <text class="result-value">{{ result.skipped || 0 }}</text>
        </view>
        <view class="result-item">
          <text class="result-label">失败</text>
          <text class="result-value danger">{{ result.failed || 0 }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useAdminBatchRunnerPage } from './hooks/useAdminBatchRunnerPage'

const {
  actionMeta,
  actionTag,
  clearCredentials,
  credentials,
  goBack,
  handleCredentialInput,
  handleLimitInput,
  handleOnlyEnabledChange,
  handleOverwriteChange,
  handleStartIdInput,
  isAudioAction,
  params,
  revealSecrets,
  result,
  resultMessage,
  resultSummary,
  running,
  statusBarHeight,
  submitBatch,
  toggleSecretVisibility,
} = useAdminBatchRunnerPage()
</script>

<style src="./styles/batch-runner.scss" scoped lang="scss"></style>
