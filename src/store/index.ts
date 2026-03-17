import { reactive } from 'vue'
import {
  AUTH_STORAGE_KEYS,
  clearLegacyUniIdStorage,
  isAuthTokenExpired,
  readStoredAuthToken,
  readStoredAuthTokenExpired,
} from '@/auth'
import type { UserInfo } from '@/api'

interface AppState {
  userInfo: UserInfo | null
  isLoggedIn: boolean
  token: string
  isAdmin: boolean
}

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

function syncLoginState() {
  state.isLoggedIn = !!state.token
}

export function setUserInfo(userInfo: UserInfo | null) {
  state.userInfo = userInfo
  state.isAdmin = userInfo?.role === 'admin'
  syncLoginState()

  if (userInfo) {
    uni.setStorageSync(AUTH_STORAGE_KEYS.userInfo, JSON.stringify(userInfo))
    return
  }

  uni.removeStorageSync(AUTH_STORAGE_KEYS.userInfo)
}

export function setToken(token: string, expired?: number) {
  state.token = token
  syncLoginState()

  if (token) {
    uni.setStorageSync(AUTH_STORAGE_KEYS.token, token)
    if (expired) {
      uni.setStorageSync(AUTH_STORAGE_KEYS.tokenExpired, expired)
    } else {
      uni.removeStorageSync(AUTH_STORAGE_KEYS.tokenExpired)
    }
    return
  }

  uni.removeStorageSync(AUTH_STORAGE_KEYS.token)
  uni.removeStorageSync(AUTH_STORAGE_KEYS.tokenExpired)
}

export function initStore() {
  clearLegacyUniIdStorage()

  const token = readStoredAuthToken()
  const tokenExpired = readStoredAuthTokenExpired()
  if (token && !isAuthTokenExpired(tokenExpired)) {
    state.token = token
  } else {
    uni.removeStorageSync(AUTH_STORAGE_KEYS.token)
    uni.removeStorageSync(AUTH_STORAGE_KEYS.tokenExpired)
    uni.removeStorageSync(AUTH_STORAGE_KEYS.userInfo)
  }

  const userInfo = parseStoredJson<UserInfo>(AUTH_STORAGE_KEYS.userInfo)
  if (token && !isAuthTokenExpired(tokenExpired) && userInfo) {
    state.userInfo = userInfo
    state.isAdmin = userInfo.role === 'admin'
  }

  syncLoginState()
}

export function logout() {
  state.userInfo = null
  state.token = ''
  state.isAdmin = false
  syncLoginState()

  uni.removeStorageSync(AUTH_STORAGE_KEYS.token)
  uni.removeStorageSync(AUTH_STORAGE_KEYS.tokenExpired)
  uni.removeStorageSync(AUTH_STORAGE_KEYS.userInfo)
  clearLegacyUniIdStorage()
}

export function updatePoints(points: number) {
  if (!state.userInfo) {
    return
  }

  state.userInfo.points = points
  uni.setStorageSync(AUTH_STORAGE_KEYS.userInfo, JSON.stringify(state.userInfo))
}

export function useStore() {
  return store
}

export const appStore = state
