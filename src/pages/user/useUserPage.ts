import { computed, onMounted, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { pointsApi, userApi, type LoginByWeixinResult } from '@/api'
import { useMeasuredHeight } from '@/composables/useMeasuredHeight'
import { usePageLayout } from '@/composables/usePageLayout'
import { useStore } from '@/store'
import {
  DEFAULT_AVATAR,
  getErrorMessage,
  navigateTo,
  showToast,
} from '@/utils'

function isRewardedAdCompleted(status: unknown) {
  if (!status || typeof status !== 'object') {
    return false
  }

  return Boolean((status as { isEnded?: boolean }).isEnded)
}

export function useUserPage() {
  const store = useStore()
  const { statusBarHeight } = usePageLayout()
  const { height: headerHeight, measureHeight: updateHeaderHeight } =
    useMeasuredHeight('.header')

  const hasSigned = ref(false)
  const isLoading = ref(false)

  const isLoggedIn = computed(() => store.isLoggedIn)
  const userInfo = computed(() => ({
    nickname: store.userInfo?.nickname || '点击登录',
    avatar: store.userInfo?.avatar || '',
    points: store.userInfo?.points || 0,
    freeViews: store.userInfo?.free_views || 0,
    inviteCount: store.userInfo?.invite_count || 0,
    inviteCode: store.userInfo?.invite_code || '',
    isVip: store.userInfo?.is_vip || false,
  }))
  const contentScrollStyle = computed(() => ({
    marginTop: `${headerHeight.value}px`,
    height: `calc(100vh - ${headerHeight.value}px)`,
  }))

  // 用户资料和签到状态都依赖登录态。只要接口返回 401，就说明本地 token 已失效，
  // 页面应该立刻回退到未登录状态，避免前后端口径不一致。
  function handleUnauthorized(code?: number, options: { resetSignIn?: boolean } = {}) {
    if (code !== 401) {
      return false
    }

    if (options.resetSignIn) {
      hasSigned.value = false
    }

    store.logout()
    return true
  }

  async function loadUserInfo() {
    try {
      const res = await userApi.getUserInfo()

      if (res.code === 0 && res.data) {
        store.setUserInfo(res.data)
        return
      }

      handleUnauthorized(res.code)
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  async function checkSignInStatus() {
    try {
      const res = await pointsApi.getSignInStatus()

      if (res.code === 0) {
        hasSigned.value = res.data?.hasSigned || false
        return
      }

      handleUnauthorized(res.code, { resetSignIn: true })
    } catch (error) {
      console.error('获取签到状态失败:', error)
    }
  }

  async function refreshAuthenticatedState() {
    await Promise.all([loadUserInfo(), checkSignInStatus()])
  }

  // 头部高度每次展示都要重新测量，但用户相关数据只在已登录时才有刷新意义。
  function refreshUserPanel() {
    updateHeaderHeight()

    if (!isLoggedIn.value) {
      hasSigned.value = false
      return
    }

    void refreshAuthenticatedState()
  }

  function triggerLoginIfNeeded() {
    if (isLoggedIn.value) {
      return false
    }

    void doLogin()
    return true
  }

  function chooseAvatar() {
    if (triggerLoginIfNeeded()) {
      return
    }

    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async () => {
        showToast('头像功能开发中')
      },
    })
  }

  // 只有拿到可用 token，前端才真正写入登录态。
  // 这样可以保证页面上的“已登录”与云端鉴权结果始终一致。
  function persistLoginResult(data: LoginByWeixinResult) {
    if (!data.token) {
      store.logout()
      uni.hideToast()
      showToast('登录态创建失败，请稍后重试')
      return false
    }

    store.setToken(data.token, data.tokenExpired)
    store.setUserInfo(data.userInfo)
    uni.removeStorageSync('INVITE_CODE')
    uni.hideToast()
    showToast(data.isNewUser ? '欢迎新用户！获得100积分 🎉' : '登录成功 🎉', 'success')
    void refreshAuthenticatedState()
    return true
  }

  async function doLogin() {
    if (isLoading.value) {
      return
    }

    isLoading.value = true

    try {
      const loginRes = await new Promise<UniApp.LoginRes>((resolve, reject) => {
        uni.login({
          provider: 'weixin',
          success: resolve,
          fail: reject,
        })
      })

      if (!loginRes.code) {
        showToast('获取登录凭证失败')
        return
      }

      showToast('登录中...', 'loading')
      const inviteCode = uni.getStorageSync('INVITE_CODE') || undefined
      const res = await userApi.loginByWeixin(loginRes.code, inviteCode)

      if (res.code === 0 && res.data) {
        persistLoginResult(res.data)
        return
      }

      showToast(res.msg || '登录失败')
    } catch (error) {
      showToast(getErrorMessage(error, '登录失败，请重试'))
    } finally {
      isLoading.value = false
    }
  }

  async function doSignIn() {
    if (triggerLoginIfNeeded()) {
      return
    }

    if (hasSigned.value) {
      showToast('今日已签到 ✅')
      return
    }

    try {
      showToast('签到中...', 'loading')
      const res = await pointsApi.signIn()
      uni.hideToast()

      if (res.code === 0) {
        hasSigned.value = true
        void loadUserInfo()
        showToast(`签到成功 +${res.data?.earnPoints || 5}积分 🎉`, 'success')
        return
      }

      showToast(res.msg || '签到失败')
    } catch (error) {
      uni.hideToast()
      showToast(getErrorMessage(error, '签到失败'))
    }
  }

  async function rewardPointsFromAd() {
    const res = await pointsApi.earnByAd('video')

    if (res.code === 0) {
      void loadUserInfo()
      showToast(`获得${res.data?.earnPoints || 10}积分 🎉`, 'success')
      return
    }

    showToast(res.msg || '获取积分失败')
  }

  // 广告回调不在正常请求链路里，单独兜底可以避免广告异常把整个页面流程带崩。
  async function rewardPointsFromAdSafely() {
    try {
      await rewardPointsFromAd()
    } catch (error) {
      console.error('积分发放失败:', error)
      showToast('获取积分失败')
    }
  }

  function handleRewardedAdClose(status: unknown) {
    if (isRewardedAdCompleted(status)) {
      void rewardPointsFromAdSafely()
      return
    }

    showToast('请看完广告才能获得奖励')
  }

  // 非微信环境没有真实激励广告，这里用一个延时模拟，保证本地调试和降级路径的
  // 交互节奏与真实场景接近。
  function showMockRewardedAd() {
    showToast('加载广告中...', 'loading')
    setTimeout(() => {
      uni.hideToast()
      void rewardPointsFromAdSafely()
    }, 2000)
  }

  async function watchAd() {
    if (triggerLoginIfNeeded()) {
      return
    }

    // #ifdef MP-WEIXIN
    try {
      const videoAd = uni.createRewardedVideoAd({
        adUnitId: 'adunit-xxxxxxxxx',
      })

      videoAd.onClose((status) => {
        handleRewardedAdClose(status)
      })

      videoAd.show().catch(() => videoAd.load().then(() => videoAd.show()))
    } catch (error) {
      console.warn('广告加载失败，开发模式直接发放积分', error)
      await rewardPointsFromAdSafely()
    }
    // #endif

    // #ifndef MP-WEIXIN
    showMockRewardedAd()
    // #endif
  }

  function runWithLogin(action: () => void) {
    if (!isLoggedIn.value) {
      showToast('请先登录')
      return
    }

    action()
  }

  // 用户中心多个入口都需要登录保护，统一走这里可以避免每个按钮重复写守卫逻辑。
  function navigateWithLogin(url: string) {
    runWithLogin(() => navigateTo(url))
  }

  function goFavorites() {
    navigateWithLogin('/pages/user/favorites')
  }

  function goAchievements() {
    navigateWithLogin('/pages/user/achievements')
  }

  function goInvite() {
    navigateWithLogin('/pages/user/invite')
  }

  function goPointsLog() {
    navigateWithLogin('/pages/user/points-log')
  }

  function goFeedback() {
    if (!uni.openCustomerServiceChat) {
      showToast('客服功能开发中')
      return
    }

    uni.openCustomerServiceChat({
      extInfo: { url: '' },
      corpId: '',
      success() {},
      fail() {
        showToast('客服功能开发中')
      },
    })
  }

  function goAbout() {
    showToast('关于页面开发中')
  }

  function goAdmin() {
    navigateWithLogin('/pages/admin/admin')
  }

  onMounted(() => {
    refreshUserPanel()
  })

  onShow(() => {
    refreshUserPanel()
  })

  watch(isLoggedIn, () => {
    updateHeaderHeight()
  })

  return {
    contentScrollStyle,
    defaultAvatar: DEFAULT_AVATAR,
    doLogin,
    doSignIn,
    goAbout,
    goAchievements,
    goAdmin,
    goFavorites,
    goFeedback,
    goInvite,
    goPointsLog,
    hasSigned,
    isLoading,
    isLoggedIn,
    statusBarHeight,
    store,
    userInfo,
    watchAd,
    chooseAvatar,
  }
}
