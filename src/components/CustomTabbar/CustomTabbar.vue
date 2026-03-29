<template>
  <view class="tabbar-wrapper">
    <view v-if="reserveSpace" class="tabbar-placeholder"></view>

    <view class="tabbar-shell" :style="tabbarShellVars">
      <view class="tabbar-active-indicator"></view>

      <view
        class="tab-item"
        :class="{ 'is-active': currentIndex === index }"
        v-for="(item, index) in list"
        :key="item.pagePath"
        @click="handleSwitchTab(item, index)"
      >
        <view class="tab-item-inner">
          <view class="tab-icon-wrap">
            <image
              class="tab-icon"
              :src="currentIndex === index ? item.activeIcon : item.icon"
              mode="aspectFit"
            />
          </view>
          <text class="tab-text">{{ item.text }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TabbarItem } from "@/config/tabbar";
import { useCustomTabbar } from "./hooks/useCustomTabbar";

const props = withDefaults(
  defineProps<{
    current: number;
    reserveSpace?: boolean;
  }>(),
  {
    reserveSpace: true,
  },
);

const { list, switchTab } = useCustomTabbar({
  getCurrent: () => props.current,
});

const currentIndex = computed(() => props.current);

function handleSwitchTab(item: TabbarItem, index: number) {
  if (props.current === index) {
    return;
  }

  switchTab(item, index);
}

const tabbarShellVars = computed<Record<string, string>>(() => {
  return {
    "--tab-count": String(list.length || 1),
    "--active-index": String(currentIndex.value),
  };
});
</script>

<style src="./styles/CustomTabbar.scss" lang="scss" scoped></style>
