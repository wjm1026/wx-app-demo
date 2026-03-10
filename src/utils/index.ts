export type ToastIcon = 'success' | 'error' | 'none' | 'loading'

export function showToast(title: string, icon: ToastIcon = 'none', duration = 2000) {
  const mappedIcon: UniApp.ShowToastOptions['icon'] = icon === 'error' ? 'none' : icon
  uni.showToast({
    title,
    icon: mappedIcon,
    duration
  })
}

export function showLoading(title = '加载中...') {
  uni.showLoading({ title, mask: true })
}

export function hideLoading() {
  uni.hideLoading()
}

export function navigateTo(url: string) {
  uni.navigateTo({ url })
}

export function switchTab(url: string) {
  uni.switchTab({ url })
}

export function navigateBack(delta = 1) {
  uni.navigateBack({ delta })
}

export function getErrorMessage(error: unknown, fallback = '请求失败'): string {
  if (typeof error === 'string') {
    return error || fallback
  }

  if (!error || typeof error !== 'object') {
    return fallback
  }

  if ('message' in error && typeof error.message === 'string' && error.message) {
    return error.message
  }

  if ('errMsg' in error && typeof error.errMsg === 'string' && error.errMsg) {
    return error.errMsg
  }

  return fallback
}

export function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return String(num)
}

export function getSystemInfo() {
  return uni.getSystemInfoSync()
}

export function getStatusBarHeight(): number {
  const systemInfo = getSystemInfo()
  return systemInfo.statusBarHeight || 20
}

export function getNavBarHeight(): number {
  const statusBarHeight = getStatusBarHeight()
  const menuButtonInfo = uni.getMenuButtonBoundingClientRect?.() || {
    height: 32,
    top: statusBarHeight + 4
  }

  return statusBarHeight + menuButtonInfo.height + (menuButtonInfo.top - statusBarHeight) * 2
}

let innerAudioContext: UniApp.InnerAudioContext | null = null

export function playAudio(src: string) {
  if (innerAudioContext) {
    innerAudioContext.stop()
    innerAudioContext.destroy()
  }

  innerAudioContext = uni.createInnerAudioContext()
  innerAudioContext.src = src
  innerAudioContext.play()

  return innerAudioContext
}

export function stopAudio() {
  if (!innerAudioContext) {
    return
  }

  innerAudioContext.stop()
  innerAudioContext.destroy()
  innerAudioContext = null
}
