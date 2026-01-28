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
          <swiper-item v-for="(img, index) in heroImages" :key="`${img}-${index}`">
            <image class="hero-image" :src="img" mode="aspectFill" />
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
          <text class="badge-icon">{{ heroBadgeIcon }}</text>
          <text class="badge-text">{{ heroBadgeText }}</text>
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
        <view v-if="cardData.fun_fact" class="fun-card">
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
import { ref, onUnmounted, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getStatusBarHeight, getNavBarHeight, navigateTo, navigateBack, showToast } from '@/utils'
import { cardApi, achievementApi, type Card } from '@/api'
import { useStore } from '@/store'

const store = useStore()

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

const heroImages = computed(() => {
  const cover = cardData.value.image ? [cardData.value.image] : []
  const extra = (cardData.value.images || []).filter(Boolean)
  const merged = [...cover, ...extra]
  return Array.from(new Set(merged))
})

const heroBadgeIcon = computed(() => cardData.value.category?.icon || '📚')
const heroBadgeText = computed(() => cardData.value.category?.name || '未分类')

// 音频上下文
const audioContext = uni.createInnerAudioContext()
audioContext.onError((res) => {
  console.error('播放失败:', res)
  showToast('播放失败，请检查网络', 'error')
  audioContext.stop()
  audioContext.src = ''
})

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
      
      // 记录学习进度（登录用户）
      if (store.isLoggedIn) {
        recordLearning(id)
      }
      
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

async function recordLearning(cardId: string) {
  try {
    const res = await achievementApi.recordLearning(cardId)
    if (res.code === 0 && res.data?.newAchievements?.length > 0) {
      const achievement = res.data.newAchievements[0]
      setTimeout(() => {
        showToast(`🎉 解锁成就: ${achievement.name}`, 'success')
      }, 1000)
    }
  } catch (e) {
    // 静默失败，不影响主流程
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
  if (!store.isLoggedIn) {
    showToast('请先登录', 'none')
    return
  }
  if (!cardData.value._id) return
  try {
    const res = await cardApi.toggleFavorite(cardData.value._id)
    if (res.code === 0) {
      isFavorited.value = res.data.isFavorited
      showToast(isFavorited.value ? '已收藏 ❤️' : '已取消收藏', 'success')
    } else {
      showToast(res.msg || '操作失败', 'error')
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

<style src="./detail.scss" scoped lang="scss"></style>
