<template>
  <view class="page">
    <view v-if="isLoading && favorites.length === 0" class="loading-state">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="favorites.length === 0" class="empty">
      <text class="empty-icon">💝</text>
      <text class="empty-text">还没有收藏任何卡片</text>
      <view class="empty-btn" @click="goHome">去发现更多</view>
    </view>

    <view v-else class="favorites-grid">
      <view 
        v-for="item in favorites" 
        :key="item._id" 
        class="favorite-item"
        @click="goCardDetail(item._id)"
      >
        <image class="favorite-image" :src="item.image" mode="aspectFill" />
        <view class="favorite-info">
          <text class="favorite-name">{{ item.name }}</text>
          <text class="favorite-category">{{ item.category?.name || '未知分类' }}</text>
        </view>
        <view class="remove-btn" @click.stop="removeFavorite(item)">
          <text class="remove-icon">✕</text>
        </view>
      </view>
    </view>
    
    <view v-if="isLoading && favorites.length > 0" class="loading-more">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { navigateTo, showToast, getErrorMessage } from '@/utils'
import { cardApi, type Card } from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'
import { usePagedList } from '@/composables/usePagedList'

const { ensureLoggedIn } = useLoginGuard()
const {
  list: favorites,
  loading: isLoading,
  currentPage,
  hasMore,
  refresh,
  loadMore,
} = usePagedList<Card>({
  pageSize: 20,
  fetcher: ({ page, pageSize }) => cardApi.getFavorites({ page, pageSize }),
  onError: (message) => showToast(message || '获取收藏失败')
})

onShow(() => {
  if (!ensureLoggedIn()) {
    return
  }
  void refresh()
})

onPullDownRefresh(async () => {
  if (!ensureLoggedIn()) {
    uni.stopPullDownRefresh()
    return
  }

  await refresh()
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (hasMore.value && !isLoading.value) {
    void loadMore()
  }
})

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function goCardDetail(id: string) {
  navigateTo(`/pages/card/detail?id=${id}`)
}

async function removeFavorite(item: Card) {
  uni.showModal({
    title: '提示',
    content: '确定要取消收藏吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await cardApi.toggleFavorite(item._id)
          if (apiRes.code === 0) {
            favorites.value = favorites.value.filter(f => f._id !== item._id)
            showToast('已取消收藏')
            if (favorites.value.length === 0 && currentPage.value > 1) {
              void refresh()
            }
          } else {
            showToast(apiRes.msg || '操作失败')
          }
        } catch (error) {
          showToast(getErrorMessage(error, '操作失败'))
        }
      }
    }
  })
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background-color: $color-bg-primary;
  padding: $spacing-3;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  
  .loading-spinner {
    width: 60rpx;
    height: 60rpx;
    border: 6rpx solid $color-bg-secondary;
    border-top-color: $color-primary;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: $spacing-3;
  }
  
  .loading-text {
    font-size: $font-size-sm;
    color: $color-text-tertiary;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx $spacing-4;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: $spacing-4;
  animation: float 3s ease-in-out infinite;
}

.empty-text {
  font-size: $font-size-base;
  color: $color-text-tertiary;
  margin-bottom: $spacing-6;
}

.empty-btn {
  @include button-primary;
  padding: $spacing-3 $spacing-8;
}

.favorites-grid {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.favorite-item {
  display: flex;
  align-items: center;
  background-color: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-3;
  box-shadow: $shadow-sm;
  transition: transform $duration-fast $ease-bounce;
  
  &:active {
    transform: scale(0.98);
  }
}

.favorite-image {
  width: 140rpx;
  height: 140rpx;
  border-radius: $radius-md;
  margin-right: $spacing-3;
  background-color: $color-bg-secondary;
}

.favorite-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: $spacing-1;
}

.favorite-name {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.favorite-category {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  background-color: $color-bg-secondary;
  padding: 4rpx 12rpx;
  border-radius: $radius-full;
  align-self: flex-start;
}

.remove-btn {
  @include icon-button;
  width: 64rpx;
  height: 64rpx;
  background-color: transparent;
  box-shadow: none;
  
  &:active {
    background-color: $color-bg-secondary;
  }
}

.remove-icon {
  font-size: 32rpx;
  color: $color-text-tertiary;
}

.loading-more {
  text-align: center;
  padding: $spacing-3;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}
</style>
