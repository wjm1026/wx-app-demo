export interface TabbarItem {
  pagePath: string
  text: string
  icon: string
  activeIcon: string
}

export const TABBAR_ITEMS: TabbarItem[] = [
  {
    pagePath: '/pages/index/index',
    text: '首页',
    icon: '/static/tabbar/home.png',
    activeIcon: '/static/tabbar/home-active.png'
  },
  {
    pagePath: '/pages/category/category',
    text: '分类',
    icon: '/static/tabbar/category.png',
    activeIcon: '/static/tabbar/category-active.png'
  },
  {
    pagePath: '/pages/user/user',
    text: '我的',
    icon: '/static/tabbar/user.png',
    activeIcon: '/static/tabbar/user-active.png'
  }
]
