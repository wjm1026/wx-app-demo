<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-btn" @click="goBack">
          <text class="nav-icon">←</text>
        </view>
        <text class="nav-title">{{ cardData.name }}</text>
        <view class="nav-btn" @click="toggleFavorite">
          <text class="favorite-icon">{{ isFavorited ? '❤️' : '🤍' }}</text>
        </view>
      </view>
    </view>

    <view v-if="isLoading" class="loading-state">
      <text class="loading-icon">⏳</text>
      <text class="loading-text">正在加载识物详情...</text>
    </view>

    <scroll-view v-else scroll-y class="main-scroll" :style="{ paddingTop: navBarHeight + 'px' }">
      <!-- 主图区域 -->
      <view class="hero-section">
        <swiper class="hero-swiper" indicator-dots indicator-color="rgba(255,255,255,0.5)" indicator-active-color="#FFFFFF">
          <swiper-item>
            <image class="hero-image" :src="cardData.image" mode="aspectFill" />
          </swiper-item>
        </swiper>
        
        <!-- 悬浮发音按钮 -->
        <view class="hero-actions">
          <view class="action-fab" @click="playSound">
            <text class="fab-icon">🔊</text>
            <text class="fab-label">听声音</text>
          </view>
        </view>
        
        <!-- 分类标签 -->
        <view class="hero-badge">
          <text class="badge-icon">🦁</text>
          <text class="badge-text">动物</text>
        </view>
      </view>

      <!-- 名称信息 -->
      <view class="name-section">
        <view class="name-main">
          <text class="name-cn">{{ cardData.name }}</text>
          <view class="name-actions">
            <view class="name-action" @click="playNameAudio('cn')">
              <text class="action-flag">🇨🇳</text>
            </view>
          </view>
        </view>
        <view class="name-sub">
          <text class="name-en">{{ cardData.name_en }}</text>
          <view class="name-action-small" @click="playNameAudio('en')">
            <text class="action-flag">🇺🇸</text>
          </view>
        </view>
        <text class="name-pinyin">[ {{ cardData.name_pinyin }} ]</text>
      </view>

      <!-- 快捷操作区 -->
      <view class="quick-actions">
        <view class="quick-btn" @click="playNameAudio('cn')">
          <view class="quick-icon-wrapper cn">
            <text class="quick-icon">🗣️</text>
          </view>
          <text class="quick-label">中文</text>
        </view>
        <view class="quick-btn" @click="playNameAudio('en')">
          <view class="quick-icon-wrapper en">
            <text class="quick-icon">🔤</text>
          </view>
          <text class="quick-label">英文</text>
        </view>
        <view class="quick-btn" @click="playSound">
          <view class="quick-icon-wrapper sound">
            <text class="quick-icon">🎵</text>
          </view>
          <text class="quick-label">叫声</text>
        </view>
        <view class="quick-btn" @click="playVideo" v-if="cardData.video">
          <view class="quick-icon-wrapper video">
            <text class="quick-icon">📹</text>
          </view>
          <text class="quick-label">视频</text>
        </view>
      </view>

      <!-- 知识卡片区域 -->
      <view class="content-section">
        <!-- 小知识 -->
        <view v-if="cardData.description" class="knowledge-card">
          <view class="card-header">
            <text class="card-title">📖 小知识</text>
          </view>
          <text class="card-content">{{ cardData.description }}</text>
        </view>

        <!-- 趣味知识 -->
        <view v-if="cardData.funFact" class="fun-card">
          <view class="fun-header">
            <text class="fun-icon">💡</text>
            <text class="fun-title">你知道吗？</text>
          </view>
          <text class="fun-content">{{ cardData.fun_fact }}</text>
          <view class="fun-decoration">
            <text class="decoration-emoji">✨</text>
            <text class="decoration-emoji">🌟</text>
            <text class="decoration-emoji">⭐</text>
          </view>
        </view>
      </view>

      <!-- 相关推荐 -->
      <view class="related-section">
        <view class="section-header">
          <text class="section-title">🎯 相关推荐</text>
        </view>
        <scroll-view scroll-x class="related-scroll" :show-scrollbar="false">
          <view class="related-list">
            <view 
              v-for="item in relatedCards" 
              :key="item._id" 
              class="related-card"
              @click="goCardDetail(item._id)"
            >
              <image class="related-image" :src="item.image" mode="aspectFill" />
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
          <text class="bar-icon">📤</text>
          <text class="bar-text">分享</text>
        </view>
        <view class="bar-btn" @click="toggleFavorite">
          <text class="bar-icon">{{ isFavorited ? '❤️' : '🤍' }}</text>
          <text class="bar-text">{{ isFavorited ? '已收藏' : '收藏' }}</text>
        </view>
      </view>
      <view class="next-btn" @click="nextCard">
        <text class="next-text">下一个</text>
        <text class="next-arrow">→</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getStatusBarHeight, getNavBarHeight, navigateTo, navigateBack, showToast } from '@/utils'
