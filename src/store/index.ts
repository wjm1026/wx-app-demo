import { reactive } from 'vue'
import type { UserInfo } from '@/api'

interface AppState {
  userInfo: UserInfo | null
  isLoggedIn: boolean
  token: string
}

export const appStore = reactive<AppState>({
  userInfo: null,
  isLoggedIn: false,
  token: ''
})

export function setUserInfo(userInfo: UserInfo | null) {
  appStore.userInfo = userInfo
  appStore.isLoggedIn = !!userInfo
}

export function setToken(token: string) {
  appStore.token = token
  if (token) {
    uni.setStorageSync('token', token)
  } else {
    uni.removeStorageSync('token')
  }
}

export function initStore() {
  const token = uni.getStorageSync('token')
  if (token) {
    appStore.token = token
    appStore.isLoggedIn = true
  }
}

export function logout() {
  appStore.userInfo = null
  appStore.isLoggedIn = false
  appStore.token = ''
  uni.removeStorageSync('token')
}
