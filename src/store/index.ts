import { reactive } from 'vue'
import type { UserInfo } from '@/api'

interface AppState {
  userInfo: UserInfo | null
  isLoggedIn: boolean
  token: string
  isAdmin: boolean
}

const STORAGE_KEYS = {
  token: 'uni_id_token',
  tokenExpired: 'uni_id_token_expired',
  userInfo: 'userInfo'
} as const

const state = reactive<AppState>({
  userInfo: null,
  isLoggedIn: false,
  token: '',
  isAdmin: false
})

const store = {
  get userInfo() {
    return state.userInfo
  },
  get isLoggedIn() {
    return state.isLoggedIn
  },
  get token() {
    return state.token
  },
  get isAdmin() {
    return state.isAdmin
  },
  setUserInfo,
  setToken,
  logout,
  updatePoints
}

function parseStoredJson<T>(key: string): T | null {
  const raw = uni.getStorageSync(key)
  if (!raw) {
    return null
  }

  if (typeof raw !== 'string') {
    return raw as T
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    uni.removeStorageSync(key)
    return null
  }
}

export function setUserInfo(userInfo: UserInfo | null) {
  state.userInfo = userInfo
  state.isLoggedIn = !!userInfo || !!state.token
  state.isAdmin = userInfo?.role === 'admin'

  if (userInfo) {
    uni.setStorageSync(STORAGE_KEYS.userInfo, JSON.stringify(userInfo))
    return
  }

  uni.removeStorageSync(STORAGE_KEYS.userInfo)
}

export function setToken(token: string, expired?: number) {
  state.token = token
  state.isLoggedIn = !!token || !!state.userInfo

  if (token) {
    uni.setStorageSync(STORAGE_KEYS.token, token)
    if (expired) {
      uni.setStorageSync(STORAGE_KEYS.tokenExpired, expired)
    }
    return
  }

  uni.removeStorageSync(STORAGE_KEYS.token)
  uni.removeStorageSync(STORAGE_KEYS.tokenExpired)
}

export function initStore() {
  const token = uni.getStorageSync(STORAGE_KEYS.token)
  if (typeof token === 'string' && token) {
    state.token = token
    state.isLoggedIn = true
  }

  const userInfo = parseStoredJson<UserInfo>(STORAGE_KEYS.userInfo)
  if (userInfo) {
    state.userInfo = userInfo
    state.isLoggedIn = true
    state.isAdmin = userInfo.role === 'admin'
  }
}

export function logout() {
  state.userInfo = null
  state.isLoggedIn = false
  state.token = ''
  state.isAdmin = false

  uni.removeStorageSync(STORAGE_KEYS.token)
  uni.removeStorageSync(STORAGE_KEYS.tokenExpired)
  uni.removeStorageSync(STORAGE_KEYS.userInfo)
}

export function updatePoints(points: number) {
  if (!state.userInfo) {
    return
  }

  state.userInfo.points = points
  uni.setStorageSync(STORAGE_KEYS.userInfo, JSON.stringify(state.userInfo))
}

export function useStore() {
  return store
}

export const appStore = state