import { cardApi, type Card } from '@/api'

const statusBarHeight = ref(getStatusBarHeight())
const navBarHeight = ref(getNavBarHeight())
const isFavorited = ref(false)
const isLoading = ref(true)

const cardData = ref<Card>({
  _id: '',
  name: '',
  name_en: '',
  name_pinyin: '',
  image: '',
  description: '',
  fun_fact: '',
  is_free: true,
  points_cost: 0,
  view_count: 0,
  favorite_count: 0,
  is_hot: false,
  category_id: ''
})

const relatedCards = ref<Card[]>([])

// 音频上下文
const audioContext = uni.createInnerAudioContext()

onUnmounted(() => {
  audioContext.destroy()
})

onLoad((options) => {
  if (options && options.id) {
    loadCardDetail(options.id)
  } else {
    showToast('卡片不存在', 'error')
    setTimeout(() => goBack(), 1500)
  }
})

async function loadCardDetail(id: string) {
  isLoading.value = true
  try {
    const res = await cardApi.getCardDetail(id)
    if (res.code === 0 && res.data) {
      cardData.value = res.data
      isFavorited.value = !!res.data.isFavorited
      
      // 加载相关推荐
      if (res.data.category_id) {
        loadRelatedCards(res.data._id, res.data.category_id)
      }
    } else {
      showToast(res.msg || '加载失败', 'error')
    }
  } catch (e) {
    console.error('加载卡片详情失败:', e)
  } finally {
    isLoading.value = false
  }
}

async function loadRelatedCards(cardId: string, categoryId: string) {
  try {
    const res = await cardApi.getRelatedCards({ cardId, categoryId, limit: 6 })
    if (res.code === 0) {
      relatedCards.value = res.data || []
    }
  } catch (e) {
    console.error('加载相关推荐失败:', e)
  }
}

function goBack() {
  navigateBack()
}

async function toggleFavorite() {
  try {
    const res = await cardApi.toggleFavorite(cardData.value._id)
    if (res.code === 0) {
      isFavorited.value = res.data.isFavorited
      showToast(isFavorited.value ? '已收藏 ❤️' : '已取消收藏', 'success')
    }
  } catch (e) {
    showToast('操作失败', 'error')
  }
}

function playAudio(url: string | undefined, label: string) {
  if (!url) {
    showToast(`暂无${label}`, 'none')
    return
  }
  
  audioContext.stop()
  audioContext.src = url
  audioContext.play()
  
  audioContext.onError((res) => {
    console.error('播放失败:', res)
    showToast('播放失败，请检查网络', 'error')
    // 播放失败清空 src，防止持续报错
    audioContext.src = ''
  })
}

function playNameAudio(lang: 'cn' | 'en') {
  if (lang === 'cn') {
    // 优先使用录制的音频，如果没有则提示
    playAudio(cardData.value.audio, '中文发音')
  } else {
    playAudio(cardData.value.audio_en, '英文发音')
  }
}

