import { computed } from 'vue'
import { useStore } from '@/store'
import { showToast } from '@/utils'

interface LoginGuardOptions {
  message?: string
  redirectUrl?: string
  delay?: number
}

/** 封装登录守卫逻辑 */
export function useLoginGuard(baseOptions: LoginGuardOptions = {}) {
  const store = useStore()
  const isLoggedIn = computed(() => store.isLoggedIn)

  /** 确保用户已登录 */
  function ensureLoggedIn(overrideOptions: LoginGuardOptions = {}) {
    if (isLoggedIn.value) {
      return true
    }

    const message = overrideOptions.message || baseOptions.message || '请先登录'
    const redirectUrl = overrideOptions.redirectUrl || baseOptions.redirectUrl || '/pages/user/user'
    const delay = overrideOptions.delay ?? baseOptions.delay ?? 1200

    showToast(message)
    setTimeout(() => {
      uni.switchTab({ url: redirectUrl })
    }, delay)

    return false
  }

  return {
    store,
    isLoggedIn,
    ensureLoggedIn
  }
}
