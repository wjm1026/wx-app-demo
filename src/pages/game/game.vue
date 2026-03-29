<template>
  <view class="page game-page">
    <view class="game-placeholder"></view>
    <CustomTabbar :current="1" :reserve-space="false" />
  </view>
</template>

<script setup lang="ts">
import CustomTabbar from '@/components/CustomTabbar/CustomTabbar.vue'
</script>

<style src="./styles/game.scss" scoped lang="scss"></style>
