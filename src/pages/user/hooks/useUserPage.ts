import { computed, onMounted, ref, watch } from 'vue'
import { onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { pointsApi, userApi, type LoginByWeixinResult } from '@/api'
import { useMeasuredHeight } from '@/composables/useMeasuredHeight'
import { usePageLayout } from '@/composables/usePageLayout'
import { useStore } from '@/store'
import {
  DEFAULT_AVATAR,
  clearStoredInviteCode,
  getErrorMessage,
  getStoredInviteCode,
  hideLoading,
  isInviteBindingWindowOpen,
  navigateTo,
  showLoading,
  showToast,
} from '@/utils'
import {
  buildLoginSuccessMessage,
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
  const nicknameDraft = ref('')

  const isLoggedIn = computed(() => store.isLoggedIn)
  const userInfo = computed(() => buildUserPageViewModel(store.userInfo))
  const contentScrollStyle = computed(() => ({
    marginTop: `${headerHeight.value}px`,
    height: `calc(100vh - ${headerHeight.value}px)`,
  }))

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

  /** 提取文件扩展名 */
  function extractFileExtension(filePath: string) {
    const matched = filePath.match(/\.([0-9a-zA-Z]+)(?:$|\?)/)
    return matched?.[1]?.toLowerCase() || 'png'
  }

  /** 提取输入内容值 */
  function extractInputValue(event: unknown) {
    if (!event || typeof event !== 'object') {
      return ''
    }

    const detail = (event as { detail?: { value?: unknown } }).detail
    return typeof detail?.value === 'string' ? detail.value : ''
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
    const extension = extractFileExtension(filePath)
    const cloudPath = `user-avatar-${store.userInfo?._id || 'guest'}-${Date.now()}.${extension}`
    const result = await uniCloud.uploadFile({
      filePath,
      cloudPath,
    })

    return result.fileID
  }

  /** 从路径更新头像 */
  async function updateAvatarFromPath(filePath: string) {
    try {
      if (!filePath) {
        return
      }

      isUpdatingProfile.value = true
      showLoading('上传头像中...')
      const avatar = await uploadAvatar(filePath)
      const result = await commitUserProfilePatch(
        { avatar },
        {
          success: '头像已更新',
          failure: '更新头像失败',
        },
      )
      hideLoading()
      if (result.message) {
        showToast(result.message, result.ok ? 'success' : 'none')
      }
    } catch (error) {
      if (!isCancelledAction(error)) {
        hideLoading()
        showToast(getErrorMessage(error, '更新头像失败'))
      }
    } finally {
      hideLoading()
      isUpdatingProfile.value = false
    }
  }

  /** 选择头像 */
  async function chooseAvatar() {
    if (triggerLoginIfNeeded() || isUpdatingProfile.value) {
      return
    }

    try {
      const filePath = await selectAvatarFile()
      await updateAvatarFromPath(filePath)
    } catch (error) {
      if (!isCancelledAction(error)) {
        hideLoading()
        showToast(getErrorMessage(error, '更新头像失败'))
      }
    }
  }

  /** 处理选择头像 */
  async function handleChooseAvatar(event: unknown) {
    if (triggerLoginIfNeeded() || isUpdatingProfile.value) {
      return
    }

    await updateAvatarFromPath(extractAvatarFilePath(event))
  }

  /** 保存昵称 */
  async function saveNickname(nextNickname: unknown) {
    const currentNickname = store.userInfo?.nickname || ''
    const nickname = normalizeNickname(nextNickname)

    nicknameDraft.value = nickname

    if (!nickname) {
      nicknameDraft.value = currentNickname
      showToast('昵称不能为空')
      return
    }

    if (nickname === currentNickname || isUpdatingProfile.value) {
      return
    }

    isUpdatingProfile.value = true
    showLoading('保存昵称中...')
    try {
      const result = await commitUserProfilePatch(
        { nickname },
        {
          success: '昵称已更新',
          failure: '更新昵称失败',
        },
      )
      hideLoading()
      if (!result.ok) {
        nicknameDraft.value = currentNickname
      }
      if (result.message) {
        showToast(result.message, result.ok ? 'success' : 'none')
      }
    } catch (error) {
      hideLoading()
      nicknameDraft.value = currentNickname
      showToast(getErrorMessage(error, '更新昵称失败'))
    } finally {
      hideLoading()
      isUpdatingProfile.value = false
    }
  }

  /** 处理昵称提交 */
  async function handleNicknameSubmit(event?: unknown) {
    if (triggerLoginIfNeeded()) {
      return
    }

    const nextNickname = extractInputValue(event) || nicknameDraft.value
    await saveNickname(nextNickname)
  }

  /** 处理编辑昵称 */
  async function editNickname() {
    if (triggerLoginIfNeeded() || isUpdatingProfile.value) {
      return
    }

    const currentNickname = store.userInfo?.nickname || ''

    try {
      const modalRes = await new Promise<UniApp.ShowModalRes>((resolve, reject) => {
        uni.showModal({
          title: '修改昵称',
          content: currentNickname || '请输入新的昵称',
          editable: true,
          placeholderText: currentNickname || '请输入昵称',
          confirmText: '保存',
          success: resolve,
          fail: reject,
        })
      })

      if (!modalRes.confirm) {
        return
      }

      await saveNickname(modalRes.content)
    } catch (error) {
      if (!isCancelledAction(error)) {
        hideLoading()
        showToast(getErrorMessage(error, '更新昵称失败'))
      }
    }
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
    // 已经绑定成功或已超出补绑窗口的账号，不需要继续保留待处理邀请码；
    // 只有仍处于补绑窗口且尚未绑定邀请人的新用户，才保留它用于后续手动补填。
    if (!isInviteBindingWindowOpen(data.userInfo)) {
      clearStoredInviteCode()
    }
    uni.hideToast()
    showToast(buildLoginSuccessMessage(data.isNewUser), 'success')
    void refreshAuthenticatedState()
    return true
  }

  /** 执行登录 */
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
      // 分享链接落地后的邀请码会先缓存在本地，这里统一在真正登录时再消费给后端。
      const inviteCode = getStoredInviteCode() || undefined
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
    () => store.userInfo?.nickname,
    (value) => {
      nicknameDraft.value = normalizeNickname(value)
    },
    { immediate: true },
  )

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
    handleChooseAvatar,
    handleNicknameSubmit,
    hasSigned,
    isLoading,
    isLoggedIn,
    nicknameDraft,
    statusBarHeight,
    store,
    userInfo,
    watchAd,
    chooseAvatar,
    editNickname,
  }
}
