<template>
  <view class="page coming-page">
    <view class="coming-stage" :style="stageStyle">
      <view class="coming-toolbar">
        <view class="toolbar-back" @click="goBack">
          <image class="toolbar-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="toolbar-title">小游戏</text>
        <view class="toolbar-placeholder"></view>
      </view>

      <view class="coming-card">
        <view class="coming-chip">开发中</view>
        <text class="coming-title">{{ title }}</text>
        <text class="coming-desc">{{ desc }}</text>

        <view class="coming-actions">
          <view class="action-button secondary" @click="goBack">返回大厅</view>
          <view class="action-button primary" @click="openListenPick">先玩听音选图</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getNavBarHeight, getSafeAreaBottom, navigateTo, switchTab } from '@/utils'

const title = ref('新玩法')
const desc = ref('该板块正在开发中，很快就会上线。')

const stageStyle = computed<Record<string, string>>(() => {
  const topInset = getNavBarHeight() + uni.upx2px(20)
  const bottomInset = getSafeAreaBottom() + uni.upx2px(40)

  return {
    paddingTop: `${topInset}px`,
    paddingBottom: `${bottomInset}px`,
  }
})

function decodeText(value: unknown, fallback: string) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function goBack() {
  uni.navigateBack({
    fail: () => {
      switchTab('/pages/game/game')
    },
  })
}

function openListenPick() {
  navigateTo('/pages/game/listen-pick')
}

onLoad((query) => {
  title.value = decodeText(query?.title, '新玩法')
  desc.value = decodeText(query?.desc, '该板块正在开发中，很快就会上线。')
})
</script>

<style src="./styles/coming-soon.scss" scoped lang="scss"></style>
