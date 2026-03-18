import { TABBAR_ITEMS, type TabbarItem } from '@/config/tabbar'

interface UseCustomTabbarOptions {
  getCurrent: () => number
}

/** 封装自定义标签栏逻辑 */
export function useCustomTabbar(options: UseCustomTabbarOptions) {
  /** 切换标签 */
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
