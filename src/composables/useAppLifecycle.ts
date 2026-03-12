import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { initStore } from '@/store'

export function useAppLifecycle() {
  onLaunch(() => {
    initStore()
  })

  onShow(() => {})
  onHide(() => {})
}
