<template>
  <view class="page game-hub-page">
    <view class="hub-stage" :style="stageStyle">
      <view class="hub-header">
        <text class="hub-kicker">Game Center</text>
        <text class="hub-title">小游戏乐园</text>
        <text class="hub-subtitle">选择一个板块开始体验，当前共 6 个玩法入口。</text>
      </view>

      <view class="hub-grid">
        <view
          v-for="item in gameBlocks"
          :key="item.key"
          class="hub-card"
          :class="[`tone-${item.tone}`, { 'is-live': item.available }]"
          @click="openGame(item)"
        >
          <view class="hub-card-top">
            <view class="hub-icon-shell">
              <image class="hub-icon" :src="item.icon" mode="aspectFit" />
            </view>
            <view class="hub-status" :class="{ 'is-live': item.available }">
              {{ item.available ? '可玩' : '即将上线' }}
            </view>
          </view>
          <text class="hub-card-title">{{ item.title }}</text>
          <text class="hub-card-desc">{{ item.desc }}</text>
        </view>
      </view>

      <view class="hub-footer">
        <text class="hub-footer-text">推荐先玩「听音选图」，当前已接入交互和成功烟花反馈。</text>
      </view>
    </view>

    <view v-if="isCategoryPickerVisible" class="category-picker-mask" @click="closeCategoryPicker">
      <view class="category-picker-panel" @click.stop>
        <view class="category-picker-handle"></view>
        <view class="category-picker-glow glow-a"></view>
        <view class="category-picker-glow glow-b"></view>

        <view class="category-picker-header">
          <view class="category-picker-title-wrap">
            <text class="category-picker-kicker">Listen Pick</text>
            <text class="category-picker-title">选择分类开始闯关</text>
            <text class="category-picker-subtitle">每次会随机抽题，先选一个你喜欢的分类</text>
          </view>
          <text class="category-picker-close" @click="closeCategoryPicker">关闭</text>
        </view>

        <view v-if="isCategoryLoading" class="category-picker-state">
          正在加载分类...
        </view>

        <view v-else-if="categoryError" class="category-picker-state category-picker-state--error">
          <text>{{ categoryError }}</text>
          <view class="category-picker-retry" @click="reloadCategories">重新加载</view>
        </view>

        <scroll-view v-else class="category-picker-list" scroll-y :scroll-top="categoryPickerScrollTop">
          <view
            v-for="(item, index) in categoryOptions"
            :key="item.id"
            class="category-option"
            @click="enterListenPick(item)"
          >
            <view class="category-option-index">{{ index + 1 }}</view>
            <view class="category-option-cover">
              <image v-if="item.image" class="category-option-image" :src="item.image" mode="aspectFill" />
              <view v-else class="category-option-fallback">{{ item.name.slice(0, 1) }}</view>
            </view>
            <view class="category-option-main">
              <text class="category-option-name">{{ item.name }}</text>
              <view class="category-option-tags">
                <text class="category-option-meta">{{ item.cardCountText }}</text>
                <text class="category-option-chip">随机题库</text>
              </view>
            </view>
            <view class="category-option-action">
              <text class="category-option-action-text">开始</text>
              <image class="category-option-arrow" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <CustomTabbar :current="1" :reserve-space="false" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CustomTabbar from '@/components/CustomTabbar/CustomTabbar.vue'
import { cardApi, type Category } from '@/api'
import { getErrorMessage, getNavBarHeight, getSafeAreaBottom, navigateTo, showToast } from '@/utils'

interface GameBlock {
  key: string
  title: string
  desc: string
  icon: string
  tone: 'gold' | 'blue' | 'green' | 'pink' | 'purple' | 'teal'
  available: boolean
  gameName?: string
}

interface GameCategoryOption {
  id: string
  name: string
  image: string
  cardCountText: string
}

