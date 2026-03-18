import { ref } from 'vue'
import { getNavBarHeight, getStatusBarHeight } from '@/utils'

/** 封装页面布局逻辑 */
export function usePageLayout() {
  const statusBarHeight = ref(getStatusBarHeight())
  const navBarHeight = ref(getNavBarHeight())

  return {
    statusBarHeight,
    navBarHeight
  }
}
