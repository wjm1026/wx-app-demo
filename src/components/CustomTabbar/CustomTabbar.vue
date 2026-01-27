<template>
  <view class="tabbar-wrapper">
    <!-- 占位符，防止内容被遮挡 -->
    <view class="tabbar-placeholder"></view>
    
    <view class="tabbar-pill">
      <!-- Tab Items -->
      <view 
        class="tab-item" 
        v-for="(item, index) in list" 
        :key="index"
        @click="switchTab(item, index)"
      >
        <view class="icon-container" :class="{ 'is-active': current === index }">
          <image 
            class="tab-icon" 
            :src="getIcon(index, current === index)"
            mode="aspectFit"
          />
        </view>
        <text class="tab-text" :class="{ 'is-active-text': current === index }">{{ item.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{
  current: number;
}>();

// 3D Color Icons (High Quality Base64)
// Home: House with red roof
// Category: 4 Colorful blocks
// User: Cute face
const icons = {
  home: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTM5LjYgMjQuNFY0MS4yQzM5LjYgNDIuNzQ2NCAzOC4zNDY0IDQ0IDM2LjggNDRIMTEuMkM5LjY1MzYgNDQgOC40IDQyLjc0NjQgOC40IDQxLjJWMjQuNEM4LjQgMjMuODU1OCA4LjYyMDc4IDIzLjMyNzEgOS4wMTMxNyAyMi45MzQ4TDIyLjYxMzIgOS4zMzQ3OEMyMy4zNzkyIDguNTY4NzcgMjQuNjIwOCA4LjU2ODc3IDI1LjM4NjggOS4zMzQ3OEwzOC45ODY4IDIyLjkzNDhDMzkuMzc5MiAyMy4zMjcxIDM5LjYgMjMuODU1OCAzOS42IDI0LjRaIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiMzMzMzMzMiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGQ9Ik0yNCA4TDggMjRINDEuMkMzOS42IDQyLjc0NjQgMzguMzQ2NCA0NCAzNi44IDQ0SDExLjJDOS42NTM2IDQ0IDguNCA0Mi43NDY0IDguNCA0MS4yVjI0IiBmaWxsPSIjRkZDQTRBIi8+PHBhdGggZD0iTTM5LjYgMjQuNFY0MS4yQzM5LjYgNDIuNzQ2NCAzOC4zNDY0IDQ0IDM2LjggNDRIMTEuMkM5LjY1MzYgNDQgOC40IDQyLjc0NjQgOC40IDQxLjJWMjQuNEM4LjQgMjMuODU1OCA4LjYyMDc4IDIzLjMyNzEgOS4wMTMxNyAyMi45MzQ4TDIyLjYxMzIgOS4zMzQ3OEMyMy4zNzkyIDguNTY4NzcgMjQuNjIwOCA4LjU2ODc3IDI1LjM4NjggOS4zMzQ3OEwzOC45ODY4IDIyLjkzNDhDMzkuMzc5MiAyMy4zMjcxIDM5LjYgMjMuODU1OCAzOS42IDI0LjRaIiBzdHJva2U9IiMzMzMzMzMiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGQ9Ik0xNyAzM0gzMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzMzMzIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==",
  homeActive: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTM5LjYgMjQuNFY0MS4yQzM5LjYgNDIuNzQ2NCAzOC4zNDY0IDQ0IDM2LjggNDRIMTEuMkM5LjY1MzYgNDQgOC40IDQyLjc0NjQgOC40IDQxLjJWMjQuNEM4LjQgMjMuODU1OCA4LjYyMDc4IDIzLjMyNzEgOS4wMTMxNyAyMi45MzQ4TDIyLjYxMzIgOS4zMzQ3OEMyMy4zNzkyIDguNTY4NzcgMjQuNjIwOCA4LjU2ODc3IDI1LjM4NjggOS4zMzQ3OEwzOC45ODY4IDIyLjkzNDhDMzkuMzc5MiAyMy4zMjcxIDM5LjYgMjMuODU1OCAzOS42IDI0LjRaIiBmaWxsPSIjRkY2QjZCIiBzdHJva2U9IiMzMzMzMzMiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGQ9Ik0yNCA4TDggMjRINDEuMkMzOS42IDQyLjc0NjQgMzguMzQ2NCA0NCAzNi44IDQ0SDExLjJDOS42NTM2IDQ0IDguNCA0Mi43NDY0IDguNCA0MS4yVjI0IiBmaWxsPSIjRkY4RThFIi8+PHBhdGggZD0iTTM5LjYgMjQuNFY0MS4yQzM5LjYgNDIuNzQ2NCAzOC4zNDY0IDQ0IDM2LjggNDRIMTEuMkM5LjY1MzYgNDQgOC40IDQyLjc0NjQgOC40IDQxLjJWMjQuNEM4LjQgMjMuODU1OCA4LjYyMDc4IDIzLjMyNzEgOS4wMTMxNyAyMi45MzQ4TDIyLjYxMzIgOS4zMzQ3OEMyMy4zNzkyIDguNTY4NzcgMjQuNjIwOCA4LjU2ODc3IDI1LjM4NjggOS4zMzQ3OEwzOC45ODY4IDIyLjkzNDhDMzkuMzc5MiAyMy4zMjcxIDM5LjYgMjMuODU1OCAzOS42IDI0LjRaIiBzdHJva2U9IiMzMzMzMzMiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGQ9Ik0xNyAzM0gzMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==",
  
  category: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+PHJlY3QgeD0iNiIgeT0iNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iI0ZGQjM0NyIgc3Ryb2tlPSIjMzMzMzMzIiBzdHJva2Utd2lkdGg9IjQiLz48cmVjdCB4PSIyNiIgeT0iNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iIzc0QjlGRiIgc3Ryb2tlPSIjMzMzMzMzIiBzdHJva2Utd2lkdGg9IjQiLz48cmVjdCB4PSI2IiB5PSIyNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iIzFFRDc2RCIgc3Ryb2tlPSIjMzMzMzMzIiBzdHJva2Utd2lkdGg9IjQiLz48cmVjdCB4PSIyNiIgeT0iMjYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgcng9IjQiIGZpbGw9IiNGRjZCNkIiIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSI0Ii8+PC9zdmc+",
  categoryActive: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+PHJlY3QgeD0iNiIgeT0iNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iI0ZGQjM0NyIgc3Ryb2tlPSIjMzMzMzMzIiBzdHJva2Utd2lkdGg9IjQiLz48cmVjdCB4PSIyNiIgeT0iNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iIzc0QjlGRiIgc3Ryb2tlPSIjMzMzMzMzIiBzdHJva2Utd2lkdGg9IjQiLz48cmVjdCB4PSI2IiB5PSIyNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iIzFFRDc2RCIgc3Ryb2tlPSIjMzMzMzMzIiBzdHJva2Utd2lkdGg9IjQiLz48cmVjdCB4PSIyNiIgeT0iMjYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgcng9IjQiIGZpbGw9IiNGRjZCNkIiIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHBhdGggZD0iTTM0IDM0TDM4IDM4IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+",
  
  user: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+PGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMTgiIGZpbGw9IiNGRkU2NkQiIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHBhdGggZD0iTTE2IDI3QzE2IDI3IDE5IDMxIDI0IDMxQzI5IDMxIDMyIDI3IDMyIDI3IiBzdHJva2U9IiMzMzMzMzMiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PGNpcmNsZSBjeD0iMTciIGN5PSIyMCIgcj0iMiIgZmlsbD0iIzMzMzMzMyIvPjxjaXJjbGUgY3g9IjMxIiBjeT0iMjAiIHI9IjIiIGZpbGw9IiMzMzMzMzMiLz48L3N2Zz4=",
  userActive: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+PGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMTgiIGZpbGw9IiNGRjZCNkIiIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHBhdGggZD0iTTE2IDI3QzE2IDI3IDE5IDMxIDI0IDMxQzI5IDMxIDMyIDI3IDMyIDI3IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PGNpcmNsZSBjeD0iMTciIGN5PSIyMCIgcj0iMiIgZmlsbD0iIzMzMzMzMyIvPjxjaXJjbGUgY3g9IjMxIiBjeT0iMjAiIHI9IjIiIGZpbGw9IiMzMzMzMzMiLz48L3N2Zz4="
};

const list = [
  { pagePath: '/pages/index/index', text: '首页' },
  { pagePath: '/pages/category/category', text: '分类' },
  { pagePath: '/pages/user/user', text: '我的' }
];

const getIcon = (index: number, active: boolean) => {
  if (index === 0) return active ? icons.homeActive : icons.home;
  if (index === 1) return active ? icons.categoryActive : icons.category;
  return active ? icons.userActive : icons.user;
};

const switchTab = (item: { pagePath: string }, index: number) => {
  if (props.current === index) return;
  uni.switchTab({
    url: item.pagePath
  });
};
</script>

<style lang="scss" scoped>
.tabbar-wrapper {
  position: relative;
  z-index: 999;
}

// 占位符：确保页面底部内容不被 TabBar 遮挡
.tabbar-placeholder {
  height: calc(128rpx + env(safe-area-inset-bottom) + 20rpx);
  width: 100%;
}

.tabbar-pill {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  margin: 0 32rpx;
  margin-bottom: calc(env(safe-area-inset-bottom) + 10rpx); /* 使用 margin-bottom 悬浮 */
  height: 128rpx;
  background: rgba(255, 255, 255, 0.95); /* 增加不透明度 */
  backdrop-filter: blur(20px);
  border-radius: 64rpx;
  display: flex;
  align-items: center;
  justify-content: space-around;
  
  // Claymorphism Style
  box-shadow: 
    0 20rpx 40rpx rgba(0, 0, 0, 0.1),
    inset 0 4rpx 4rpx rgba(255, 255, 255, 1),
    inset 0 -4rpx 4rpx rgba(0, 0, 0, 0.05);
    
  border: 4rpx solid rgba(255, 255, 255, 0.9); /* 加粗边框 */
  
  /* 修复抖动：强制 GPU 加速 */
  transform: translateZ(0);
}

.tab-item {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.icon-container {
  width: 88rpx;
  height: 88rpx;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  margin-bottom: 4rpx;
  
  &.is-active {
    background: #FFF0F0;
    transform: translateY(-8rpx);
    box-shadow: 
      0 12rpx 24rpx rgba(255, 107, 107, 0.25),
      inset 0 2rpx 4rpx rgba(255, 255, 255, 1);
  }
}

.tab-icon {
  width: 56rpx;  /* 加大图标尺寸 */
  height: 56rpx;
  transition: all 0.3s ease;
}

.tab-text {
  font-size: 22rpx;
  color: #9493B8;
  font-weight: 600;
  opacity: 0.8;
  transition: all 0.3s;
  position: absolute;
  bottom: 14rpx;
  
  &.is-active-text {
    color: #FF6B6B;
    opacity: 1;
    font-weight: 700;
    transform: scale(1.05);
  }
}
</style>
