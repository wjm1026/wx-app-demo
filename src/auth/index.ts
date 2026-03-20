export const AUTH_STORAGE_KEYS = {
  token: 'custom_auth_token',
  tokenExpired: 'custom_auth_token_expired',
  userInfo: 'userInfo',
} as const

export const LEGACY_AUTH_STORAGE_KEYS = {
  token: 'uni_id_token',
  tokenExpired: 'uni_id_token_expired',
} as const

/** 规范化存储字符串 */
function normalizeStoredString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** 读取存储认证令牌 */
export function readStoredAuthToken() {
  return normalizeStoredString(uni.getStorageSync(AUTH_STORAGE_KEYS.token))
}

/** 读取存储认证令牌过期时间 */
export function readStoredAuthTokenExpired() {
  const value = uni.getStorageSync(AUTH_STORAGE_KEYS.tokenExpired)
  const expiredAt = typeof value === 'string' ? Number(value) : Number(value || 0)
  return Number.isFinite(expiredAt) ? expiredAt : 0
}

/** 判断认证令牌过期时间是否满足条件 */
export function isAuthTokenExpired(expiredAt: number) {
  return expiredAt > 0 && expiredAt <= Date.now()
}

/** 清空旧版 uni-id 存储 */
export function clearLegacyUniIdStorage() {
  uni.removeStorageSync(LEGACY_AUTH_STORAGE_KEYS.token)
  uni.removeStorageSync(LEGACY_AUTH_STORAGE_KEYS.tokenExpired)
}
