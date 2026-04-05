<template>
  <view class="card-image" :class="{ 'is-width-fix': isWidthFix }">
    <image
      v-if="resolvedSrc"
      class="card-image__native"
      :src="resolvedSrc"
      :mode="mode"
      @error="handleError"
    />
    <view v-else class="card-image__empty"></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

interface Props {
  src?: string;
  label?: string;
  category?: string;
  mode?: string;
}

const props = withDefaults(defineProps<Props>(), {
  src: "",
  label: "",
  category: "",
  mode: "aspectFill",
});

const hasFailed = ref(false);

const resolvedSrc = computed(() => (hasFailed.value ? "" : props.src));
const isWidthFix = computed(() => props.mode === "widthFix");

/** 处理错误 */
function handleError() {
  hasFailed.value = true;
}

watch(
  () => [props.src, props.label],
  () => {
    hasFailed.value = false;
  },
);
</script>

<style scoped lang="scss">
.card-image {
  width: 100%;
  height: 100%;
}

.card-image__native,
.card-image__empty {
  width: 100%;
  height: 100%;
}

.card-image__empty {
  background: #f3f4f6;
}

.card-image.is-width-fix {
  height: auto;
}

.card-image.is-width-fix .card-image__native {
  display: block;
  height: auto;
}

.card-image.is-width-fix .card-image__empty {
  min-height: 184rpx;
}
</style>
