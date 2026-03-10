import { ref } from 'vue'
import { getNavBarHeight, getStatusBarHeight } from '@/utils'

export function usePageLayout() {
  const statusBarHeight = ref(getStatusBarHeight())
  const navBarHeight = ref(getNavBarHeight())

  return {
    statusBarHeight,
    navBarHeight
  }
}
