<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">卡片管理</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="hero-card">
      <view class="hero-copy">
        <text class="hero-kicker">CARD OPS</text>
        <text class="hero-title">让卡片数据维护更快、更稳</text>
        <text class="hero-desc">支持按分类和状态筛选，新增、编辑、删除统一在一个页面内完成。</text>
      </view>
      <view class="hero-action" @click="openCreateForm">新增卡片</view>
    </view>

    <view class="filter-card">
      <view class="section-head">
        <view class="section-copy">
          <text class="section-title">筛选条件</text>
          <text class="section-subtitle">按关键词、状态和分类快速定位目标卡片。</text>
        </view>
        <view v-if="hasFilters" class="section-action" @click="resetFilters">重置</view>
      </view>

      <view class="search-panel">
        <text class="field-label">关键词</text>
        <view class="search-shell">
          <input
            v-model="keyword"
            class="search-input"
            type="text"
            confirm-type="search"
            placeholder="输入卡片名称或英文名"
            @confirm="onSearch"
          />
          <view class="search-btn" @click="onSearch">搜索</view>
        </view>
        <view v-if="keyword" class="search-meta">
          <text class="search-meta-text">当前关键词：{{ keyword }}</text>
          <view class="search-clear" @click="clearKeyword">清空</view>
        </view>
      </view>

      <view class="filter-panel">
        <text class="field-label">状态</text>
        <view class="status-tabs">
          <view
            v-for="tab in statusTabs"
            :key="tab.value"
            class="status-tab"
            :class="{ active: activeStatus === tab.value }"
            @click="switchStatus(tab.value)"
          >
            <text class="status-tab-label">{{ tab.label }}</text>
            <text class="status-tab-note">{{ tab.note }}</text>
          </view>
        </view>
      </view>

      <view class="filter-panel">
        <view class="field-row">
          <text class="field-label">分类</text>
          <text v-if="categoriesLoading" class="field-helper">同步中...</text>
        </view>
        <scroll-view class="category-rail" scroll-x enable-flex>
          <view class="category-list">
            <view
              v-for="category in categoryFilterOptions"
              :key="category._id || 'all'"
              class="category-chip"
              :class="{ active: activeCategoryId === category._id }"
              @click="switchCategory(category._id || '')"
            >
              <text class="category-chip-name">{{ category.name }}</text>
              <text class="category-chip-count">{{ category.card_count || 0 }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="filter-summary">
        <text class="filter-summary-primary">{{ resultSummary }}</text>
        <text class="filter-summary-secondary">{{ resultHint }}</text>
      </view>
    </view>

    <view v-if="loading && cardList.length === 0" class="state-card loading-card">
      <view class="loading-spinner"></view>
      <text class="state-title">正在加载卡片列表</text>
      <text class="state-desc">卡片数据马上就绪，请稍等。</text>
    </view>

    <template v-else-if="cardList.length > 0">
      <view class="list-section">
        <view class="section-head">
          <view class="section-copy">
            <text class="section-title">卡片列表</text>
            <text class="section-subtitle">点击编辑可修改字段，删除操作会同步清理关联收藏。</text>
          </view>
          <view class="section-action primary" @click="openCreateForm">新增</view>
        </view>

        <view class="card-list">
          <view v-for="card in cardList" :key="card._id" class="card-item">
            <view class="card-main">
              <image class="card-cover" :src="card.image" mode="aspectFill" />

              <view class="card-body">
                <view class="card-title-row">
                  <text class="card-title">{{ card.name || '未命名卡片' }}</text>
                  <view class="badge-row">
                    <text class="badge" :class="card.status === 0 ? 'is-muted' : 'is-ready'">
                      {{ card.status === 0 ? '禁用' : '启用' }}
                    </text>
                    <text v-if="card.is_hot" class="badge is-hot">热门</text>
                    <text v-if="card.is_free" class="badge is-free">免费</text>
                  </view>
                </view>

                <text class="card-subtitle">
                  {{ card.name_en || '-' }} · {{ getCategoryName(card.category_id) }}
                </text>
                <text class="card-tags">{{ formatTags(card.tags) }}</text>

                <view class="metric-row">
                  <text class="metric-item">浏览 {{ card.view_count || 0 }}</text>
                  <text class="metric-item">收藏 {{ card.favorite_count || 0 }}</text>
                  <text class="metric-item">积分 {{ card.points_cost || 0 }}</text>
                </view>

                <text class="card-time">更新于 {{ formatCardDate(card.update_time || card.create_time) }}</text>
              </view>
            </view>

            <view class="card-actions">
              <view class="card-action edit" @click="openEditForm(card)">编辑</view>
              <view class="card-action delete" @click="deleteCard(card)">删除</view>
            </view>
          </view>
        </view>

        <view v-if="loading" class="list-footer">正在加载更多...</view>
        <view v-else-if="hasMore" class="list-footer">继续上拉加载更多</view>
        <view v-else class="list-footer">已加载全部卡片</view>
      </view>
    </template>

    <view v-else class="state-card empty-card">
      <view class="empty-icon-shell">
        <image class="empty-icon" src="/static/icons/line/ticket.svg" mode="aspectFit" />
      </view>
      <text class="state-title">还没有卡片数据</text>
      <text class="state-desc">可以先新增一张卡片，后续再补充音频、视频和描述信息。</text>
      <view class="empty-action" @click="openCreateForm">新增第一张卡片</view>
    </view>

    <view v-if="formVisible" class="editor-mask" @touchmove.stop.prevent="">
      <view class="editor-sheet">
        <view class="editor-head">
          <view class="editor-copy">
            <text class="editor-title">{{ formTitle }}</text>
            <text class="editor-subtitle">带 * 的字段为必填，保存后会立即生效。</text>
          </view>
          <view class="editor-close" @click="closeForm">关闭</view>
        </view>

        <scroll-view class="editor-scroll" scroll-y>
          <view class="editor-grid">
            <view class="form-item span-2">
              <text class="form-label">卡片名称 *</text>
              <input
                class="form-input"
                :value="formModel.name"
                placeholder="例如：小老虎"
                @input="handleFormTextInput('name', $event)"
              />
            </view>

            <view class="form-item">
              <text class="form-label">英文名</text>
              <input
                class="form-input"
                :value="formModel.name_en"
                placeholder="Tiger"
                @input="handleFormTextInput('name_en', $event)"
              />
            </view>

            <view class="form-item">
              <text class="form-label">拼音</text>
              <input
                class="form-input"
                :value="formModel.name_pinyin"
                placeholder="lao hu"
                @input="handleFormTextInput('name_pinyin', $event)"
              />
            </view>

            <view class="form-item span-2">
              <text class="form-label">所属分类 *</text>
              <picker
                mode="selector"
                :value="formCategoryIndex"
                range-key="name"
                :range="categories"
                @change="handleFormCategoryChange"
              >
                <view class="picker-shell">
                  <text class="picker-text">{{ getCategoryName(formModel.category_id) }}</text>
                  <image class="picker-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
                </view>
              </picker>
            </view>

            <view class="form-item span-2">
              <text class="form-label">主图 URL *</text>
              <view class="form-image-actions">
                <view class="form-upload-btn" :class="{ disabled: imageUploading }" @click="uploadFormImage">
                  {{ imageUploading ? '图片上传中...' : '选择图片上传' }}
                </view>
                <text class="form-upload-hint">也可以直接粘贴 URL</text>
              </view>
              <input
                class="form-input"
                :value="formModel.image"
                placeholder="https://..."
                @input="handleFormTextInput('image', $event)"
              />
              <view v-if="formModel.image" class="form-image-preview-shell">
                <image class="form-image-preview" :src="formModel.image" mode="aspectFill" />
              </view>
            </view>

            <view class="form-item span-2">
              <text class="form-label">标签</text>
              <input
                class="form-input"
                :value="formModel.tagsInput"
                placeholder="用空格或逗号分隔，例如：动物, 猫科, 哺乳类"
                @input="handleFormTextInput('tagsInput', $event)"
              />
            </view>

            <view class="form-item span-2">
              <text class="form-label">描述</text>
              <textarea
                class="form-textarea"
                auto-height
                maxlength="180"
                :value="formModel.description"
                placeholder="补充一段给家长或孩子阅读的介绍"
                @input="handleFormTextInput('description', $event)"
              />
            </view>

            <view class="form-item span-2">
              <text class="form-label">趣味知识</text>
              <textarea
                class="form-textarea"
                auto-height
                maxlength="180"
                :value="formModel.fun_fact"
                placeholder="例如：老虎的夜视能力非常强"
                @input="handleFormTextInput('fun_fact', $event)"
              />
            </view>

            <view class="form-item span-2">
              <text class="form-label">音频 URL（中文）</text>
              <input
                class="form-input"
                :value="formModel.audio"
                placeholder="https://..."
                @input="handleFormTextInput('audio', $event)"
              />
            </view>

            <view class="form-item span-2">
              <text class="form-label">音频 URL（英文）</text>
              <input
                class="form-input"
                :value="formModel.audio_en"
                placeholder="https://..."
                @input="handleFormTextInput('audio_en', $event)"
              />
            </view>

            <view class="form-item span-2">
              <text class="form-label">声音 URL</text>
              <input
                class="form-input"
                :value="formModel.sound"
                placeholder="https://..."
                @input="handleFormTextInput('sound', $event)"
              />
            </view>

            <view class="form-item span-2">
              <text class="form-label">视频 URL</text>
              <input
                class="form-input"
                :value="formModel.video"
                placeholder="https://..."
                @input="handleFormTextInput('video', $event)"
              />
            </view>

            <view class="form-item">
              <text class="form-label">积分成本</text>
              <input
                class="form-input"
                type="number"
                :disabled="formModel.is_free"
                :value="String(formModel.points_cost)"
                placeholder="免费卡片自动为 0"
                @input="handleFormNumberInput('points_cost', $event)"
              />
            </view>

            <view class="form-item switch-item">
              <text class="form-label">免费卡片</text>
              <switch
                color="#1d4ed8"
                :checked="formModel.is_free"
                @change="handleFormBooleanChange('is_free', $event)"
              />
            </view>

            <view class="form-item switch-item">
              <text class="form-label">热门推荐</text>
              <switch
                color="#0f766e"
                :checked="formModel.is_hot"
                @change="handleFormBooleanChange('is_hot', $event)"
              />
            </view>

            <view class="form-item switch-item">
              <text class="form-label">启用状态</text>
              <switch
                color="#16a34a"
                :checked="formModel.status === 1"
                @change="handleStatusChange($event)"
              />
            </view>
          </view>
        </scroll-view>

        <view class="editor-actions">
          <view class="editor-btn ghost" @click="closeForm">取消</view>
          <view class="editor-btn solid" @click="saveCardForm">
            {{ formSaving ? '保存中...' : isEditMode ? '保存修改' : '创建卡片' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useAdminCardsPage } from './hooks/useAdminCardsPage'

const {
  activeCategoryId,
  activeStatus,
  cardList,
  categories,
  categoriesLoading,
  categoryFilterOptions,
  clearKeyword,
  closeForm,
  deleteCard,
  formModel,
  formCategoryIndex,
  formSaving,
  formTitle,
  formVisible,
  imageUploading,
  formatCardDate,
  formatTags,
  getCategoryName,
  goBack,
  hasFilters,
  hasMore,
  handleFormBooleanChange,
  handleFormCategoryChange,
  handleFormNumberInput,
  handleFormTextInput,
  handleStatusChange,
  isEditMode,
  keyword,
  loading,
  onSearch,
  openCreateForm,
  openEditForm,
  resetFilters,
  resultHint,
  resultSummary,
  saveCardForm,
  statusBarHeight,
  statusTabs,
  switchCategory,
  switchStatus,
  uploadFormImage,
} = useAdminCardsPage()
</script>

<style src="./styles/cards.scss" scoped lang="scss"></style>
