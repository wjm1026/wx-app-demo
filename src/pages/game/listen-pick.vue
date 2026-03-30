<template>
  <view class="page game-page">
    <view class="game-stage" :style="stageStyle">
      <view class="ambient-orb orb-peach"></view>
      <view class="ambient-orb orb-mint"></view>
      <view class="ambient-orb orb-sky"></view>

      <view :key="fireworksKey" class="sky-fireworks-layer" :class="{ 'is-active': isSuccess }">
        <view class="sky-vignette"></view>
        <view class="sky-flare flare-a"></view>
        <view class="sky-flare flare-b"></view>
        <view class="sky-flare flare-c"></view>

        <view
          v-for="fireworkIndex in 5"
          :key="`sky-firework-${fireworkIndex}`"
          class="sky-firework"
          :class="`fw-${fireworkIndex}`"
        >
          <view class="fw-launch"></view>
          <view class="fw-head"></view>
          <view class="fw-core-flash"></view>

          <view
            v-for="ringIndex in 3"
            :key="`ring-${fireworkIndex}-${ringIndex}`"
            class="fw-ring"
            :class="`ring-${ringIndex}`"
          ></view>

          <view
            v-for="shardIndex in 12"
            :key="`shard-${fireworkIndex}-${shardIndex}`"
            class="fw-shard"
            :class="`s-${shardIndex}`"
          ></view>
        </view>
      </view>

      <view class="game-shell">
        <view class="listen-toolbar">
          <view class="toolbar-back" @click="navigateBack()">
            <image class="toolbar-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
          </view>
          <text class="toolbar-title">听音选图</text>
          <view class="toolbar-placeholder"></view>
        </view>

        <view class="voice-card" :class="{ 'is-speaking': isVoicePressed || isVoicePlaying }">
          <view class="voice-head">
            <view class="voice-copy">
              <text class="voice-label">{{ voiceLabel }}</text>
              <text class="voice-question">{{ questionText }}</text>
            </view>
          </view>
          <view class="voice-wave">
            <view
              v-for="barIndex in 6"
              :key="`wave-${barIndex}`"
              class="wave-bar"
              :class="`bar-${barIndex}`"
            ></view>
          </view>
        </view>

        <view class="question-board">
          <view v-if="canPlayRound" class="animal-grid">
            <view
              v-for="card in roundCards"
              :key="card.id"
              class="animal-card"
              :class="resolveCardClass(card.id)"
              @click="handleChoose(card.id)"
            >
              <template v-if="isSuccess && card.id === targetCardId">
                <view
                  v-for="fireworkIndex in 3"
                  :key="`card-firework-${card.id}-${fireworkIndex}`"
                  class="firework"
                  :class="`firework-${fireworkIndex}`"
                ></view>
                <view
                  v-for="dotIndex in 6"
                  :key="`card-dot-${card.id}-${dotIndex}`"
                  class="firework-dot"
                  :class="`dot-${dotIndex}`"
                ></view>
              </template>

              <view class="animal-avatar media-avatar">
                <image v-if="card.image" class="animal-image" :src="card.image" mode="widthFix" />
                <text v-else class="animal-fallback">{{ card.name.slice(0, 1) }}</text>
                <view v-if="isSuccess && card.id === targetCardId" class="animal-badge">
                  <image class="badge-icon" src="/static/icons/line/check-circle.svg" mode="aspectFit" />
                </view>
              </view>
            </view>
          </view>

          <view v-else class="animal-grid animal-grid--placeholder">
            <view class="animal-card animal-card--placeholder">
              <text class="placeholder-text">{{ placeholderText }}</text>
            </view>
          </view>
        </view>

        <view class="bottom-dock">
          <view class="action-panel">
            <view
              class="action-button secondary"
              :class="{ 'is-pressed': isVoicePressed, 'is-disabled': !canReplayVoice }"
              @click="handleReplayVoice()"
            >
              {{ replayButtonText }}
            </view>
            <view
              class="action-button primary"
              :class="{
                'is-enabled': isNextActionEnabled,
                'is-disabled': !isNextActionEnabled,
                'is-pressed': isNextPressed,
              }"
              @click="handleNextRound"
            >
              {{ nextButtonText }}
            </view>
          </view>

          <view class="reward-strip" :class="{ 'is-active': isSuccess }">
            <text class="reward-text">{{ rewardText }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useListenPickPage } from './hooks/useListenPickPage'

const {
  canPlayRound,
  canReplayVoice,
  fireworksKey,
  handleChoose,
  handleNextRound,
  handleReplayVoice,
  isNextActionEnabled,
  isNextPressed,
  isSuccess,
  isVoicePlaying,
  isVoicePressed,
  navigateBack,
  nextButtonText,
  placeholderText,
  questionText,
  replayButtonText,
  resolveCardClass,
  rewardText,
  roundCards,
  stageStyle,
  targetCardId,
  voiceLabel,
} = useListenPickPage()
</script>

<style src="./styles/listen-pick.scss" scoped lang="scss"></style>
