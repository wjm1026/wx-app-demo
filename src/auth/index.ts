export const AUTH_PARAM_KEY = '__authToken'

export const AUTH_STORAGE_KEYS = {
  token: 'custom_auth_token',
  tokenExpired: 'custom_auth_token_expired',
  userInfo: 'userInfo',
} as const

export const LEGACY_AUTH_STORAGE_KEYS = {
  token: 'uni_id_token',
  tokenExpired: 'uni_id_token_expired',
} as const

function normalizeStoredString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function readStoredAuthToken() {
  return normalizeStoredString(uni.getStorageSync(AUTH_STORAGE_KEYS.token))
}

export function readStoredAuthTokenExpired() {
  const value = uni.getStorageSync(AUTH_STORAGE_KEYS.tokenExpired)
  const expiredAt = typeof value === 'string' ? Number(value) : Number(value || 0)
  return Number.isFinite(expiredAt) ? expiredAt : 0
}

export function isAuthTokenExpired(expiredAt: number) {
  return expiredAt > 0 && expiredAt <= Date.now()
}

export function clearLegacyUniIdStorage() {
  uni.removeStorageSync(LEGACY_AUTH_STORAGE_KEYS.token)
  uni.removeStorageSync(LEGACY_AUTH_STORAGE_KEYS.tokenExpired)
}

