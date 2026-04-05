<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">游戏配置</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view v-if="loading" class="loading-panel">
      <view class="loading-spinner"></view>
      <text class="loading-title">正在加载展示配置</text>
      <text class="loading-desc">首页 Logo 和游戏卡片配置马上就绪。</text>
    </view>

    <view v-else class="content">
      <view class="toolbar-card">
        <view class="toolbar-copy">
          <text class="toolbar-title">展示配置中心</text>
          <text class="toolbar-desc">统一维护首页左上角 Logo 与游戏列表卡片配置。</text>
        </view>

        <view class="toolbar-stats">
          <view class="toolbar-stat">
            <text class="toolbar-stat-value">{{ gameForms.length }}</text>
            <text class="toolbar-stat-label">游戏总数</text>
          </view>
          <view class="toolbar-stat">
            <text class="toolbar-stat-value">{{ enabledGameCount }}</text>
            <text class="toolbar-stat-label">启用中</text>
          </view>
          <view class="toolbar-stat">
            <text class="toolbar-stat-value">{{ hasPendingChanges ? '待保存' : '已同步' }}</text>
            <text class="toolbar-stat-label">配置状态</text>
          </view>
        </view>

        <view class="toolbar-actions">
          <view class="toolbar-btn ghost" @click="addGame">新增游戏</view>
          <view class="toolbar-btn solid" @click="saveDisplayConfig">
            {{ saving ? '保存中...' : '保存全部' }}
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <text class="section-title">首页 Logo 配置</text>
          <text class="section-subtitle">支持上传或手动填写地址，留空时前台回退默认 Logo</text>
        </view>

        <view class="logo-preview-shell">
          <image class="logo-preview" :src="previewLogo" mode="aspectFit" />
        </view>

        <input
          class="form-input"
          :value="miniAppIcon"
          placeholder="请输入首页 Logo 地址"
          @input="handleMiniAppIconInput"
        />

        <view class="inline-actions">
          <view class="inline-action primary" @click="uploadMiniAppLogo">
            {{ uploading ? '上传中...' : '上传 Logo' }}
          </view>
          <view class="inline-action" @click="clearMiniAppIcon">清空 Logo</view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-head">
          <text class="section-title">游戏列表配置</text>
          <text class="section-subtitle">新增 / 编辑 / 删除 / 上传 icon + cover / 控制可玩状态与跳转模式</text>
        </view>

        <view v-if="gameForms.length <= 0" class="empty-panel">
          <text class="empty-title">暂无游戏配置</text>
          <text class="empty-desc">点击“新增游戏”开始配置一张游戏卡片。</text>
        </view>

        <view v-for="(game, index) in gameForms" :key="`${game._id || game.key || index}`" class="game-card">
          <view class="game-head">
            <view class="game-head-copy">
              <text class="game-index">#{{ index + 1 }}</text>
              <text class="game-key">{{ game.key || '未设置 key' }}</text>
            </view>
            <view class="game-remove" @click="removeGame(index)">删除</view>
          </view>

          <view class="form-grid">
            <view class="form-item">
              <text class="form-label">游戏 key</text>
              <input
                class="form-input"
                :value="game.key"
                placeholder="例如 listen-pick"
                @input="handleGameTextInput(index, 'key', $event)"
              />
            </view>

            <view class="form-item">
              <text class="form-label">标题</text>
              <input
                class="form-input"
                :value="game.title"
                placeholder="例如 听音选图"
                @input="handleGameTextInput(index, 'title', $event)"
              />
            </view>

            <view class="form-item span-2">
              <text class="form-label">描述</text>
              <textarea
                class="form-textarea"
                auto-height
                maxlength="200"
                :value="game.desc"
                placeholder="例如 先听题目，再从图片里快速选中正确答案"
                @input="handleGameTextInput(index, 'desc', $event)"
              ></textarea>
            </view>

            <view class="form-item">
              <text class="form-label">入口标签</text>
              <input
                class="form-input"
                :value="game.entryTag"
                placeholder="例如 推荐先玩"
                @input="handleGameTextInput(index, 'entryTag', $event)"
              />
            </view>

            <view class="form-item">
              <text class="form-label">排序值</text>
              <input
                class="form-input"
                type="number"
                :value="String(game.sortOrder)"
                placeholder="排序越小越靠前"
                @input="handleGameSortInput(index, $event)"
              />
            </view>

            <view class="form-item span-2">
              <text class="form-label">跳转路径</text>
              <input
                class="form-input"
                :value="game.routePath"
                placeholder="必须以 /pages/ 开头"
                @input="handleGameTextInput(index, 'routePath', $event)"
              />
            </view>

            <view class="form-item">
              <text class="form-label">色调</text>
              <picker
                class="form-picker"
                :range="toneRange"
                :value="toneIndexOf(game.tone)"
                @change="handleToneChange(index, $event)"
              >
                <view class="picker-value">{{ resolveToneLabel(game.tone) }}</view>
              </picker>
            </view>

            <view class="form-item">
              <text class="form-label">启动模式</text>
              <picker
                class="form-picker"
                :range="launchModeRange"
                :value="launchModeIndexOf(game.launchMode)"
                @change="handleLaunchModeChange(index, $event)"
              >
                <view class="picker-value">{{ resolveLaunchModeLabel(game.launchMode) }}</view>
              </picker>
            </view>
          </view>

          <view class="switch-row">
            <view class="switch-item">
              <text class="switch-label">可玩</text>
              <switch :checked="game.available" color="#1f9d8b" @change="handleGameSwitchChange(index, 'available', $event)" />
            </view>
            <view class="switch-item">
              <text class="switch-label">启用</text>
              <switch :checked="game.enabled" color="#1d4ed8" @change="handleGameSwitchChange(index, 'enabled', $event)" />
            </view>
          </view>

          <view class="media-grid">
            <view class="media-card">
              <text class="media-title">图标 icon</text>
              <view class="media-preview-shell">
                <image v-if="game.icon" class="media-preview" :src="game.icon" mode="aspectFit" />
                <text v-else class="media-placeholder">暂无图标</text>
              </view>
              <input
                class="form-input"
                :value="game.icon"
                placeholder="图标地址"
                @input="handleGameTextInput(index, 'icon', $event)"
              />
              <view class="inline-action primary" @click="uploadGameMedia(index, 'icon')">
                {{ uploading ? '上传中...' : '上传 icon' }}
              </view>
            </view>

            <view class="media-card">
              <text class="media-title">封面 cover</text>
              <view class="media-preview-shell">
                <image v-if="game.cover" class="media-preview" :src="game.cover" mode="aspectFit" />
                <text v-else class="media-placeholder">暂无封面</text>
              </view>
              <input
                class="form-input"
                :value="game.cover"
                placeholder="封面地址"
                @input="handleGameTextInput(index, 'cover', $event)"
              />
              <view class="inline-action primary" @click="uploadGameMedia(index, 'cover')">
                {{ uploading ? '上传中...' : '上传 cover' }}
              </view>
            </view>
          </view>

          <view v-if="game.key === 'listen-pick'" class="feedback-config-card">
            <view class="section-head">
              <text class="section-title">听音选图反馈语音</text>
              <text class="section-subtitle">保存后会按提示语自动生成答对 / 答错反馈音频</text>
            </view>

            <view class="switch-row">
              <view class="switch-item">
                <text class="switch-label">答对后自动下一题</text>
                <switch
                  :checked="game.listenPickFeedback.autoNextOnCorrect"
                  color="#f59e0b"
                  @change="handleListenPickAutoNextChange(index, $event)"
                />
              </view>
            </view>

            <view class="feedback-summary-row">
              <view class="feedback-summary-chip">
                答对已生成 {{ countGeneratedFeedbackAudios(game.listenPickFeedback.correctAudios) }} 条
              </view>
              <view class="feedback-summary-chip">
                答错已生成 {{ countGeneratedFeedbackAudios(game.listenPickFeedback.wrongAudios) }} 条
              </view>
            </view>

            <view class="feedback-tts-head">
              <text class="feedback-tts-title">反馈发音参数</text>
              <text class="feedback-tts-subtitle">修改后会重新生成新文件名音频，并清理旧 OSS 文件</text>
            </view>

            <view class="form-grid">
              <view class="form-item span-2">
                <text class="form-label">答对提示语</text>
                <textarea
                  class="form-textarea"
                  auto-height
                  maxlength="300"
                  :value="game.listenPickFeedback.correctTextArea"
                  placeholder="每行一条，例如：真棒"
                  @input="handleListenPickFeedbackInput(index, 'correctTextArea', $event)"
                ></textarea>
              </view>

              <view class="form-item span-2">
                <text class="form-label">答错提示语</text>
                <textarea
                  class="form-textarea"
                  auto-height
                  maxlength="300"
                  :value="game.listenPickFeedback.wrongTextArea"
                  placeholder="每行一条，例如：再想想"
                  @input="handleListenPickFeedbackInput(index, 'wrongTextArea', $event)"
                ></textarea>
              </view>

              <view class="form-item">
                <text class="form-label">音色</text>
                <input
                  class="form-input"
                  :value="game.listenPickFeedback.tts.voice"
                  placeholder="zhibei_emo"
                  @input="handleListenPickTtsInput(index, 'voice', $event)"
                />
              </view>

              <view class="form-item">
                <text class="form-label">情感</text>
                <input
                  class="form-input"
                  :value="game.listenPickFeedback.tts.emotionCategory"
                  placeholder="happy / 开心，可留空"
                  @input="handleListenPickTtsInput(index, 'emotionCategory', $event)"
                />
              </view>

              <view class="form-item">
                <text class="form-label">语速 (-500~500)</text>
                <input
                  class="form-input"
                  type="number"
                  :value="game.listenPickFeedback.tts.speechRate"
                  placeholder="-110"
                  @input="handleListenPickTtsInput(index, 'speechRate', $event)"
                />
              </view>

              <view class="form-item">
                <text class="form-label">语调 (-500~500)</text>
                <input
                  class="form-input"
                  type="number"
                  :value="game.listenPickFeedback.tts.pitchRate"
                  placeholder="130"
                  @input="handleListenPickTtsInput(index, 'pitchRate', $event)"
                />
              </view>

              <view class="form-item">
                <text class="form-label">音量 (0~100)</text>
                <input
                  class="form-input"
                  type="number"
                  :value="game.listenPickFeedback.tts.volume"
                  placeholder="60"
                  @input="handleListenPickTtsInput(index, 'volume', $event)"
                />
              </view>

              <view class="form-item">
                <text class="form-label">采样率</text>
                <input
                  class="form-input"
                  type="number"
                  :value="game.listenPickFeedback.tts.sampleRate"
                  placeholder="16000"
                  @input="handleListenPickTtsInput(index, 'sampleRate', $event)"
                />
              </view>

              <view class="form-item">
                <text class="form-label">格式</text>
                <input
                  class="form-input"
                  :value="game.listenPickFeedback.tts.format"
                  placeholder="mp3"
                  @input="handleListenPickTtsInput(index, 'format', $event)"
                />
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="footer-actions">
        <view class="toolbar-btn ghost" @click="addGame">新增游戏</view>
        <view class="toolbar-btn solid" @click="saveDisplayConfig">
          {{ saving ? '保存中...' : '保存配置' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useAdminDisplayConfigPage } from './hooks/useAdminDisplayConfigPage'

const {
  addGame,
  countGeneratedFeedbackAudios,
  clearMiniAppIcon,
  enabledGameCount,
  gameForms,
  goBack,
  handleGameSortInput,
  handleGameSwitchChange,
  handleGameTextInput,
  handleListenPickAutoNextChange,
  handleListenPickFeedbackInput,
  handleListenPickTtsInput,
  handleLaunchModeChange,
  handleMiniAppIconInput,
  handleToneChange,
  hasPendingChanges,
  launchModeOptions,
  launchModeRange,
  loading,
  miniAppIcon,
  previewLogo,
  removeGame,
  resolveLaunchModeLabel,
  resolveToneLabel,
  saveDisplayConfig,
  saving,
  statusBarHeight,
  toneIndexOf,
  toneOptions,
  toneRange,
  uploadGameMedia,
  uploadMiniAppLogo,
  uploading,
  launchModeIndexOf,
} = useAdminDisplayConfigPage()
</script>

<style src="./styles/display-config.scss" scoped lang="scss"></style>
