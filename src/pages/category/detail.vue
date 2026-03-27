<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @tap="goBack">
          <image
            class="nav-back-icon"
            src="/static/icons/line/chevron-right.svg"
            mode="aspectFit"
          />
        </view>
        <view class="nav-title-wrap">
          <text class="nav-title">{{ categoryName }}</text>
          <view
            v-if="total > 0"
            class="nav-index-chip"
            :class="{ 'is-complete': currentDisplayIndex >= total }"
          >
            <view
              class="nav-index-chip-fill"
              :style="{
                width: `${Math.round((currentDisplayIndex / total) * 100)}%`,
              }"
            ></view>
            <view class="nav-index-chip-glint"></view>
          </view>
        </view>
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
        <view class="voice-actions">
          <view
            class="voice-action tone-cn"
            :class="[
              {
                'is-disabled':
                  !hasChineseAudio || isDetailLoading || !!detailError,
              },
              { 'is-playing': playingAudioType === 'cn' },
            ]"
            @tap="playChinesePronunciation"
          >
            <text class="voice-action-badge">CN</text>
            <text class="voice-action-label">中文发音</text>
          </view>
          <view
            class="voice-action tone-en"
            :class="[
              {
                'is-disabled':
                  !hasEnglishAudio || isDetailLoading || !!detailError,
              },
              { 'is-playing': playingAudioType === 'en' },
            ]"
            @tap="playEnglishPronunciation"
          >
            <text class="voice-action-badge">EN</text>
            <text class="voice-action-label">英文发音</text>
          </view>
        </view>

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
                :show-menu-by-longpress="true"
              />
              <view v-else class="detail-media-empty"></view>
            </view>
          </swiper-item>
        </swiper>

        <view
          class="favorite-action"
          :class="[
            { 'is-active': isCurrentFavorited },
            {
              'is-disabled':
                isFavoriteLoading || isDetailLoading || !!detailError,
            },
          ]"
          @tap="toggleCurrentFavorite"
        >
          <view class="favorite-action-main">
            <view class="favorite-action-icon-shell">
              <image
                class="favorite-action-icon"
                :src="
                  isCurrentFavorited
                    ? '/static/icons/line/check-circle.svg'
                    : '/static/icons/line/heart.svg'
                "
                mode="aspectFit"
              />
            </view>
            <view class="favorite-action-copy">
              <text class="favorite-action-title">{{
                isCurrentFavorited ? "已收藏到学习夹" : "收藏这张卡片"
              }}</text>
              <text class="favorite-action-desc">
                {{
                  isCurrentFavorited
                    ? "已加入学习收藏夹，随时复习"
                    : "点击加入收藏夹，方便下次快速学习"
                }}
              </text>
            </view>
          </view>
          <view class="favorite-action-cta">{{
            isCurrentFavorited ? "已收藏" : "立即收藏"
          }}</view>
        </view>

        <view v-if="isDetailLoading" class="meta-tip">正在加载详情...</view>

        <view v-else-if="detailError" class="meta-error">
          <text class="meta-error-text">{{ detailError }}</text>
          <view class="meta-retry" @tap="retryCurrentDetail">重试</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useCategoryDetailPage } from "./hooks/useCategoryDetailPage";

const {
  activeIndex,
  canSwipe,
  categoryName,
  currentDisplayIndex,
  detailError,
  goBack,
  hasChineseAudio,
  hasEnglishAudio,
  handleSwiperChange,
  isDetailLoading,
  isEmpty,
  isCurrentFavorited,
  isFavoriteLoading,
  isSnapshotLoading,
  playChinesePronunciation,
  playEnglishPronunciation,
  playingAudioType,
  retryCurrentDetail,
  retrySnapshot,
  snapshotCards,
  snapshotError,
  statusBarHeight,
  toggleCurrentFavorite,
  resolveCardImage,
  shouldRenderMedia,
  swiperCurrent,
  total,
} = useCategoryDetailPage();
</script>

<style src="./styles/detail.scss" scoped lang="scss"></style>
