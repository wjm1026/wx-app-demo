<template>
  <view class="page">
    <view v-if="favorites.length === 0" class="empty">
      <text class="empty-icon">💝</text>
      <text class="empty-text">还没有收藏任何卡片</text>
      <view class="empty-btn" @click="goHome">去发现更多</view>
    </view>

    <view v-else class="favorites-grid">
      <view 
        v-for="item in favorites" 
        :key="item.id" 
        class="favorite-item"
        @click="goCardDetail(item.id)"
      >
        <image class="favorite-image" :src="item.image" mode="aspectFill" />
        <view class="favorite-info">
          <text class="favorite-name">{{ item.name }}</text>
          <text class="favorite-category">{{ item.category }}</text>
        </view>
        <view class="remove-btn" @click.stop="removeFavorite(item.id)">
          <text class="remove-icon">✕</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo, showToast } from '@/utils'

const favorites = ref([
  { id: '1', name: '老虎', category: '动物', image: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=400' },
  { id: '2', name: '狮子', category: '动物', image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=400' },
  { id: '3', name: '苹果', category: '水果', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400' }
])

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function goCardDetail(id: string) {
  navigateTo(`/pages/card/detail?id=${id}`)
}

function removeFavorite(id: string) {
  const index = favorites.value.findIndex(f => f.id === id)
  if (index > -1) {
    favorites.value.splice(index, 1)
    showToast('已取消收藏')
  }
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background-color: #FFF9F0;
  padding: 24rpx;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx 32rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 30rpx;
  color: #999999;
  margin-bottom: 48rpx;
}

.empty-btn {
  padding: 24rpx 64rpx;
  background: linear-gradient(135deg, #FF6B6B, #FF8E8E);
  color: #FFFFFF;
  font-size: 30rpx;
  border-radius: 999rpx;
}

.favorites-grid {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.favorite-item {
  display: flex;
  align-items: center;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.favorite-image {
  width: 140rpx;
  height: 100rpx;
  border-radius: 16rpx;
  margin-right: 24rpx;
}

.favorite-info {
  flex: 1;
}

.favorite-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
  display: block;
}

.favorite-category {
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
  display: block;
}

.remove-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-icon {
  font-size: 28rpx;
  color: #CCCCCC;
}
</style>
