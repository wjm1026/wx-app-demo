<template>
  <view class="tabbar-wrapper">
    <view v-if="reserveSpace" class="tabbar-placeholder"></view>

    <view class="tabbar-shell">
      <view
        class="tab-item"
        :class="{ 'is-active': current === index }"
        v-for="(item, index) in list"
        :key="item.pagePath"
        @click="switchTab(item, index)"
      >
        <view class="tab-item-inner">
          <image
            class="tab-icon"
            :src="current === index ? item.activeIcon : item.icon"
            mode="aspectFit"
          />
          <text class="tab-text">{{ item.text }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { TABBAR_ITEMS } from '@/config/tabbar'

const props = withDefaults(
  defineProps<{
    current: number
    reserveSpace?: boolean
  }>(),
  {
    reserveSpace: true
  }
)

const list = TABBAR_ITEMS

const switchTab = (item: { pagePath: string }, index: number) => {
  if (props.current === index) return
  uni.switchTab({
    url: item.pagePath
  })
}
</script>

<style src="./CustomTabbar.scss" lang="scss" scoped></style>
