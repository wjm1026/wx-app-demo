<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { initStore } from '@/store'

onLaunch(() => {
  initStore()
})

onShow(() => {
})

onHide(() => {
})
</script>

<style lang="scss">
/* 全局基础样式 */
page {
  font-family: $font-family-base;
  font-size: $font-size-base;
  color: $color-text-primary;
  background-color: $color-bg-primary;
  line-height: $line-height-normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 基础元素重置 */
view, text, image {
  box-sizing: border-box;
}

image {
  display: block;
  max-width: 100%;
}

button {
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  line-height: inherit;
  font-size: inherit;
  color: inherit;
  
  &::after {
    border: none;
  }
}

/* 滚动条美化 (H5) */
::-webkit-scrollbar {
  width: 0;
  height: 0;
  background: transparent;
}

/* 禁用长按菜单 */
view, text, image {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

/* 输入框允许选择 */
input, textarea {
  -webkit-user-select: auto;
  user-select: auto;
}

/* 安全区域适配 */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-top {
  padding-top: env(safe-area-inset-top);
}

/* 通用工具类 */
.flex {
  display: flex;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-column {
  display: flex;
  flex-direction: column;
}

.flex-1 {
  flex: 1;
}

.flex-wrap {
  flex-wrap: wrap;
}

/* 文字截断 */
.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-ellipsis-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 触摸反馈 */
.touchable {
  transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 150ms ease-out;
  
  &:active {
    transform: scale(0.97);
    opacity: 0.9;
  }
}

/* 动画减弱模式支持 - 小程序不支持 * 选择器，需在具体组件中处理 */
</style>
