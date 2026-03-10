<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-logo">
          <text class="logo-icon">🐣</text>
          <text class="nav-title">宝宝识物</text>
        </view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="main-scroll"
      :style="{ paddingTop: navBarHeight + 'px' }"
    >
      <!-- 欢迎横幅 -->
      <view class="welcome-banner">
        <view class="welcome-content">
          <view class="welcome-text">
            <text class="welcome-greeting">👋 嗨，小朋友！</text>
            <text class="welcome-message">今天想认识什么新朋友？</text>
          </view>
          <view class="welcome-decoration">
            <text class="deco-emoji bounce-1">🦁</text>
            <text class="deco-emoji bounce-2">🍎</text>
            <text class="deco-emoji bounce-3">🚗</text>
          </view>
        </view>
      </view>

      <!-- 搜索入口 -->
      <view class="search-entry" @click="goSearch">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <text class="search-placeholder">搜索动物、水果、交通工具...</text>
        </view>
      </view>

      <!-- 分类探索 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">🎨</text>
            <text class="title-text">探索分类</text>
          </view>
          <view class="section-more" @click="goCategory">
            <text class="more-text">全部</text>
            <text class="more-arrow">→</text>
          </view>
        </view>
        <view class="category-grid">
          <view
            v-for="(item, index) in categories"
            :key="item._id"
            class="category-card"
            :class="'delay-' + index"
            @click="goCategoryDetail(item._id)"
          >
            <view
              class="category-icon-wrapper"
              :style="{ background: item.gradient }"
            >
              <text class="category-emoji">{{ item.icon }}</text>
            </view>
            <text class="category-name">{{ item.name }}</text>
            <text class="category-count">{{ item.card_count || 0 }}个</text>
          </view>
        </view>
      </view>

      <!-- 热门推荐 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">🔥</text>
            <text class="title-text">热门推荐</text>
          </view>
        </view>
        <scroll-view scroll-x class="hot-scroll" :show-scrollbar="false">
          <view class="hot-list">
            <view
              v-for="card in hotCards"
              :key="card._id"
              class="hot-card"
              @click="goCardDetail(card._id)"
            >
              <view class="hot-image-wrapper">
                <image class="hot-image" :src="card.image" mode="aspectFill" />
                <view class="hot-badge">
                  <text class="badge-text">HOT</text>
                </view>
              </view>
              <view class="hot-info">
                <text class="hot-name">{{ card.name }}</text>
                <text class="hot-name-en">{{ card.name_en }}</text>
              </view>
              <view class="hot-play-btn">
                <text class="play-icon">▶</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 最新上线 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">
            <text class="title-icon">✨</text>
            <text class="title-text">最新上线</text>
          </view>
          <view class="section-more">
            <text class="more-text">更多</text>
            <text class="more-arrow">→</text>
          </view>
        </view>
        <view class="card-grid">
          <view
            v-for="card in recentCards"
            :key="card._id"
            class="card-item"
            @click="goCardDetail(card._id)"
          >
            <view class="card-image-wrapper">
              <image class="card-image" :src="card.image" mode="aspectFill" />
              <view v-if="isNewCard(card)" class="new-badge">NEW</view>
            </view>
            <view class="card-content">
              <text class="card-name">{{ card.name }}</text>
              <view class="card-footer">
                <view class="card-stat">
                  <text class="stat-icon">👀</text>
                  <text class="stat-value">{{
                    formatNumber(card.view_count || 0)
                  }}</text>
                </view>
                <view
                  class="card-tag"
                  :style="{ backgroundColor: 'rgba(96, 165, 250, 0.15)' }"
                >
                  {{ getCategoryName(card) }}
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 学习进度 -->
      <view class="progress-section">
        <view class="progress-card">
          <view class="progress-header">
            <text class="progress-title">📚 今日学习</text>
            <text class="progress-detail">查看详情 →</text>
          </view>
          <view class="progress-stats">
            <view class="stat-item">
              <text class="stat-number">{{ todayStats.learned }}</text>
              <text class="stat-label">已学习</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat-item">
              <text class="stat-number">{{ todayStats.streak }}</text>
              <text class="stat-label">连续天数</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat-item">
              <text class="stat-number">{{ todayStats.points }}</text>
              <text class="stat-label">获得积分</text>
            </view>
          </view>
          <view class="progress-bar-wrapper">
            <view
              class="progress-bar"
              :style="{ width: progressPercent + '%' }"
            ></view>
          </view>
          <text class="progress-tip"
            >再学习 {{ remainCards }} 个卡片完成今日目标 🎯</text
          >
        </view>
      </view>

      <view class="safe-bottom"></view>
    </scroll-view>
    <CustomTabbar :current="0" />
  </view>
</template>

<script setup lang="ts">
import { onLoad } from "@dcloudio/uni-app";
import { ref, computed } from "vue";
import {
  formatNumber,
  getStatusBarHeight,
  getNavBarHeight,
  navigateTo,
} from "@/utils";
import CustomTabbar from "@/components/CustomTabbar/CustomTabbar.vue";
import { cardApi, type Category, type Card } from "@/api";

const statusBarHeight = ref(getStatusBarHeight());
const navBarHeight = ref(getNavBarHeight());

const categories = ref<Category[]>([]);
const hotCards = ref<Card[]>([]);
const recentCards = ref<Card[]>([]);
const isLoading = ref(false);

// 加载首页真实数据
const loadData = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    const res = await cardApi.getHomeData();
    if (res.code === 0 && res.data) {
      categories.value = res.data.categories || [];
      hotCards.value = res.data.hotCards || [];
      recentCards.value = res.data.recentCards || [];
    }
  } catch (e) {
    console.error("加载首页数据失败:", e);
  } finally {
    isLoading.value = false;
  }
};

onLoad(() => {
  loadData();
});

const todayStats = ref({
  learned: 5,
  streak: 3,
  points: 25,
});

const dailyGoal = 10;
const remainCards = computed(() =>
  Math.max(0, dailyGoal - todayStats.value.learned),
);
const progressPercent = computed(() =>
  Math.min(100, (todayStats.value.learned / dailyGoal) * 100),
);

const NEW_CARD_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function isNewCard(card: Card): boolean {
  if (!card.create_time) return false;
  return Date.now() - card.create_time < NEW_CARD_WINDOW_MS;
}

function getCategoryName(card: Card): string {
  return (
    categories.value.find((item) => item._id === card.category_id)?.name ||
    "未分类"
  );
}

function goSearch() {
  navigateTo("/pages/search/search");
}

function goCategory() {
  uni.switchTab({ url: "/pages/category/category" });
}

function goCategoryDetail(id: string) {
  // TabBar页面不支持带参数跳转，通过Storage传递参数
  uni.setStorageSync("TARGET_CATEGORY_ID", id);
  uni.switchTab({
    url: "/pages/category/category",
  });
}

function goCardDetail(id: string) {
  navigateTo(`/pages/card/detail?id=${id}`);
}
</script>

<style src="./index.scss" scoped lang="scss"></style>
