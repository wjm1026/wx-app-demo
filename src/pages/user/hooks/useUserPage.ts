import { computed, onMounted, ref, watch } from 'vue'
import { onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { pointsApi, userApi } from '@/api'
import { uploadApiFile } from '@/api/shared'
import { loginWithWeixin } from '@/auth/session'
import { useMeasuredHeight } from '@/composables/useMeasuredHeight'
import { usePageLayout } from '@/composables/usePageLayout'
import { useStore } from '@/store'
import {
  DEFAULT_AVATAR,
  getErrorMessage,
  hideLoading,
  navigateTo,
  showLoading,
  showToast,
} from '@/utils'
import {
  buildUserPageViewModel,
  buildUserSharePayload,
  isRewardedAdCompleted,
  isUnauthorizedCode,
  MOCK_REWARDED_AD_DURATION_MS,
  PROTECTED_USER_PAGE_ROUTES,
  REWARDED_VIDEO_AD_UNIT_ID,
  type ProtectedUserPage,
} from './user-page.helpers'

type UserProfilePatch = {
  nickname?: string
  avatar?: string
  gender?: number
}

const PROFILE_NICKNAME_MAX_LENGTH = 20

/** 封装用户页面逻辑 */
export function useUserPage() {
  const store = useStore()
  const { statusBarHeight } = usePageLayout()
  const { height: headerHeight, measureHeight: updateHeaderHeight } =
    useMeasuredHeight('.header')

  const hasSigned = ref(false)
  const isLoading = ref(false)
  const isUpdatingProfile = ref(false)
  const isProfileEditorVisible = ref(false)
  const profileNicknameDraft = ref('')
  const profileAvatarDraft = ref('')
  const profileAvatarTempFilePath = ref('')

  const isLoggedIn = computed(() => store.isLoggedIn)
  const userInfo = computed(() => buildUserPageViewModel(store.userInfo))
  const contentScrollStyle = computed(() => ({
    marginTop: `${headerHeight.value}px`,
    height: `calc(100vh - ${headerHeight.value}px)`,
  }))
  const profileAvatarSource = computed(
    () => profileAvatarDraft.value || userInfo.value.avatar || DEFAULT_AVATAR,
  )

  // 用户资料和签到状态都依赖登录态。只要接口返回 401/404，就说明本地 token 已失效
  // 或服务端已不存在当前用户，页面应该立刻回退到未登录状态，避免前后端口径不一致。
  function handleUnauthorized(code?: number, options: { resetSignIn?: boolean } = {}) {
    if (!isUnauthorizedCode(code)) {
      return false
    }

    if (options.resetSignIn) {
      hasSigned.value = false
    }

    store.logout()
    return true
  }

  /** 加载用户信息 */
  async function loadUserInfo() {
    try {
      const res = await userApi.getUserInfo()

      if (res.code === 0 && res.data) {
        store.setUserInfo(res.data)
        return
      }

      handleUnauthorized(res.code)
    } catch {
      // 用户页展示时允许静默失败，避免临时网络波动导致重复提示。
    }
  }

  /** 检查签到状态 */
  async function checkSignInStatus() {
    try {
      const res = await pointsApi.getSignInStatus()

      if (res.code === 0) {
        hasSigned.value = res.data?.hasSigned || false
        return
      }

      handleUnauthorized(res.code, { resetSignIn: true })
    } catch {
      // 签到状态失败不影响页面主流程，留给下一次展示时重试。
    }
  }

  /** 刷新已登录状态 */
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

  /** 在需要时触发登录 */
  function triggerLoginIfNeeded() {
    if (isLoggedIn.value) {
      return false
    }

    void doLogin()
    return true
  }

  /** 应用本地用户信息补丁 */
  function applyLocalUserInfoPatch(patch: UserProfilePatch) {
    if (!store.userInfo) {
      return
    }

    store.setUserInfo({
      ...store.userInfo,
      ...patch,
    })
  }

  /** 规范化昵称 */
  function normalizeNickname(value: unknown) {
    if (typeof value !== 'string') {
      return ''
    }

    return value.trim().slice(0, PROFILE_NICKNAME_MAX_LENGTH)
  }

  /** 提取头像文件路径 */
  function extractAvatarFilePath(event: unknown) {
    if (!event || typeof event !== 'object') {
      return ''
    }

    const detail = (event as { detail?: { avatarUrl?: unknown } }).detail
    return typeof detail?.avatarUrl === 'string' ? detail.avatarUrl : ''
  }

  /** 判断已取消操作是否满足条件 */
  function isCancelledAction(error: unknown) {
    return getErrorMessage(error).toLowerCase().includes('cancel')
  }

  /** 提交用户资料补丁 */
  async function commitUserProfilePatch(
    patch: UserProfilePatch,
    messages: { success: string; failure: string },
  ) {
    const res = await userApi.updateUserInfo(patch)

    if (res.code === 0) {
      applyLocalUserInfoPatch(patch)
      void loadUserInfo()
      return {
        ok: true,
        message: messages.success,
      }
    }

    if (handleUnauthorized(res.code)) {
      return {
        ok: false,
        message: '',
      }
    }

    return {
      ok: false,
      message: res.msg || messages.failure,
    }
  }

  /** 处理选择头像文件相关逻辑 */
  async function selectAvatarFile() {
    const res = await new Promise<UniApp.ChooseImageSuccessCallbackResult>(
      (resolve, reject) => {
        uni.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject,
        })
      },
    )

    return res.tempFilePaths?.[0] || ''
  }

  /** 上传头像 */
  async function uploadAvatar(filePath: string) {
    const folder = `avatars/${store.userInfo?._id || 'guest'}`
    const result = await uploadApiFile(filePath, { folder })
    if (result.code !== 0) {
      throw new Error(result.msg || '上传头像失败')
    }

    const uploadUrl = result.data?.url || result.data?.path
    if (!uploadUrl) {
      throw new Error('上传头像失败')
    }

    return uploadUrl
  }

  /** 同步资料编辑器草稿 */
  function syncProfileEditorDraft() {
    profileNicknameDraft.value = normalizeNickname(store.userInfo?.nickname)
    profileAvatarDraft.value = store.userInfo?.avatar || ''
    profileAvatarTempFilePath.value = ''
  }

  /** 打开资料编辑器 */
  function openProfileEditor() {
    if (triggerLoginIfNeeded() || isUpdatingProfile.value) {
      return
    }

    syncProfileEditorDraft()
    isProfileEditorVisible.value = true
  }

  /** 关闭资料编辑器 */
  function closeProfileEditor(forceOrEvent?: unknown) {
    const force = typeof forceOrEvent === 'boolean' ? forceOrEvent : false

    if (!force && isUpdatingProfile.value) {
      return
    }

    isProfileEditorVisible.value = false
    syncProfileEditorDraft()
  }

  /** 设置资料编辑器头像 */
  function setProfileEditorAvatar(filePath: string) {
    if (!filePath) {
      return
    }

    profileAvatarDraft.value = filePath
    profileAvatarTempFilePath.value = filePath
  }

  /** 资料编辑器选择头像 */
  async function chooseProfileEditorAvatar() {
    if (triggerLoginIfNeeded() || isUpdatingProfile.value || !isProfileEditorVisible.value) {
      return
    }

    try {
      const filePath = await selectAvatarFile()
      setProfileEditorAvatar(filePath)
    } catch (error) {
      if (!isCancelledAction(error)) {
        showToast(getErrorMessage(error, '选择头像失败'))
      }
    }
  }

  /** 资料编辑器处理微信头像选择 */
  function handleProfileEditorChooseAvatar(event: unknown) {
    if (triggerLoginIfNeeded() || isUpdatingProfile.value || !isProfileEditorVisible.value) {
      return
    }

    setProfileEditorAvatar(extractAvatarFilePath(event))
  }

  /** 保存资料编辑器内容 */
  async function saveProfileEditor() {
    if (triggerLoginIfNeeded() || isUpdatingProfile.value) {
      return
    }

    const currentNickname = normalizeNickname(store.userInfo?.nickname)
    const currentAvatar = store.userInfo?.avatar || ''
    const nickname = normalizeNickname(profileNicknameDraft.value)

    profileNicknameDraft.value = nickname

    if (!nickname) {
      showToast('昵称不能为空')
      return
    }

    isUpdatingProfile.value = true
    showLoading('保存资料中...')

    try {
      let avatar = currentAvatar

      if (profileAvatarTempFilePath.value) {
        avatar = await uploadAvatar(profileAvatarTempFilePath.value)
      }

      const patch: UserProfilePatch = {}

      if (nickname !== currentNickname) {
        patch.nickname = nickname
      }

      if (avatar && avatar !== currentAvatar) {
        patch.avatar = avatar
      }

      if (Object.keys(patch).length === 0) {
        closeProfileEditor(true)
        showToast('资料已是最新', 'success')
        return
      }

      const result = await commitUserProfilePatch(
        patch,
        {
          success: '资料已更新',
          failure: '更新资料失败',
        },
      )

      if (result.ok) {
        closeProfileEditor(true)
      }

      if (result.message) {
        showToast(result.message, result.ok ? 'success' : 'none')
      }
    } catch (error) {
      if (!isCancelledAction(error)) {
        showToast(getErrorMessage(error, '更新资料失败'))
      }
    } finally {
      hideLoading()
      isUpdatingProfile.value = false
    }
  }

  /** 执行登录 */
  async function doLogin() {
    if (isLoading.value) {
      return
    }

    isLoading.value = true

    try {
      const success = await loginWithWeixin({
        force: true,
        showFailureToast: true,
        showLoadingToast: true,
        showSuccessToast: true,
      })

      if (success) {
        void refreshAuthenticatedState()
      }
    } finally {
      isLoading.value = false
    }
  }

  /** 执行签到 */
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

  /** 从广告发放积分 */
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
    } catch {
      showToast('获取积分失败')
    }
  }

  /** 处理激励广告关闭 */
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
    }, MOCK_REWARDED_AD_DURATION_MS)
  }

  /** 处理观看广告 */
  async function watchAd() {
    if (triggerLoginIfNeeded()) {
      return
    }

    // #ifdef MP-WEIXIN
    try {
      const videoAd = uni.createRewardedVideoAd({
        adUnitId: REWARDED_VIDEO_AD_UNIT_ID,
      })

      videoAd.onClose((status) => {
        handleRewardedAdClose(status)
      })

      videoAd.show().catch(() => videoAd.load().then(() => videoAd.show()))
    } catch {
      await rewardPointsFromAdSafely()
    }
    // #endif

    // #ifndef MP-WEIXIN
    showMockRewardedAd()
    // #endif
  }

  /** 登录后执行 */
  function runWithLogin(action: () => void) {
    if (!isLoggedIn.value) {
      showToast('请先登录')
      return
    }

    action()
  }

  // 用户中心多个入口都需要登录保护，统一从路由表读取可以避免页面地址散落多处。
  function goProtectedPage(page: ProtectedUserPage) {
    runWithLogin(() => navigateTo(PROTECTED_USER_PAGE_ROUTES[page]))
  }

  /** 跳转到收藏列表 */
  function goFavorites() {
    goProtectedPage('favorites')
  }

  /** 跳转到成就列表 */
  function goAchievements() {
    goProtectedPage('achievements')
  }

  /** 跳转到邀请 */
  function goInvite() {
    goProtectedPage('invite')
  }

  /** 跳转到积分日志 */
  function goPointsLog() {
    goProtectedPage('pointsLog')
  }

  /** 跳转到反馈 */
  function goFeedback() {
    if (!uni.openCustomerServiceChat) {
      showToast('客服功能开发中')
      return
    }

    uni.openCustomerServiceChat({
      extInfo: { url: '' },
      corpId: '',
      /** 处理成功回调 */
      success() { },
      /** 处理失败回调 */
      fail() {
        showToast('客服功能开发中')
      },
    })
  }

  /** 跳转到关于页 */
  function goAbout() {
    showToast('关于页面开发中')
  }

  /** 跳转到后台 */
  function goAdmin() {
    goProtectedPage('admin')
  }

  // 用户中心里的“分享给朋友”也统一走邀请码分享，避免和邀请页出现两套不同链路。
  onShareAppMessage(() => buildUserSharePayload(userInfo.value.inviteCode))

  onMounted(() => {
    refreshUserPanel()
  })

  onShow(() => {
    refreshUserPanel()
  })

  watch(isLoggedIn, () => {
    updateHeaderHeight()
  })

  watch(
    [() => store.userInfo?.nickname, () => store.userInfo?.avatar],
    () => {
      if (!isProfileEditorVisible.value) {
        syncProfileEditorDraft()
      }
    },
    { immediate: true },
  )

  return {
    chooseProfileEditorAvatar,
    closeProfileEditor,
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
    handleProfileEditorChooseAvatar,
    hasSigned,
    isLoading,
    isLoggedIn,
    isProfileEditorVisible,
    isUpdatingProfile,
    openProfileEditor,
    profileAvatarSource,
    profileNicknameDraft,
    saveProfileEditor,
    statusBarHeight,
    store,
    userInfo,
    watchAd,
  }
}
