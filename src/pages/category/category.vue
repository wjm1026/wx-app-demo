<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <text class="nav-title">分类</text>
      </view>
    </view>

    <view class="page-content" :style="{ paddingTop: navBarHeight + 'px' }">
      <!-- 页面标题 -->
      <view class="page-header">
        <text class="page-title">🎨 分类探索</text>
        <text class="page-subtitle">选择一个分类开始学习吧！</text>
      </view>

      <!-- 分类列表 -->
      <view v-if="!isInitialLoading" class="category-list">
        <view 
          v-for="(item, index) in categories" 
          :key="item._id" 
          class="category-section"
          :class="'delay-' + index"
        >
          <view class="category-header" @click="toggleExpand(item._id)">
            <view class="category-left">
              <view class="category-icon" :style="{ background: item.gradient }">
                <text class="category-emoji">{{ item.icon }}</text>
              </view>
              <view class="category-info">
                <text class="category-name">{{ item.name }}</text>
                <text class="category-count">{{ item.card_count || 0 }}个卡片</text>
              </view>
            </view>
            <view class="expand-btn" :class="{ expanded: expandedIds.includes(item._id) }">
              <text class="expand-icon">▼</text>
            </view>
          </view>
          
          <!-- 展开的卡片列表 -->
          <view v-if="expandedIds.includes(item._id)" class="card-grid">
            <view 
              v-for="card in item.cards" 
              :key="card._id" 
              class="card-item"
              @click="goCardDetail(card._id)"
            >
              <view class="card-image-wrapper">
                <image class="card-image" :src="card.image" mode="aspectFill" />
              </view>
              <text class="card-name">{{ card.name }}</text>
            </view>
            
            <!-- 加载更多 -->
            <view v-if="item.cards.length > 0 && item.hasMore" class="load-more" @click="loadMore(item._id)">
              <text class="load-more-icon">+</text>
              <text class="load-more-text">更多</text>
            </view>
          </view>
          
          <!-- 空状态 -->
          <view v-if="expandedIds.includes(item._id) && item.cards.length === 0 && !item.isLoading" class="empty-state">
            <text class="empty-icon">📭</text>
            <text class="empty-text">暂无卡片</text>
          </view>
          
          <!-- 加载中状态 -->
          <view v-if="item.isLoading" class="item-loading">
            <text class="loading-dot">. . .</text>
          </view>
        </view>
      </view>

      <!-- 加载占位 -->
      <view v-else class="category-list">
        <view class="category-section skeleton" v-for="n in 3" :key="n">
          <view class="category-header">
            <view class="category-left">
              <view class="category-icon"></view>
              <view class="category-info">
                <text class="category-name">加载中...</text>
                <text class="category-count">请稍候</text>
              </view>
            </view>
            <view class="expand-btn">
              <text class="expand-icon">▼</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部安全区 -->
      <view class="safe-bottom"></view>
    </view>
    <CustomTabbar :current="1" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { navigateTo } from '@/utils'
import CustomTabbar from '@/components/CustomTabbar/CustomTabbar.vue'
import { cardApi, type Category, type Card } from '@/api'
import { usePageLayout } from '@/composables/usePageLayout'

interface CategoryWithCards extends Category {
  cards: Card[]
  page: number
  hasMore: boolean
  isLoading: boolean
}

const categories = ref<CategoryWithCards[]>([])
const expandedIds = ref<string[]>([])
const isInitialLoading = ref(true)
const { statusBarHeight, navBarHeight } = usePageLayout()

onShow(async () => {
  await loadCategories()
  
  try {
    const targetId = uni.getStorageSync('TARGET_CATEGORY_ID')
    if (targetId) {
      if (!expandedIds.value.includes(targetId)) {
        toggleExpand(targetId)
      }
      uni.removeStorageSync('TARGET_CATEGORY_ID')
    }
  } catch (e) {
    console.error('读取分类参数失败', e)
  }
})

async function loadCategories() {
  isInitialLoading.value = true
  try {
    const res = await cardApi.getCategories()
    if (res.code === 0 && res.data) {
      // 保持之前的展开状态和已加载的卡片
      const oldCategories = categories.value
      categories.value = res.data.map(cat => {
        const oldCat = oldCategories.find(oc => oc._id === cat._id)
        return {
          ...cat,
          cards: oldCat ? oldCat.cards : [],
          page: oldCat ? oldCat.page : 1,
          hasMore: oldCat ? oldCat.hasMore : true,
          isLoading: false
        }
      })
      
      // 默认展开第一个（如果是第一次加载）
      if (expandedIds.value.length === 0 && categories.value.length > 0) {
        toggleExpand(categories.value[0]._id)
      }
    }
  } catch (e) {
    console.error('加载分类失败:', e)
  } finally {
    isInitialLoading.value = false
  }
}

async function loadCards(categoryId: string) {
  const category = categories.value.find(c => c._id === categoryId)
  if (!category || category.isLoading || !category.hasMore) return

  category.isLoading = true
  try {
    const res = await cardApi.getCardsByCategory({
      categoryId,
      page: category.page,
      pageSize: 12
    })
    
    if (res.code === 0 && res.data) {
      if (category.page === 1) {
        category.cards = res.data.list
      } else {
        category.cards = [...category.cards, ...res.data.list]
      }
      
      category.hasMore = category.cards.length < res.data.total
      category.page++
    }
  } catch (e) {
    console.error('加载卡片失败:', e)
  } finally {
    category.isLoading = false
  }
}

function toggleExpand(id: string) {
  const index = expandedIds.value.indexOf(id)
  if (index > -1) {
    expandedIds.value.splice(index, 1)
  } else {
    expandedIds.value.push(id)
    // 展开时如果没数据则加载
    const category = categories.value.find(c => c._id === id)
    if (category && category.cards.length === 0) {
      loadCards(id)
    }
  }
}

function goCardDetail(id: string) {
  navigateTo(`/pages/card/detail?id=${id}`)
}

function loadMore(categoryId: string) {
  loadCards(categoryId)
}
</script>

<style src="./category.scss" scoped lang="scss"></style>
