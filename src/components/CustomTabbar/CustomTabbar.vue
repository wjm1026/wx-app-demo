<template>
  <view class="tabbar-wrapper">
    <view class="tabbar-container">
      <!-- Tab Items -->
      <view 
        class="tab-item" 
        v-for="(item, index) in list" 
        :key="index"
        @click="switchTab(item, index)"
      >
        <view class="icon-wrapper" :class="{ 'is-active': current === index }">
          <!-- Home Icon -->
          <image 
            v-if="index === 0"
            class="tab-icon" 
            :src="current === index ? icons.homeActive : icons.home"
            mode="aspectFit"
          />
          <!-- Category Icon -->
          <image 
            v-if="index === 1"
            class="tab-icon" 
            :src="current === index ? icons.categoryActive : icons.category"
            mode="aspectFit"
          />
          <!-- User Icon -->
          <image 
            v-if="index === 2"
            class="tab-icon" 
            :src="current === index ? icons.userActive : icons.user"
            mode="aspectFit"
          />
        </view>
        <text class="tab-text" :class="{ 'is-active-text': current === index }">{{ item.text }}</text>
      </view>
    </view>
    <view class="safe-area-spacer"></view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{
  current: number;
}>();

// Base64 encoded SVG icons (mini program compatible)
const icons = {
  // Home icon - cute house with heart chimney
  home: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTI0IDZMNiAyMFY0MkgxOFYzMEMxOCAyOC44OTU0IDE4Ljg5NTQgMjggMjAgMjhIMjhDMjkuMTA0NiAyOCAzMCAyOC44OTU0IDMwIDMwVjQySDQyVjIwTDI0IDZaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==",
  homeActive: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTI0IDZMNiAyMFY0MkgxOFYzMEMxOCAyOC44OTU0IDE4Ljg5NTQgMjggMjAgMjhIMjhDMjkuMTA0NiAyOCAzMCAyOC44OTU0IDMwIDMwVjQySDQyVjIwTDI0IDZaIiBmaWxsPSIjRkY2QjZCIiBzdHJva2U9IiNGRjZCNkIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==",
  // Category icon - cute grid blocks with rounded corners
  category: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+PHJlY3QgeD0iNiIgeT0iNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz48cmVjdCB4PSIyNiIgeT0iNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz48cmVjdCB4PSI2IiB5PSIyNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz48cmVjdCB4PSIyNiIgeT0iMjYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgcng9IjQiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+PC9zdmc+",
  categoryActive: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+PHJlY3QgeD0iNiIgeT0iNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iI0ZGNkI2QiIgc3Ryb2tlPSIjRkY2QjZCIiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSIyNiIgeT0iNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iI0ZGNkI2QiIgc3Ryb2tlPSIjRkY2QjZCIiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSI2IiB5PSIyNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iI0ZGNkI2QiIgc3Ryb2tlPSIjRkY2QjZCIiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSIyNiIgeT0iMjYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgcng9IjQiIGZpbGw9IiNGRjZCNkIiIHN0cm9rZT0iI0ZGNkI2QiIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+",
  // User icon - cute smiley face
  user: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+PGNpcmNsZSBjeD0iMjQiIGN5PSIxNCIgcj0iOCIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMTAgNDJDMTAgMzQuMjY4IDE2LjI2OCAyOCAyNCAyOEMzMS43MzIgMjggMzggMzQuMjY4IDM4IDQyIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIi8+PC9zdmc+",
  userActive: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSI+PGNpcmNsZSBjeD0iMjQiIGN5PSIxNCIgcj0iOCIgZmlsbD0iI0ZGNkI2QiIgc3Ryb2tlPSIjRkY2QjZCIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTAgNDJDMTAgMzQuMjY4IDE2LjI2OCAyOCAyNCAyOEMzMS43MzIgMjggMzggMzQuMjY4IDM4IDQyIiBzdHJva2U9IiNGRjZCNkIiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIi8+PC9zdmc+"
};

const list = [
  { pagePath: '/pages/index/index', text: '首页' },
  { pagePath: '/pages/category/category', text: '分类' },
  { pagePath: '/pages/user/user', text: '我的' }
];

const switchTab = (item: { pagePath: string }, index: number) => {
  if (props.current === index) return;
  uni.switchTab({
    url: item.pagePath
  });
};
</script>

<style lang="scss" scoped>
.tabbar-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background: #FFFFFF;
}

.tabbar-container {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 100rpx;
  background: #FFFFFF;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
  border-radius: 32rpx 32rpx 0 0;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 10rpx 0;
}

.icon-wrapper {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  
  &.is-active {
    background: rgba(255, 107, 107, 0.12);
    transform: scale(1.15);
  }
}

.tab-icon {
  width: 48rpx;
  height: 48rpx;
}

.tab-text {
  font-size: 22rpx;
  color: #9CA3AF;
  margin-top: 6rpx;
  font-weight: 500;
  transition: all 0.3s;
  
  &.is-active-text {
    color: #FF6B6B;
    font-weight: 600;
  }
}

.safe-area-spacer {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
  background: #FFFFFF;
}
</style>
