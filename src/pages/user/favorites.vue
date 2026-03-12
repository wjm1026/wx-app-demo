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
import { useFavoritesPage } from './useFavoritesPage'

const { favorites, goCardDetail, goHome, isLoading, removeFavorite } =
  useFavoritesPage()
</script>

<style src="./favorites.scss" scoped lang="scss"></style>
