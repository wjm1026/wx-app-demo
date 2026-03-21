<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image
            class="nav-back-icon"
            src="/static/icons/line/chevron-right.svg"
            mode="aspectFit"
          />
        </view>
        <text class="nav-title">{{ categoryName }}</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="content-wrapper">
      <view v-if="isInitialLoading" class="card-grid">
        <view v-for="item in 6" :key="item" class="card-item skeleton-card">
          <view class="card-media">
            <view class="skeleton-media"></view>
          </view>
          <view class="skeleton-line"></view>
        </view>
      </view>

      <view v-else-if="isEmpty" class="empty-state">
        <view class="empty-icon-shell">
          <image
            class="empty-icon"
            src="/static/icons/line/grid.svg"
            mode="aspectFit"
          />
        </view>
        <text class="empty-title">这个分类还没有图片</text>
        <text class="empty-text">稍后再来看看，或者返回首页查看其他分类。</text>
      </view>

      <view v-else class="card-grid">
        <view v-for="item in cards" :key="item._id" class="card-item">
          <view class="card-media">
            <CardImage
              class="card-image"
              :src="item.image"
              :label="item.name"
              mode="aspectFill"
            />
          </view>
        </view>
      </view>

      <view v-if="isLoading && cards.length > 0" class="list-footer">
        <text>正在加载更多...</text>
      </view>

      <view v-else-if="!hasMore && cards.length > 0" class="list-footer">
        <text>已经到底了</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import CardImage from "@/components/CardImage/CardImage.vue";
import { useCategoryCardsPage } from "./hooks/useCategoryCardsPage";

const {
  cards,
  categoryName,
  goBack,
  hasMore,
  isEmpty,
  isInitialLoading,
  isLoading,
  statusBarHeight,
} = useCategoryCardsPage();
</script>

<style src="./styles/cards.scss" scoped lang="scss"></style>
