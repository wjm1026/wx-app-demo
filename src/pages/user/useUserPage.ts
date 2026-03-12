import { computed, onMounted, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { pointsApi, userApi } from '@/api'
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

  const isLoggedIn = computed(() => !!store.userInfo)
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

  async function loadUserInfo() {
    try {
      const res = await userApi.getUserInfo()

      if (res.code === 0 && res.data) {
        store.setUserInfo(res.data)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  async function checkSignInStatus() {
    try {
      const res = await pointsApi.getSignInStatus()

      if (res.code === 0) {
        hasSigned.value = res.data?.hasSigned || false
      }
    } catch (error) {
      console.error('获取签到状态失败:', error)
    }
  }

  function refreshUserPanel() {
    updateHeaderHeight()

    if (isLoggedIn.value) {
      void loadUserInfo()
      void checkSignInStatus()
    }
  }

  function chooseAvatar() {
    if (!isLoggedIn.value) {
      void doLogin()
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
        if (res.data.token) {
          store.setToken(res.data.token, res.data.tokenExpired)
        }

        store.setUserInfo(res.data.userInfo)
        uni.removeStorageSync('INVITE_CODE')
        uni.hideToast()
        showToast(res.data.isNewUser ? '欢迎新用户！获得100积分 🎉' : '登录成功 🎉', 'success')
        void checkSignInStatus()
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
    if (!isLoggedIn.value) {
      void doLogin()
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

  async function watchAd() {
    if (!isLoggedIn.value) {
      void doLogin()
      return
    }

    // #ifdef MP-WEIXIN
    try {
      const videoAd = uni.createRewardedVideoAd({
        adUnitId: 'adunit-xxxxxxxxx',
      })

      videoAd.onClose(async (status) => {
        if (isRewardedAdCompleted(status)) {
          try {
            await rewardPointsFromAd()
          } catch (error) {
            console.error('积分发放失败:', error)
          }
          return
        }

        showToast('请看完广告才能获得奖励')
      })

      videoAd.show().catch(() => videoAd.load().then(() => videoAd.show()))
    } catch (error) {
      console.warn('广告加载失败，开发模式直接发放积分', error)

      try {
        await rewardPointsFromAd()
      } catch {
        showToast('获取积分失败')
      }
    }
    // #endif

    // #ifndef MP-WEIXIN
    showToast('加载广告中...', 'loading')
    setTimeout(async () => {
      uni.hideToast()

      try {
        await rewardPointsFromAd()
      } catch {
        showToast('获取积分失败')
      }
    }, 2000)
    // #endif
  }

  function runWithLogin(action: () => void) {
    if (!isLoggedIn.value) {
      void doLogin()
      return
    }

    action()
  }

  function goFavorites() {
    runWithLogin(() => navigateTo('/pages/user/favorites'))
  }

  function goAchievements() {
    runWithLogin(() => navigateTo('/pages/user/achievements'))
  }

  function goInvite() {
    runWithLogin(() => navigateTo('/pages/user/invite'))
  }

  function goPointsLog() {
    runWithLogin(() => navigateTo('/pages/user/points-log'))
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
    runWithLogin(() => navigateTo('/pages/admin/admin'))
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
