<template>
  <view class="tabbar-wrapper">
    <!-- 占位符，防止内容被遮挡 -->
    <view class="tabbar-placeholder"></view>
    
    <view class="tabbar-pill">
      <!-- Tab Items -->
      <view 
        class="tab-item" 
        :class="{ 'is-active': current === index }"
        v-for="(item, index) in list" 
        :key="item.pagePath"
        @click="switchTab(item, index)"
      >
        <view class="icon-container">
          <image 
            class="tab-icon" 
            :src="current === index ? item.activeIcon : item.icon"
            mode="aspectFit"
          />
        </view>
        <text class="tab-text">{{ item.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { TABBAR_ITEMS } from '@/config/tabbar'

const props = defineProps<{
  current: number
}>()

const list = TABBAR_ITEMS

const switchTab = (item: { pagePath: string }, index: number) => {
  if (props.current === index) return
  uni.switchTab({
    url: item.pagePath
  })
}
</script>

<style src="./CustomTabbar.scss" lang="scss" scoped></style>