function playSound() {
  playAudio(cardData.value.sound, '音效')
}

function playVideo() {
  if (cardData.value.video) {
    // 这里可以跳转到专门的视频播放页或者使用 uni.previewImage 预览视频
    showToast('播放视频 📹')
  }
}

function goCardDetail(id: string) {
  navigateTo(`/pages/card/detail?id=${id}`)
}

function shareCard() {
  showToast('分享给好友 📤')
}

function nextCard() {
  if (relatedCards.value.length > 0) {
    const next = relatedCards.value[0]
    goCardDetail(next._id)
  } else {
    showToast('没有更多卡片了', 'none')
  }
}
</script>

<style scoped lang="scss">
@import '@/styles/design-system.scss';

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  gap: $spacing-4;
  
  .loading-icon {
    font-size: 80rpx;
    animation: rotate 2s linear infinite;
  }
  
  .loading-text {
    font-size: $font-size-md;
    color: $color-text-secondary;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.page {
  min-height: 100vh;
  background-color: $color-bg-primary;
}

// 导航栏
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: $z-fixed;
  background: $gradient-primary;
}

.nav-content {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-3;
}

.nav-btn {
  @include icon-button;
  background-color: rgba(255, 255, 255, 0.25);
  
  &:active {
    background-color: rgba(255, 255, 255, 0.35);
    transform: scale(0.9);
  }
}

.nav-icon {
  font-size: 40rpx;
  color: $color-text-inverse;
}

.favorite-icon {
  font-size: 40rpx;
}

.nav-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
}

.main-scroll {
  height: calc(100vh - 140rpx);
}

// 主图区域
.hero-section {
  position: relative;
  width: 100%;
  height: 520rpx;
}

.hero-swiper {
  width: 100%;
  height: 100%;
}

.hero-image {
  width: 100%;
  height: 100%;
}

.hero-actions {
  position: absolute;
  bottom: $spacing-4;
  right: $spacing-4;
}

.action-fab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-3;
  background: rgba(255, 255, 255, 0.95);
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  transition: transform $duration-fast $ease-bounce;
  
  &:active {
    transform: scale(0.9);
  }
}

.fab-icon {
  font-size: 48rpx;
}

.fab-label {
  font-size: $font-size-xs;
  color: $color-text-secondary;
  margin-top: 4rpx;
}

.hero-badge {
  position: absolute;
  top: $spacing-4;
  left: $spacing-4;
  display: flex;
  align-items: center;
  gap: $spacing-1;
  padding: $spacing-2 $spacing-3;
  background: rgba(0, 0, 0, 0.5);
  border-radius: $radius-full;
}

.badge-icon {
  font-size: 28rpx;
}

.badge-text {
  font-size: $font-size-sm;
  color: $color-text-inverse;
}

// 名称区域
.name-section {
  padding: $spacing-5;
  text-align: center;
  background-color: $color-bg-card;
  margin: -$spacing-5 $spacing-4 $spacing-4;
  border-radius: $radius-xl;
  box-shadow: $shadow-lg;
  position: relative;
  z-index: 1;
}

.name-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-3;
  margin-bottom: $spacing-2;
}

.name-cn {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.name-actions {
  display: flex;
  gap: $spacing-2;
}

.name-action {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $color-bg-secondary;
  border-radius: $radius-full;
  transition: transform $duration-fast $ease-bounce;
  
  &:active {
    transform: scale(0.9);
  }
}

.action-flag {
  font-size: 32rpx;
}

.name-sub {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-2;
  margin-bottom: $spacing-2;
}

.name-en {
  font-size: $font-size-lg;
  color: $color-text-secondary;
}

.name-action-small {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $color-bg-secondary;
  border-radius: $radius-full;
  
  .action-flag {
    font-size: 24rpx;
  }
}

.name-pinyin {
  font-size: $font-size-base;
  color: $color-text-tertiary;
}

// 快捷操作
.quick-actions {
  display: flex;
  justify-content: center;
  gap: $spacing-5;
  padding: 0 $spacing-4;
  margin-bottom: $spacing-5;
}

.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-2;
  transition: transform $duration-fast $ease-bounce;
  
  &:active {
    transform: scale(0.92);
  }
}

