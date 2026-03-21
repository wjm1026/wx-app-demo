<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content" :style="navContentStyle">
        <view class="nav-logo" :style="navLogoStyle">
          <text class="logo-icon">🐣</text>
          <text class="nav-title">宝宝识物</text>
        </view>
      </view>
    </view>

    <view class="main-scroll" :style="mainScrollStyle">
      <view v-if="!isInitialLoading" class="merged-category-grid">
        <view
          v-for="(item, index) in categories"
          :key="item._id"
          class="merged-category-card"
          :class="'delay-' + (index % 8)"
        >
          <view
            class="merged-category-icon"
            :style="isImageIcon(item.icon)
              ? { background: '#fff' }
              : { background: item.gradient || 'linear-gradient(135deg, #eef3ff, #dfe9ff)' }"
          >
            <image
              v-if="isImageIcon(item.icon)"
              class="merged-category-icon-image"
              :src="item.icon"
              mode="aspectFill"
            />
            <text v-else class="merged-category-emoji">{{ item.icon || item.name.slice(0, 1) }}</text>
          </view>
        </view>
      </view>

      <view v-else class="merged-category-grid">
        <view v-for="n in 6" :key="n" class="merged-category-card merged-skeleton-card">
          <view class="merged-category-icon merged-skeleton-shimmer"></view>
        </view>
      </view>

      <view class="safe-bottom" :style="safeBottomStyle"></view>
    </view>

    <CustomTabbar :current="0" :reserve-space="false" />
  </view>
</template>

<script setup lang="ts">
import CustomTabbar from '@/components/CustomTabbar/CustomTabbar.vue'
import { useIndexPage } from './hooks/useIndexPage'

const {
  categories,
  isImageIcon,
  isInitialLoading,
  mainScrollStyle,
  navContentStyle,
  navLogoStyle,
  safeBottomStyle,
  statusBarHeight,
} = useIndexPage()
</script>

<style src="./styles/index.scss" scoped lang="scss"></style>