const gameBlocks: GameBlock[] = [
  {
    key: 'listen-pick',
    title: '听音选图',
    desc: '听问题后在卡片中选对答案',
    icon: '/static/icons/line/message.svg',
    tone: 'gold',
    available: true,
    gameName: 'listen-pick',
  },
  {
    key: 'picture-word',
    title: '看图选词',
    desc: '根据图片选择正确文字',
    icon: '/static/icons/line/grid.svg',
    tone: 'blue',
    available: false,
  },
  {
    key: 'true-false',
    title: '真假判断',
    desc: '快速判断陈述是否正确',
    icon: '/static/icons/line/check-circle.svg',
    tone: 'green',
    available: false,
  },
  {
    key: 'memory-flip',
    title: '记忆翻翻卡',
    desc: '翻牌配对，训练短时记忆',
    icon: '/static/icons/line/crown.svg',
    tone: 'pink',
    available: false,
  },
  {
    key: 'drag-match',
    title: '拖拽配对',
    desc: '把动物和名称拖到一起',
    icon: '/static/icons/line/share.svg',
    tone: 'purple',
    available: false,
  },
  {
    key: 'time-rush',
    title: '限时挑战',
    desc: '计时连击，冲击更高分',
    icon: '/static/icons/line/trophy.svg',
    tone: 'teal',
    available: false,
  },
]

const stageStyle = computed<Record<string, string>>(() => {
  const topInset = getNavBarHeight() + uni.upx2px(20)
  const bottomInset = getSafeAreaBottom() + uni.upx2px(152)

  return {
    paddingTop: `${topInset}px`,
    paddingBottom: `${bottomInset}px`,
  }
})

const isCategoryPickerVisible = ref(false)
const isCategoryLoading = ref(false)
const categoryError = ref('')
const categoryOptions = ref<GameCategoryOption[]>([])
const categoryPickerScrollTop = ref(0)

function openGame(item: GameBlock) {
  if (item.available) {
    if ((item.gameName || item.key) === 'listen-pick') {
      openCategoryPicker()
      return
    }

    navigateTo(`/pages/game/${encodeURIComponent(item.gameName || item.key)}`)
    return
  }

  navigateTo(
    `/pages/game/coming-soon?title=${encodeURIComponent(item.title)}&desc=${encodeURIComponent(item.desc)}`,
  )
}

function closeCategoryPicker() {
  isCategoryPickerVisible.value = false
}

function openCategoryPicker() {
  categoryPickerScrollTop.value = 0
  isCategoryPickerVisible.value = true
  void ensureCategoryOptions()
}

async function reloadCategories() {
  categoryOptions.value = []
  await ensureCategoryOptions()
}

async function ensureCategoryOptions() {
  if (isCategoryLoading.value) {
    return
  }
  if (categoryOptions.value.length > 0) {
    return
  }

  isCategoryLoading.value = true
  categoryError.value = ''
  try {
    const response = await cardApi.getCategories()
    if (response.code !== 0 || !Array.isArray(response.data)) {
      throw new Error(response.msg || '加载分类失败')
    }

    const mapped = response.data
      .map(toCategoryOption)
      .filter((item): item is GameCategoryOption => !!item)

    if (mapped.length <= 0) {
      throw new Error('当前暂无可用分类')
    }

    categoryOptions.value = mapped
  } catch (error) {
    categoryError.value = getErrorMessage(error, '加载分类失败')
    showToast(categoryError.value)
  } finally {
    isCategoryLoading.value = false
  }
}

function toCategoryOption(category: Category): GameCategoryOption | null {
  const id = String(category?._id || '').trim()
  const name = String(category?.name || '').trim()
  if (!id || !name) {
    return null
  }

  const cover = String(category?.cover || '').trim()
  const icon = String(category?.icon || '').trim()
  const image = cover || icon
  const cardCount = Number(category?.card_count || 0)
  const cardCountText = cardCount > 0 ? `${cardCount} 张卡片` : '点击开始挑战'

  return {
    id,
    name,
    image,
    cardCountText,
  }
}

function enterListenPick(option: GameCategoryOption) {
  const queryParts = [
    `gameName=${encodeURIComponent('listen-pick')}`,
    `categoryId=${encodeURIComponent(option.id)}`,
    `categoryName=${encodeURIComponent(option.name)}`,
  ]
  closeCategoryPicker()
  navigateTo(`/pages/game/listen-pick?${queryParts.join('&')}`)
}
</script>

<style src="./styles/game.scss" scoped lang="scss"></style>
