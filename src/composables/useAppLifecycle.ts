import { onLaunch, onShow } from '@dcloudio/uni-app'
import { appStore, initStore } from '@/store'
import { isInviteBindingWindowOpen, storeInviteCodeFromQuery } from '@/utils'

function syncInviteCodeFromQuery(query?: Record<string, unknown> | null) {
  // 已登录账号只有在“尚未绑定邀请人且仍处于补绑窗口”时，才继续接收入站邀请码。
  if (appStore.isLoggedIn && !isInviteBindingWindowOpen(appStore.userInfo)) {
    return
  }

  storeInviteCodeFromQuery(query)
}

export function useAppLifecycle() {
  onLaunch((options) => {
    initStore()
    // 好友从分享卡片首次打开小程序时，会先走这里把邀请码落到本地。
    syncInviteCodeFromQuery(options?.query)
  })

  onShow((options) => {
    // 已打开的小程序再次通过分享链接进入时，不会重新 launch，需要在 show 阶段补接一次参数。
    syncInviteCodeFromQuery(options?.query)
  })
}
