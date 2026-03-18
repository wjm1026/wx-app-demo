<template>
  <view class="page">
    <!-- Header Section -->
    <view class="header">
      <view class="header-content">
        <text class="page-title">数据概览</text>
        <text class="page-subtitle">平台运营数据实时监控</text>
      </view>
      <view class="header-decoration">
        <text class="deco-circle c1"></text>
        <text class="deco-circle c2"></text>
      </view>
    </view>

    <!-- Content Area -->
    <view class="content-container">
      
      <!-- Overview Cards -->
      <view class="section-title">
        <text class="title-icon">📊</text>
        <text>总览数据</text>
      </view>
      
      <view class="overview-grid">
        <view class="stat-card primary">
          <view class="icon-wrapper">
            <text class="icon">👥</text>
          </view>
          <text class="stat-num">{{ formatNumber(stats.userCount) }}</text>
          <text class="stat-label">用户总数</text>
        </view>
        
        <view class="stat-card secondary">
          <view class="icon-wrapper">
            <text class="icon">🃏</text>
          </view>
          <text class="stat-num">{{ formatNumber(stats.cardCount) }}</text>
          <text class="stat-label">卡片总数</text>
        </view>
        
        <view class="stat-card accent">
          <view class="icon-wrapper">
            <text class="icon">📁</text>
          </view>
          <text class="stat-num">{{ formatNumber(stats.categoryCount) }}</text>
          <text class="stat-label">分类数量</text>
        </view>
      </view>

      <!-- Today's Stats -->
      <view class="section-title">
        <text class="title-icon">📅</text>
        <text>今日动态</text>
      </view>
      
      <view class="today-stats-row">
        <view class="today-card new-users">
          <view class="today-header">
            <text class="today-label">今日新增</text>
            <text class="trend-icon">↗</text>
          </view>
          <view class="today-body">
            <text class="today-num">{{ formatNumber(stats.todayNewUsers) }}</text>
            <text class="unit">人</text>
          </view>
        </view>
        
        <view class="today-card active-users">
          <view class="today-header">
            <text class="today-label">今日活跃</text>
            <text class="trend-icon">⚡</text>
          </view>
          <view class="today-body">
            <text class="today-num">{{ formatNumber(stats.todayActiveUsers) }}</text>
            <text class="unit">人</text>
          </view>
        </view>
      </view>

      <!-- Points Distribution -->
      <view class="section-title">
        <text class="title-icon">💰</text>
        <text>积分分布 (今日)</text>
      </view>

      <view class="points-list">
        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>
        
        <template v-else>
          <view v-if="!stats.todayPointsStats || stats.todayPointsStats.length === 0" class="empty-state">
            <text>暂无积分变动数据</text>
          </view>
          
          <view 
            v-else
            v-for="(item, index) in stats.todayPointsStats" 
            :key="index"
            class="point-item"
          >
            <view class="point-icon-box" :class="getPointTypeColor(item._id)">
              <text class="point-icon">{{ getPointTypeIcon(item._id) }}</text>
            </view>
            
            <view class="point-info">
              <text class="point-type">{{ getPointTypeName(item._id) }}</text>
              <text class="point-count">{{ formatNumber(item.count) }} 笔交易</text>
            </view>
            
            <view class="point-value">
              <text class="amount" :class="{ 'negative': isNegative(item._id) }">
                {{ isNegative(item._id) ? '-' : '+' }}{{ formatNumber(item.total) }}
              </text>
              <text class="label">积分</text>
            </view>
          </view>
        </template>
      </view>

    </view>
    
    <!-- Safe Area Bottom -->
    <view class="safe-bottom"></view>
  </view>
</template>

<script setup lang="ts">
import { useAdminStatsPage } from './hooks/useAdminStatsPage'

const {
  formatNumber,
  getPointTypeColor,
  getPointTypeIcon,
  getPointTypeName,
  isNegative,
  loading,
  stats,
} = useAdminStatsPage()
</script>

<style src="./styles/stats.scss" scoped lang="scss"></style>
