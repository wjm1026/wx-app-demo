import { TABBAR_ITEMS, type TabbarItem } from '@/config/tabbar'

interface UseCustomTabbarOptions {
  getCurrent: () => number
}

export function useCustomTabbar(options: UseCustomTabbarOptions) {
  function switchTab(item: TabbarItem, index: number) {
    if (options.getCurrent() === index) {
      return
    }

    uni.switchTab({
      url: item.pagePath,
    })
  }

  return {
    list: TABBAR_ITEMS,
    switchTab,
  }
}