.quick-icon-wrapper {
  width: 100rpx;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-xl;
  box-shadow: $shadow-md;
  
  &.cn {
    background: linear-gradient(135deg, #FF6B6B, #FF8E8E);
  }
  
  &.en {
    background: linear-gradient(135deg, #60A5FA, #A78BFA);
  }
  
  &.sound {
    background: linear-gradient(135deg, #34D399, #4ECDC4);
  }
  
  &.video {
    background: linear-gradient(135deg, #FFA94D, #FFD93D);
  }
}

.quick-icon {
  font-size: 44rpx;
}

.quick-label {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  font-weight: $font-weight-medium;
}

// 知识卡片
.content-section {
  padding: 0 $spacing-4;
}

.knowledge-card {
  background-color: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-5;
  margin-bottom: $spacing-4;
  box-shadow: $shadow-md;
}

.card-header {
  margin-bottom: $spacing-3;
}

.card-title {
  font-size: $font-size-md;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.card-content {
  font-size: $font-size-base;
  color: $color-text-secondary;
  line-height: $line-height-relaxed;
}

.fun-card {
  background: $gradient-secondary;
  border-radius: $radius-xl;
  padding: $spacing-5;
  margin-bottom: $spacing-4;
  box-shadow: 0 12rpx 32rpx rgba(78, 205, 196, 0.3);
  position: relative;
  overflow: hidden;
}

.fun-header {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  margin-bottom: $spacing-3;
}

.fun-icon {
  font-size: 40rpx;
}

.fun-title {
  font-size: $font-size-md;
  font-weight: $font-weight-bold;
  color: $color-text-inverse;
}

.fun-content {
  font-size: $font-size-base;
  color: rgba(255, 255, 255, 0.95);
  line-height: $line-height-relaxed;
}

.fun-decoration {
  position: absolute;
  top: -20rpx;
  right: -20rpx;
  display: flex;
  gap: $spacing-2;
  opacity: 0.3;
}

.decoration-emoji {
  font-size: 80rpx;
}

// 相关推荐
.related-section {
  padding: $spacing-4;
}

.section-header {
  margin-bottom: $spacing-4;
}

.section-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.related-scroll {
  margin: 0 #{-$spacing-4};
  padding: 0 $spacing-4;
}

.related-list {
  display: inline-flex;
  gap: $spacing-4;
  padding: $spacing-2 0;
}

.related-card {
  width: 200rpx;
  text-align: center;
  transition: transform $duration-normal $ease-bounce;
  
  &:active {
    transform: scale(0.95);
  }
}

.related-image {
  width: 200rpx;
  height: 160rpx;
  border-radius: $radius-lg;
  box-shadow: $shadow-md;
  margin-bottom: $spacing-2;
}

.related-name {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

.safe-bottom {
  height: 180rpx;
}

// 底部操作栏
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 140rpx;
  background-color: $color-bg-card;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-4;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.bar-left {
  display: flex;
  gap: $spacing-5;
}

.bar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: $spacing-2;
  transition: transform $duration-fast $ease-bounce;
  
  &:active {
    transform: scale(0.9);
  }
}

.bar-icon {
  font-size: 44rpx;
}

.bar-text {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.next-btn {
  @include button-primary;
  padding: $spacing-3 $spacing-8;
}

.next-text {
  font-size: $font-size-base;
  color: $color-text-inverse;
  font-weight: $font-weight-semibold;
}

.next-arrow {
  font-size: $font-size-base;
  color: $color-text-inverse;
  margin-left: $spacing-2;
}
</style>
