<template>
  <view class="page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-content">
        <view class="nav-back" @click="goBack">
          <image class="nav-back-icon" src="/static/icons/line/chevron-right.svg" mode="aspectFit" />
        </view>
        <text class="nav-title">分类管理</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <view class="hero-card">
      <text class="hero-kicker">CATEGORY OPS</text>
      <text class="hero-title">统一维护分类结构和展示素材</text>
      <text class="hero-desc">支持新增、编辑、删除，并可直接上传图标与封面图片。</text>
      <view class="hero-action" @click="openCreateForm">新增分类</view>
    </view>

    <view class="filter-card">
      <view class="search-shell">
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          confirm-type="search"
          placeholder="输入分类名称"
        />
        <view v-if="hasKeyword" class="search-clear" @click="clearKeyword">清空</view>
      </view>

      <view class="filter-summary">
        <text class="filter-summary-primary">{{ resultSummary }}</text>
        <text class="filter-summary-secondary">{{ resultHint }}</text>
      </view>
    </view>

    <view v-if="loading" class="state-card loading-card">
      <view class="loading-spinner"></view>
      <text class="state-title">正在加载分类</text>
      <text class="state-desc">分类数据正在同步，请稍候。</text>
    </view>

    <template v-else-if="filteredCategories.length > 0">
      <view class="list-section">
        <view class="list-header">
          <view class="list-copy">
            <text class="list-title">分类列表</text>
            <text class="list-subtitle">{{ dragHint }}</text>
          </view>
          <view class="list-create-btn" @click="openCreateForm">新增</view>
        </view>

        <view class="category-list">
          <view
            v-for="category in filteredCategories"
            :key="category._id"
            class="category-card"
            :class="{ dragging: draggingCategoryId === category._id }"
          >
            <view class="category-main">
              <view class="category-icon-shell" :style="{ background: category.gradient || '#eef2ff' }">
                <image
                  v-if="isImageUrl(category.icon)"
                  class="category-icon-image"
                  :src="category.icon"
                  mode="aspectFill"
                />
                <text v-else class="category-icon-emoji">{{ category.icon || '🧩' }}</text>
              </view>

              <view class="category-copy">
                <view class="category-head-row">
                  <text class="category-name">{{ category.name || '未命名分类' }}</text>
                  <view class="category-badges">
                    <text class="badge sort">排序 {{ category.sort || 0 }}</text>
                    <text class="badge count">{{ category.card_count || 0 }} 张</text>
                    <text class="badge" :class="category.status === 0 ? 'status-off' : 'status-on'">
                      {{ category.status === 0 ? '禁用' : '启用' }}
                    </text>
                  </view>
                </view>
                <text class="category-desc">{{ category.description || '暂无分类描述' }}</text>
              </view>
            </view>

            <view class="category-actions">
              <view
                class="action-btn sort"
                :class="{ active: draggingCategoryId === category._id, disabled: !canDragSort }"
                @touchstart.stop="startDragSort(category._id, $event)"
                @touchmove.stop.prevent="handleDragSortMove($event)"
                @touchend.stop="endDragSort"
                @touchcancel.stop="endDragSort"
              >
                {{ draggingCategoryId === category._id ? '拖动中...' : '拖拽排序' }}
              </view>
              <view class="action-btn edit" @click="openEditForm(category)">编辑</view>
              <view class="action-btn delete" @click="deleteCategory(category)">删除</view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <view v-else class="state-card empty-card">
      <view class="empty-icon-shell">
        <image class="empty-icon" src="/static/icons/line/grid.svg" mode="aspectFit" />
      </view>
      <text class="state-title">暂无分类数据</text>
      <text class="state-desc">先新增一个分类，后续再补充图标和封面素材。</text>
      <view class="empty-action" @click="openCreateForm">新增分类</view>
    </view>

    <view v-if="formVisible" class="editor-mask" @touchmove.stop.prevent="">
      <view class="editor-sheet">
        <view class="editor-head">
          <view class="editor-copy">
            <text class="editor-title">{{ formTitle }}</text>
            <text class="editor-subtitle">至少填写分类名称，其他字段可按需维护。</text>
          </view>
          <view class="editor-close" @click="closeForm">关闭</view>
        </view>

        <scroll-view class="editor-scroll" scroll-y>
          <view class="editor-grid">
            <view class="form-item span-2">
              <text class="form-label">分类名称 *</text>
              <input
                class="form-input"
                :value="formModel.name"
                placeholder="例如：动物"
                @input="handleTextInput('name', $event)"
              />
            </view>

            <view class="form-item span-2">
              <text class="form-label">图标（emoji 或图片 URL）</text>
              <view class="form-upload-row">
                <view class="form-upload-btn" :class="{ disabled: imageUploading }" @click="uploadFieldImage('icon')">
                  {{ imageUploading ? '上传中...' : '上传图标' }}
                </view>
              </view>
              <input
                class="form-input"
                :value="formModel.icon"
                placeholder="可直接填 emoji，如 🦁，或填 URL"
                @input="handleTextInput('icon', $event)"
              />
              <view v-if="formModel.icon" class="image-preview-shell">
                <image
                  v-if="isImageUrl(formModel.icon)"
                  class="image-preview"
                  :src="formModel.icon"
                  mode="aspectFill"
                />
                <text v-else class="emoji-preview">{{ formModel.icon }}</text>
              </view>
            </view>

            <view class="form-item span-2">
              <text class="form-label">封面图 URL</text>
              <view class="form-upload-row">
                <view class="form-upload-btn" :class="{ disabled: imageUploading }" @click="uploadFieldImage('cover')">
                  {{ imageUploading ? '上传中...' : '上传封面' }}
                </view>
              </view>
              <input
                class="form-input"
                :value="formModel.cover"
                placeholder="https://..."
                @input="handleTextInput('cover', $event)"
              />
              <view v-if="formModel.cover" class="image-preview-shell">
                <image class="image-preview" :src="formModel.cover" mode="aspectFill" />
              </view>
            </view>

            <view class="form-item">
              <text class="form-label">颜色</text>
              <input
                class="form-input"
                :value="formModel.color"
                placeholder="#FF9F7F"
                @input="handleTextInput('color', $event)"
              />
            </view>

            <view class="form-item">
              <text class="form-label">排序</text>
              <view class="form-static-value">在分类列表中拖拽调整</view>
            </view>

            <view class="form-item span-2">
              <text class="form-label">渐变背景</text>
              <input
                class="form-input"
                :value="formModel.gradient"
                placeholder="linear-gradient(135deg, #FFD8C8, #FFB38A)"
                @input="handleTextInput('gradient', $event)"
              />
            </view>

            <view class="form-item span-2">
              <text class="form-label">描述</text>
              <textarea
                class="form-textarea"
                auto-height
                maxlength="180"
                :value="formModel.description"
                placeholder="填写分类介绍文案"
                @input="handleTextInput('description', $event)"
              />
            </view>

            <view class="form-item switch-item span-2">
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
          <view class="editor-btn solid" @click="saveCategory">
            {{ saving ? '保存中...' : isEditMode ? '保存修改' : '创建分类' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useAdminCategoriesPage } from './hooks/useAdminCategoriesPage'

const {
  canDragSort,
  clearKeyword,
  closeForm,
  dragHint,
  deleteCategory,
  draggingCategoryId,
  endDragSort,
  filteredCategories,
  formModel,
  formTitle,
  formVisible,
  goBack,
  handleDragSortMove,
  handleStatusChange,
  handleTextInput,
  hasKeyword,
  imageUploading,
  isEditMode,
  isImageUrl,
  keyword,
  loading,
  openCreateForm,
  openEditForm,
  resultHint,
  resultSummary,
  saveCategory,
  saving,
  startDragSort,
  statusBarHeight,
  uploadFieldImage,
} = useAdminCategoriesPage()
</script>

<style src="./styles/categories.scss" scoped lang="scss"></style>
