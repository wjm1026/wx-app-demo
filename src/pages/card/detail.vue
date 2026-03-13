<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-btn" @click="goBack">
          <text class="nav-icon">←</text>
        </view>
        <text class="nav-title">{{ cardData.name }}</text>
        <view class="nav-spacer"></view>
      </view>
    </view>

    <view v-if="isLoading" class="loading-state">
      <view class="loading-spinner"></view>
      <text class="loading-text">正在加载识物详情</text>
    </view>

    <scroll-view v-else scroll-y class="main-scroll" :style="{ paddingTop: navBarHeight + 'px' }">
      <!-- 主图区域 -->
      <view class="hero-section">
        <swiper class="hero-swiper" indicator-dots indicator-color="rgba(255,255,255,0.5)" indicator-active-color="#FFFFFF">
          <swiper-item v-for="(img, index) in heroImages" :key="`${img}-${index}`">
            <CardImage
              class="hero-image"
              :src="img"
              :label="cardData.name"
              :category="heroBadgeText"
              mode="aspectFill"
            />
          </swiper-item>
        </swiper>
        <!-- 分类标签 -->
        <view class="hero-badge">
          <view class="badge-dot"></view>
          <text class="badge-text">{{ heroBadgeText }}</text>
        </view>
      </view>

      <!-- 名称信息 -->
      <view class="name-section">
        <view class="name-main">
          <text class="name-cn">{{ cardData.name }}</text>
        </view>
        <view class="name-sub">
          <text class="name-en">{{ cardData.name_en }}</text>
        </view>
        <text class="name-pinyin">[ {{ cardData.name_pinyin }} ]</text>
      </view>

      <!-- 快捷操作区 -->
      <view class="quick-actions">
        <view class="quick-btn" @click="playNameAudio('cn')">
          <view class="quick-icon-wrapper cn">
            <text class="quick-icon">中</text>
          </view>
          <text class="quick-label">中文发音</text>
          <text class="quick-sub">点击播放</text>
        </view>
        <view class="quick-btn" @click="playNameAudio('en')">
          <view class="quick-icon-wrapper en">
            <text class="quick-icon">EN</text>
          </view>
          <text class="quick-label">英文发音</text>
          <text class="quick-sub">点击播放</text>
        </view>
        <view class="quick-btn" @click="playSound">
          <view class="quick-icon-wrapper sound">
            <text class="quick-icon">♪</text>
          </view>
          <text class="quick-label">叫声播放</text>
          <text class="quick-sub">音效播放</text>
        </view>
        <view class="quick-btn" @click="playVideo" v-if="cardData.video">
          <view class="quick-icon-wrapper video">
            <text class="quick-icon">▶</text>
          </view>
          <text class="quick-label">视频</text>
          <text class="quick-sub">短片观看</text>
        </view>
      </view>

      <!-- 知识卡片区域 -->
      <view class="content-section">
        <!-- 小知识 -->
        <view v-if="cardData.description" class="knowledge-card">
          <view class="card-header">
            <text class="card-title">小知识</text>
          </view>
          <text class="card-content">{{ cardData.description }}</text>
        </view>

        <!-- 趣味知识 -->
        <view v-if="cardData.fun_fact" class="fun-card">
          <view class="fun-header">
            <text class="fun-title">趣味知识</text>
          </view>
          <text class="fun-content">{{ cardData.fun_fact }}</text>
        </view>
      </view>

      <!-- 相关推荐 -->
      <view class="related-section">
        <view class="section-header">
          <text class="section-title">相关推荐</text>
        </view>
        <scroll-view scroll-x class="related-scroll" :show-scrollbar="false">
          <view class="related-list">
            <view 
              v-for="item in relatedCards" 
              :key="item._id" 
              class="related-card"
              @click="goCardDetail(item._id)"
            >
              <CardImage
                class="related-image"
                :src="item.image"
                :label="item.name"
                :category="item.category?.name || heroBadgeText"
                mode="aspectFill"
              />
              <text class="related-name">{{ item.name }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="safe-bottom"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bar-left">
        <view class="bar-btn" @click="shareCard">
          <text class="bar-icon">↗</text>
          <text class="bar-text">分享</text>
        </view>
        <view class="bar-btn" :class="{ active: isFavorited }" @click="toggleFavorite">
          <text class="bar-icon">{{ isFavorited ? '★' : '☆' }}</text>
          <text class="bar-text">{{ isFavorited ? '已收藏' : '收藏' }}</text>
        </view>
      </view>
      <view class="next-btn" @click="nextCard">
        <text class="next-text">下一个</text>
        <text class="next-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import CardImage from '@/components/CardImage/CardImage.vue'
import { useCardDetailPage } from './useCardDetailPage'

const {
  cardData,
  goBack,
  goCardDetail,
  heroBadgeText,
  heroImages,
  isFavorited,
  isLoading,
  navBarHeight,
  nextCard,
  playNameAudio,
  playSound,
  playVideo,
  relatedCards,
  shareCard,
  statusBarHeight,
  toggleFavorite,
} = useCardDetailPage()
</script>

<style src="./detail.scss" scoped lang="scss"></style>
