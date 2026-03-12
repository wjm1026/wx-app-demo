<template>
  <view class="page">
    <!-- Header Area -->
    <view class="header">
      <view class="points-display">
        <text class="points-label">当前积分</text>
        <text class="points-value">{{ store.userInfo?.points || 0 }}</text>
      </view>
      <view class="header-decoration">
        <text class="deco-coin c1">🪙</text>
        <text class="deco-coin c2">💰</text>
      </view>
    </view>

    <!-- Content Area -->
    <view class="content-wrapper">
      <view class="section-title">
        <text>积分明细</text>
      </view>

      <!-- List -->
      <view v-if="logs.length > 0" class="log-list">
        <view 
          v-for="(item, index) in logs" 
          :key="index" 
          class="log-item"
        >
          <view class="item-icon-wrapper" :class="item.amount > 0 ? 'earn' : 'consume'">
            <text class="item-icon">{{ item.amount > 0 ? '🎁' : '🛍️' }}</text>
          </view>
          
          <view class="item-content">
          <text class="item-title">{{ item.description || (item.amount > 0 ? '获取积分' : '使用积分') }}</text>
          <text class="item-time">{{ formatDate(item.create_time) }}</text>
        </view>
        
          <view class="item-amount" :class="item.amount > 0 ? 'plus' : 'minus'">
            {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}
          </view>
        </view>
      </view>

      <!-- Empty State -->
      <view v-else-if="!loading" class="empty-state">
        <text class="empty-icon">📝</text>
        <text class="empty-text">暂无积分记录</text>
      </view>

      <!-- Loading Status -->
      <view v-if="loading || logs.length > 0" class="loading-status">
        <text>{{ loading ? '加载中...' : (finished ? '没有更多记录了' : '上拉加载更多') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { usePointsLogPage } from './usePointsLogPage'

const { finished, formatDate, loading, logs, store } = usePointsLogPage()
</script>

<style src="./points-log.scss" scoped lang="scss"></style>
