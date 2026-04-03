<template>
  <view class="page">
    <view class="page-bg">
      <view class="bg-orb bg-orb--warm"></view>
      <view class="bg-orb bg-orb--cool"></view>
    </view>

    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content" :style="navContentStyle">
        <view class="nav-brand" :style="navLogoStyle">
          <view class="brand-mark">
            <image
              class="brand-mark-image"
              :src="resolvedAppLogo"
              mode="aspectFit"
            />
          </view>
          <view class="brand-copy">
            <text class="brand-badge">轻松启蒙</text>
            <text class="nav-title">宝宝识物</text>
          </view>
        </view>
      </view>
    </view>

    <view class="main-scroll" :style="mainScrollStyle">
      <view class="content-shell">
        <view class="hero-card">
          <view class="hero-copy">
            <text class="hero-kicker">陪宝宝认识世界</text>
            <text class="hero-title-main">从熟悉的小事物开始，边看边听边开口</text>
            <text class="hero-description">{{ heroDescription }}</text>

            <view class="hero-chip-row">
              <view class="hero-chip">
                <text class="hero-chip-text">{{ categoryCountText }}</text>
              </view>
              <view class="hero-chip hero-chip--accent">
                <text class="hero-chip-text">{{ totalCardCountText }}</text>
              </view>
            </view>

            <text class="hero-topics">{{ featuredTopicsText }}</text>
          </view>

          <view class="hero-sticker">
            <view
              v-for="item in heroPreviewCards"
              :key="item.key"
              class="hero-sticker-card"
              :class="'hero-sticker-card--' + item.index"
            >
              <view
                v-if="item.image"
                class="hero-sticker-image"
                :style="{ backgroundImage: `url(${item.image})` }"
              ></view>
              <view v-else class="hero-sticker-ring">
                <text class="hero-sticker-text">{{ item.monogram }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="section-heading">
          <view class="section-heading-copy">
            <text class="section-kicker">主题分类</text>
            <text class="section-title">按生活场景慢慢学，更容易记住</text>
          </view>
        </view>

        <view v-if="!isInitialLoading" class="merged-category-grid">
          <view
            v-for="(item, index) in categories"
            :key="item._id"
            class="merged-category-card"
            :class="['delay-' + (index % 8), 'tone-' + (index % 4)]"
            @click="openCategoryCards(item)"
          >
            <view
              class="merged-category-icon"
              :class="{ 'merged-category-icon--image': getCategoryImage(item) }"
              :style="getCategoryCoverStyle(item, index)"
            >
              <image
                v-if="getCategoryImage(item)"
                class="merged-category-icon-image"
                :src="getCategoryImage(item)"
                mode="aspectFit"
              />
              <text v-else class="merged-category-monogram">{{ getCategoryMonogram(item) }}</text>
            </view>

            <view class="merged-category-content">
              <view class="merged-category-title-row">
                <text class="merged-category-title">{{ item.name }}</text>
                <view class="merged-category-arrow">
                  <image
                    class="merged-category-arrow-icon"
                    src="/static/icons/line/chevron-right.svg"
                    mode="aspectFit"
                  />
                </view>
              </view>

              <text class="merged-category-description">{{ getCategoryDescription(item) }}</text>

              <view class="merged-category-footer">
                <view class="merged-category-chip">
                  <text class="merged-category-chip-text">{{ getCategoryCountText(item) }}</text>
                </view>
                <text class="merged-category-footer-text">点击进入</text>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="merged-category-grid">
          <view v-for="n in 6" :key="n" class="merged-category-card merged-skeleton-card">
            <view class="merged-category-icon merged-skeleton-shimmer"></view>
            <view class="merged-category-content">
              <view class="merged-skeleton-line merged-skeleton-line--title"></view>
              <view class="merged-skeleton-line merged-skeleton-line--body"></view>
              <view class="merged-skeleton-line merged-skeleton-line--chip"></view>
            </view>
          </view>
        </view>

        <view class="safe-bottom" :style="safeBottomStyle"></view>
      </view>
    </view>

    <CustomTabbar :current="0" :reserve-space="false" />
  </view>
</template>

<script setup lang="ts">
import CustomTabbar from '@/components/CustomTabbar/CustomTabbar.vue'
import { useIndexPage } from './hooks/useIndexPage'

const {
  categoryCountText,
  categories,
  featuredTopicsText,
  getCategoryCountText,
  getCategoryCoverStyle,
  getCategoryDescription,
  getCategoryImage,
  getCategoryMonogram,
  heroDescription,
  heroPreviewCards,
  isInitialLoading,
  mainScrollStyle,
  navContentStyle,
  navLogoStyle,
  openCategoryCards,
  resolvedAppLogo,
  safeBottomStyle,
  statusBarHeight,
  totalCardCountText,
} = useIndexPage()
</script>

<style src="./styles/index.scss" scoped lang="scss"></style>
