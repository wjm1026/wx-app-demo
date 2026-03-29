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
    icon: '/static/icons/tabbar/home-line.svg',
    activeIcon: '/static/icons/tabbar/home-solid.svg'
  },
  {
    pagePath: '/pages/game/game',
    text: '游戏',
    icon: '/static/icons/tabbar/game-line.svg',
    activeIcon: '/static/icons/tabbar/game-solid.svg'
  },
  {
    pagePath: '/pages/user/user',
    text: '我的',
    icon: '/static/icons/tabbar/user-line.svg',
    activeIcon: '/static/icons/tabbar/user-solid.svg'
  }
]
