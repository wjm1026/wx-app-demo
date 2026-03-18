export type ToastIcon = 'success' | 'error' | 'none' | 'loading'
export type DateValue = string | number | Date | null | undefined
export type ApiLikeResponse<T = unknown> = {
  code: number
  msg?: string
  data?: T
}

export const DEFAULT_AVATAR =
  'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
// 分享落地后的邀请码会先缓存在本地，等用户首次登录时再一并带给后端。
export const INVITE_CODE_STORAGE_KEY = 'INVITE_CODE'
// 登录后补填邀请码只开放给注册后短时间内、且尚未绑定邀请人的新用户。
export const INVITE_BIND_WINDOW_MS = 24 * 60 * 60 * 1000

/** 显示提示 */
export function showToast(title: string, icon: ToastIcon = 'none', duration = 2000) {
  const mappedIcon: UniApp.ShowToastOptions['icon'] = icon === 'error' ? 'none' : icon
  uni.showToast({
    title,
    icon: mappedIcon,
    duration
  })
}

/** 显示加载 */
export function showLoading(title = '加载中...') {
  uni.showLoading({ title, mask: true })
}

/** 隐藏加载 */
export function hideLoading() {
  uni.hideLoading()
}

/** 执行页面跳转 */
export function navigateTo(url: string) {
  uni.navigateTo({ url })
}

/** 切换标签 */
export function switchTab(url: string) {
  uni.switchTab({ url })
}

/** 导航返回 */
export function navigateBack(delta = 1) {
  uni.navigateBack({ delta })
}

// 邀请码可能来自剪贴板、分享 query 或服务端字段，统一清洗后再参与比较和存储。
export function normalizeInviteCode(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toUpperCase()
}

/** 构建邀请分享路径 */
export function buildInviteSharePath(inviteCode?: string) {
  const normalized = normalizeInviteCode(inviteCode)

  if (!normalized) {
    return '/pages/user/invite'
  }

  return `/pages/user/invite?inviteCode=${encodeURIComponent(normalized)}`
}

/** 获取存储邀请码 */
export function getStoredInviteCode() {
  return normalizeInviteCode(uni.getStorageSync(INVITE_CODE_STORAGE_KEY))
}

/** 处理状态仓库邀请码相关逻辑 */
export function storeInviteCode(inviteCode: unknown) {
  const normalized = normalizeInviteCode(inviteCode)

  if (!normalized) {
    return ''
  }

  uni.setStorageSync(INVITE_CODE_STORAGE_KEY, normalized)
  return normalized
}

/** 判断邀请绑定窗口开启状态是否满足条件 */
export function isInviteBindingWindowOpen(
  user?: { create_time?: number | null; inviter_id?: string | null } | null,
) {
  if (!user || user.inviter_id) {
    return false
  }

  const createTime = Number(user.create_time || 0)
  if (!createTime) {
    return false
  }

  return Date.now() - createTime <= INVITE_BIND_WINDOW_MS
}

/** 清空存储邀请码 */
export function clearStoredInviteCode() {
  uni.removeStorageSync(INVITE_CODE_STORAGE_KEY)
}

// 冷启动和热启动拿到的 query 结构一致，这里统一兜底两个常见字段名。
export function storeInviteCodeFromQuery(
  query?: Record<string, unknown> | null,
) {
  if (!query) {
    return ''
  }

  return storeInviteCode(query.inviteCode || query.invite_code)
}

/** 获取错误信息 */
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

// 很多云对象接口会返回 { code, msg }，这里统一把“业务失败”转成 throw，
// 让共享的 loading / toast 流程可以按真正的成功或失败分支运行。
export function assertApiSuccess<T extends ApiLikeResponse>(
  response: T,
  fallback = '请求失败',
) {
  if (response.code !== 0) {
    throw new Error(response.msg || fallback)
  }

  return response
}

/** 格式化数值 */
export function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return String(num)
}

/** 获取系统信息 */
export function getSystemInfo() {
  return uni.getSystemInfoSync()
}

/** 获取安全区底部 */
export function getSafeAreaBottom(): number {
  const systemInfo = getSystemInfo() as UniApp.GetSystemInfoResult & {
    safeAreaInsets?: {
      bottom?: number
    }
  }

  return systemInfo.safeAreaInsets?.bottom || 0
}

/** 获取状态栏高度 */
export function getStatusBarHeight(): number {
  const systemInfo = getSystemInfo()
  return systemInfo.statusBarHeight || 20
}

/** 获取导航栏高度 */
export function getNavBarHeight(): number {
  const statusBarHeight = getStatusBarHeight()
  const menuButtonInfo = uni.getMenuButtonBoundingClientRect?.() || {
    height: 32,
    top: statusBarHeight + 4
  }

  return statusBarHeight + menuButtonInfo.height + (menuButtonInfo.top - statusBarHeight) * 2
}

/** 解析节点矩形信息 */
export function resolveNodeRect(
  rect: UniApp.NodeInfo | UniApp.NodeInfo[] | null | undefined,
): UniApp.NodeInfo | null {
  if (!rect) {
    return null
  }

  return Array.isArray(rect) ? rect[0] || null : rect
}

/** 解析日期值 */
function parseDateValue(value: DateValue): Date | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const normalized =
    typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : value
  const date = new Date(normalized)

  return Number.isNaN(date.getTime()) ? null : date
}

/** 补零日期部分值 */
function padDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

/** 格式化日期 */
export function formatDate(
  value: DateValue,
  mode: 'ymd' | 'ymdHm' | 'mdHm' = 'ymdHm',
): string {
  const date = parseDateValue(value)

  if (!date) {
    return ''
  }

  const year = date.getFullYear()
  const month = padDatePart(date.getMonth() + 1)
  const day = padDatePart(date.getDate())
  const hour = padDatePart(date.getHours())
  const minute = padDatePart(date.getMinutes())

  if (mode === 'ymd') {
    return `${year}-${month}-${day}`
  }

  if (mode === 'mdHm') {
    return `${month}-${day} ${hour}:${minute}`
  }

  return `${year}-${month}-${day} ${hour}:${minute}`
}

/** 格式化相对日期 */
export function formatRelativeDate(value: DateValue): string {
  const date = parseDateValue(value)

  if (!date) {
    return ''
  }

  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const oneDay = 24 * 60 * 60 * 1000

  if (diff < oneDay) {
    return '今天'
  }

  if (diff < oneDay * 2) {
    return '昨天'
  }

  if (diff < oneDay * 7) {
    return `${Math.floor(diff / oneDay)}天前`
  }

  return formatDate(date, 'ymd')
}

let innerAudioContext: UniApp.InnerAudioContext | null = null

/** 播放音频 */
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

/** 停止音频 */
export function stopAudio() {
  if (!innerAudioContext) {
    return
  }

  innerAudioContext.stop()
  innerAudioContext.destroy()
  innerAudioContext = null
}
