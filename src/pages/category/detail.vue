<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @tap="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">{{ categoryName }}</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="content-wrapper">
      <view v-if="isSnapshotLoading" class="state-card loading-state">
        <text class="state-title">正在加载图片</text>
        <text class="state-desc">请稍候，正在准备轮播内容。</text>
      </view>

      <view v-else-if="snapshotError" class="state-card error-state">
        <text class="state-title">加载失败</text>
        <text class="state-desc">{{ snapshotError }}</text>
        <view class="state-action" @tap="retrySnapshot">重新加载</view>
      </view>

      <view v-else-if="isEmpty" class="state-card empty-state">
        <text class="state-title">这个分类暂时没有图片</text>
        <text class="state-desc">返回上一级看看其他分类吧。</text>
      </view>

      <view v-else class="detail-shell">
        <swiper
          class="detail-swiper"
          :current="swiperCurrent"
          :circular="canSwipe"
          :disable-touch="!canSwipe"
          :duration="250"
          @change="handleSwiperChange"
        >
          <swiper-item
            v-for="(item, index) in snapshotCards"
            :key="item._id"
            class="detail-swiper-item"
          >
            <view class="detail-media-shell">
              <image
                v-if="item.image && shouldRenderMedia(index)"
                class="detail-media"
                :src="resolveCardImage(item)"
                mode="aspectFit"
                :lazy-load="index !== activeIndex"
                :show-menu-by-longpress="true"
              />
              <view v-else class="detail-media-empty"></view>
            </view>
          </swiper-item>
        </swiper>

        <view class="detail-meta">
          <view class="meta-head">
            <text class="meta-title">{{ currentName || '未命名图片' }}</text>
            <text class="meta-index">{{ currentDisplayIndex }} / {{ total }}</text>
          </view>
          <text v-if="currentDescription" class="meta-description">{{ currentDescription }}</text>

          <view v-if="isDetailLoading" class="meta-tip">正在加载详情...</view>

          <view v-else-if="detailError" class="meta-error">
            <text class="meta-error-text">{{ detailError }}</text>
            <view class="meta-retry" @tap="retryCurrentDetail">重试</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useCategoryDetailPage } from './hooks/useCategoryDetailPage'

const {
  activeIndex,
  canSwipe,
  categoryName,
  currentDescription,
  currentDisplayIndex,
  currentName,
  detailError,
  goBack,
  handleSwiperChange,
  isDetailLoading,
  isEmpty,
  isSnapshotLoading,
  retryCurrentDetail,
  retrySnapshot,
  snapshotCards,
  snapshotError,
  statusBarHeight,
  resolveCardImage,
  shouldRenderMedia,
  swiperCurrent,
  total,
} = useCategoryDetailPage()
</script>

<style src="./styles/detail.scss" scoped lang="scss"></style>
