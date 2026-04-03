import type { ApiResponse, LoginByWeixinResult } from '@/api/types'
import { resolveRequestUrl } from '@/api/config'
import { appStore, logout, setToken, setUserInfo } from '@/store'
import {
  clearStoredInviteCode,
  getErrorMessage,
  getStoredInviteCode,
  isInviteBindingWindowOpen,
  showToast,
} from '@/utils'

type LoginSource = 'auto' | 'manual' | 'retry'

interface LoginOptions {
  force?: boolean
  showFailureToast?: boolean
  showLoadingToast?: boolean
  showSuccessToast?: boolean
  source?: LoginSource
}

const AUTO_LOGIN_THROTTLE_MS = 3000

let activeLoginTask: Promise<boolean> | null = null
let lastSilentLoginAt = 0

/** 构建登录成功文案 */
function buildLoginSuccessMessage(isNewUser?: boolean) {
  return isNewUser ? '欢迎新用户！获得100积分 🎉' : '登录成功 🎉'
}

/** 解析字符串 JSON */
function parseJsonString(text: string) {
  const normalized = text.trim()
  if (!normalized) {
    return null
  }

  try {
    return JSON.parse(normalized)
  } catch {
    return normalized
  }
}

/** 提取消息文案 */
function resolveMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const value = payload as Record<string, unknown>
  if (typeof value.msg === 'string' && value.msg) {
    return value.msg
  }

  if (typeof value.message === 'string' && value.message) {
    return value.message
  }

  if (typeof value.errMsg === 'string' && value.errMsg) {
    return value.errMsg
  }

  return fallback
}

/** 规范化接口返回 */
function normalizeApiResponse<T>(
  statusCode: number,
  payload: unknown,
): ApiResponse<T> {
  const data = typeof payload === 'string' ? parseJsonString(payload) : payload

  if (
    data &&
    typeof data === 'object' &&
    typeof (data as ApiResponse<T>).code === 'number'
  ) {
    const normalized = data as ApiResponse<T>
    if (typeof normalized.msg !== 'string') {
      normalized.msg = normalized.code === 0 ? 'success' : '请求失败'
    }
    return normalized
  }

  if (statusCode >= 200 && statusCode < 300) {
    return {
      code: 0,
      msg: 'success',
      data: data as T,
    }
  }

  return {
    code: statusCode || -1,
    msg: resolveMessage(payload, statusCode === 401 ? '请先登录' : '登录失败'),
    data: undefined,
  }
}

/** 判断当前环境是否支持微信登录 */
function canUseWechatLogin() {
  // #ifdef MP-WEIXIN
  return true
  // #endif

  // #ifndef MP-WEIXIN
  return false
  // #endif
}

/** 调用微信获取登录凭证 */
async function requestWechatCode() {
  // #ifdef MP-WEIXIN
  return new Promise<UniApp.LoginRes>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: resolve,
      fail: reject,
    })
  })
  // #endif

  // #ifndef MP-WEIXIN
  return Promise.resolve({ code: '' } as UniApp.LoginRes)
  // #endif
}

/** 请求后端登录接口 */
async function requestLoginByWeixin(code: string, inviteCode?: string) {
  const response = await new Promise<UniApp.RequestSuccessCallbackResult>(
    (resolve, reject) => {
      uni.request({
        url: resolveRequestUrl('/api/v1/auth/wechat/login'),
        method: 'POST',
        timeout: 15000,
        header: {
          'Content-Type': 'application/json',
        },
        data: {
          code,
          inviteCode,
        },
        success: resolve,
        fail: reject,
      })
    },
  )

  return normalizeApiResponse<LoginByWeixinResult>(
    response.statusCode || 0,
    response.data,
  )
}

/** 写入登录结果 */
function persistLoginResult(
  data: LoginByWeixinResult,
  options: Pick<LoginOptions, 'showFailureToast' | 'showSuccessToast'>,
) {
  if (!data.token) {
    logout()
    if (options.showFailureToast) {
      showToast('登录态创建失败，请稍后重试')
    }
    return false
  }

  setToken(data.token, data.tokenExpired)
  setUserInfo(data.userInfo)

  if (!isInviteBindingWindowOpen(data.userInfo)) {
    clearStoredInviteCode()
  }

  if (options.showSuccessToast) {
    showToast(buildLoginSuccessMessage(data.isNewUser), 'success')
  }

  return true
}

/** 执行微信登录 */
async function executeWechatLogin(options: LoginOptions) {
  if (!canUseWechatLogin()) {
    if (options.showFailureToast) {
      showToast('当前环境暂不支持微信登录')
    }
    return false
  }

  if (options.force) {
    logout()
  }

  if (options.showLoadingToast) {
    showToast('登录中...', 'loading', 10000)
  }

  try {
    const loginRes = await requestWechatCode()
    if (!loginRes.code) {
      if (options.showFailureToast) {
        showToast('获取登录凭证失败')
      }
      return false
    }

    const inviteCode = getStoredInviteCode() || undefined
    const response = await requestLoginByWeixin(loginRes.code, inviteCode)

    if (response.code === 0 && response.data) {
      return persistLoginResult(response.data, options)
    }

    if (options.showFailureToast) {
      showToast(response.msg || '登录失败')
    }
    return false
  } catch (error) {
    if (options.showFailureToast) {
      showToast(getErrorMessage(error, '登录失败，请重试'))
    }
    return false
  }
}

/** 判断当前是否应跳过静默登录 */
function shouldSkipSilentLogin(force?: boolean) {
  if (force || appStore.isLoggedIn) {
    return false
  }

  return Date.now() - lastSilentLoginAt < AUTO_LOGIN_THROTTLE_MS
}

/** 微信登录 */
export async function loginWithWeixin(options: LoginOptions = {}) {
  const mergedOptions: LoginOptions = {
    force: false,
    showFailureToast: false,
    showLoadingToast: false,
    showSuccessToast: false,
    source: 'manual',
    ...options,
  }

  if (!mergedOptions.force && appStore.isLoggedIn) {
    return true
  }

  // 如果已经有一轮静默/手动登录在进行，后续调用应该复用同一个 Promise，
  // 而不是因为节流直接返回 false，避免首页首个鉴权请求抢跑失败。
  if (activeLoginTask) {
    return activeLoginTask
  }

  if (mergedOptions.source !== 'manual' && shouldSkipSilentLogin(mergedOptions.force)) {
    return false
  }

  if (mergedOptions.source !== 'manual') {
    lastSilentLoginAt = Date.now()
  }

  if (!activeLoginTask) {
    activeLoginTask = executeWechatLogin(mergedOptions).finally(() => {
      activeLoginTask = null
    })
  }

  return activeLoginTask
}

/** 确保存在可用登录态 */
export function ensureAutoLogin(options: Omit<LoginOptions, 'source'> = {}) {
  return loginWithWeixin({
    source: 'auto',
    ...options,
  })
}
