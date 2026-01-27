import { reactive, readonly } from 'vue'
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

export function setUserInfo(userInfo: UserInfo | null) {
  state.userInfo = userInfo
  state.isLoggedIn = !!userInfo
  state.isAdmin = !!(userInfo && (userInfo as any).role === 'admin')
  
  if (userInfo) {
    uni.setStorageSync('userInfo', JSON.stringify(userInfo))
  } else {
    uni.removeStorageSync('userInfo')
  }
}

export function setToken(token: string, expired?: number) {
  state.token = token
  if (token) {
    uni.setStorageSync('uni_id_token', token)
    if (expired) {
      uni.setStorageSync('uni_id_token_expired', expired)
    }
  } else {
    uni.removeStorageSync('uni_id_token')
    uni.removeStorageSync('uni_id_token_expired')
  }
}

export function initStore() {
  const token = uni.getStorageSync('uni_id_token')
  if (token) {
    state.token = token
    state.isLoggedIn = true
  }
  
  try {
    const userInfoStr = uni.getStorageSync('userInfo')
    if (userInfoStr) {
      const userInfo = JSON.parse(userInfoStr)
      state.userInfo = userInfo
      state.isAdmin = !!(userInfo && userInfo.role === 'admin')
    }
  } catch (e) {
    console.error('Failed to restore userInfo:', e)
  }
}

export function logout() {
  state.userInfo = null
  state.isLoggedIn = false
  state.token = ''
  state.isAdmin = false
  uni.removeStorageSync('uni_id_token')
  uni.removeStorageSync('uni_id_token_expired')
  uni.removeStorageSync('userInfo')
}

export function updatePoints(points: number) {
  if (state.userInfo) {
    state.userInfo.points = points
    uni.setStorageSync('userInfo', JSON.stringify(state.userInfo))
  }
}

export function useStore() {
  return {
    ...readonly(state),
    get userInfo() { return state.userInfo },
    get isLoggedIn() { return state.isLoggedIn },
    get token() { return state.token },
    get isAdmin() { return state.isAdmin },
    setUserInfo,
    setToken,
    logout,
    updatePoints
  }
}

export const appStore = state
