import { computed, ref } from 'vue'
import { onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'
import { userApi, type InviteUserInfo } from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'
import { usePageLayout } from '@/composables/usePageLayout'
import {
  buildInviteSharePath,
  clearStoredInviteCode,
  getErrorMessage,
  getStoredInviteCode,
  isInviteBindingWindowOpen,
  navigateBack,
  showToast,
  storeInviteCode,
  switchTab,
} from '@/utils'
import {
  buildConversionHint,
  buildInviteSummaryCards,
  buildMissionCards,
  buildMissionCopy,
  buildMissionTips,
  decorateInvitedList,
  extractInvitedList,
  type MissionKey,
  validateManualInviteCode,
} from './invite-page.helpers'

const LOGIN_REDIRECT_DELAY_MS = 700

export function useInvitePage() {
  const { statusBarHeight } = usePageLayout()
  const { store, isLoggedIn } = useLoginGuard()
  const ownInviteCode = ref('')
  const landingInviteCode = ref('')
  const manualInviteCode = ref('')
  const canBindInviteCode = ref(false)
  const invitedList = ref<InviteUserInfo[]>([])
  const inviteBindLoading = ref(false)
  const loading = ref(false)

  const displayInviteCode = computed(
    () => ownInviteCode.value || landingInviteCode.value,
  )

  const inviteCodeLabel = computed(() =>
    isLoggedIn.value ? '你的分享口令' : '当前好友邀请码',
  )

  const showManualInviteInput = computed(
    () => !isLoggedIn.value || canBindInviteCode.value,
  )

  const inviteCodeHint = computed(() => {
    if (isLoggedIn.value) {
      return '复制口令后可同步到微信、抖音、小红书等任务里使用。'
    }

    if (landingInviteCode.value) {
      return '你正通过好友邀请进入，登录后会自动绑定这次邀请关系。'
    }

    return '登录后会生成你的专属分享口令，用来完成积分任务。'
  })

  const manualInviteHint = computed(() => {
    if (!isLoggedIn.value && landingInviteCode.value) {
      return '当前已保存一个好友邀请码。首次登录时会先自动尝试绑定，若还未绑定成功，登录后仍可在这里补填一次。'
    }

    if (!isLoggedIn.value) {
      return '从抖音、小红书或线下海报来的用户，可以先在这里填写好友邀请码。首次登录时会自动尝试使用。'
    }

    if (landingInviteCode.value) {
      return '当前已带入一个好友邀请码。确认后可领取 +50 积分；每个新用户仅可绑定一次，且需在注册后 24 小时内完成。'
    }

    return '当前账号仍处于新用户补绑窗口，可在注册后 24 小时内手动填写一次好友邀请码。'
  })

  const manualInviteActionLabel = computed(() =>
    isLoggedIn.value
      ? inviteBindLoading.value
        ? '绑定中...'
        : '立即绑定'
      : '保存邀请码',
  )

  const summaryCards = computed(() =>
    buildInviteSummaryCards(invitedList.value.length),
  )

  const missionCards = computed(() =>
    buildMissionCards({
      isLoggedIn: isLoggedIn.value,
      hasInviteCode: Boolean(ownInviteCode.value),
    }),
  )

  const missionTips = buildMissionTips()

  const decoratedInvitedList = computed(() =>
    decorateInvitedList(invitedList.value),
  )

  const conversionHint = computed(() =>
    buildConversionHint({
      isLoggedIn: isLoggedIn.value,
      invitedCount: decoratedInvitedList.value.length,
    }),
  )

  async function loadInviteData() {
    loading.value = true

    try {
      const res = await userApi.getInviteInfo()

      if (res.code !== 0 || !res.data) {
        showToast(res.msg || '获取任务数据失败')
        return
      }

      if (res.data.invite_code || res.data.inviteCode) {
        ownInviteCode.value = res.data.invite_code || res.data.inviteCode || ''
      }

      canBindInviteCode.value = Boolean(res.data.canBindInviteCode)
      invitedList.value = extractInvitedList(res.data)

      if (store.userInfo) {
        store.setUserInfo({
          ...store.userInfo,
          invite_count: res.data.inviteCount ?? store.userInfo.invite_count,
          invite_code: res.data.inviteCode || res.data.invite_code || store.userInfo.invite_code,
          inviter_id: res.data.inviterId || store.userInfo.inviter_id,
        })
      }

      if (!res.data.canBindInviteCode) {
        clearStoredInviteCode()
        landingInviteCode.value = ''
        manualInviteCode.value = ''
      }
    } catch (error) {
      showToast(getErrorMessage(error, '网络错误，请稍后重试'))
    } finally {
      loading.value = false
    }
  }

  function goBack() {
    navigateBack()
  }

  function goLogin() {
    showToast('登录后开始任务')
    setTimeout(() => {
      switchTab('/pages/user/user')
    }, LOGIN_REDIRECT_DELAY_MS)
  }

  function ensureTaskReady() {
    if (!isLoggedIn.value) {
      goLogin()
      return false
    }

    if (!ownInviteCode.value) {
      showToast('正在同步分享口令，请稍后重试')
      return false
    }

    return true
  }

  function copyText(data: string, successTitle: string, onSuccess?: () => void) {
    uni.setClipboardData({
      data,
      success: () => {
        showToast(successTitle, 'success')
        onSuccess?.()
      },
    })
  }

  function copyCode() {
    if (!displayInviteCode.value) {
      showToast('当前还没有可复制的口令')
      return
    }

    copyText(
      displayInviteCode.value,
      isLoggedIn.value ? '分享口令已复制' : '好友邀请码已复制',
    )
  }

  // 抖音/小红书等站外渠道无法直接稳定拉起微信邀请链路时，先把好友邀请码缓存下来，
  // 登录前先缓存，登录后若仍在补绑窗口则走一次真实绑定接口。
  async function saveManualInviteCode() {
    if (!showManualInviteInput.value) {
      showToast('当前阶段不能再填写邀请码')
      return
    }

    const { normalized, errorMessage } = validateManualInviteCode(
      manualInviteCode.value,
    )

    if (errorMessage) {
      showToast(errorMessage)
      return
    }

    const storedCode = storeInviteCode(normalized)

    if (!storedCode) {
      showToast('邀请码保存失败，请重试')
      return
    }

    manualInviteCode.value = storedCode
    landingInviteCode.value = storedCode

    if (!isLoggedIn.value) {
      showToast('邀请码已保存，登录后自动使用', 'success')
      return
    }

    if (!canBindInviteCode.value || inviteBindLoading.value) {
      showToast('当前账号已不能再绑定邀请码')
      return
    }

    inviteBindLoading.value = true

    try {
      const res = await userApi.bindInviteCode(storedCode)

      if (res.code !== 0 || !res.data?.userInfo) {
        showToast(res.msg || '邀请码绑定失败')
        return
      }

      store.setUserInfo(res.data.userInfo)
      clearStoredInviteCode()
      landingInviteCode.value = ''
      manualInviteCode.value = ''
      canBindInviteCode.value = false
      showToast(res.msg || '邀请码绑定成功，已获得50积分', 'success')
      await loadInviteData()
    } catch (error) {
      showToast(getErrorMessage(error, '邀请码绑定失败，请稍后重试'))
    } finally {
      inviteBindLoading.value = false
    }
  }

  function runMissionWhenReady(action: () => void) {
    if (!ensureTaskReady()) {
      return
    }

    action()
  }

  function handleMomentsTask() {
    runMissionWhenReady(() => {
      copyText(
        buildMissionCopy('朋友圈', ownInviteCode.value),
        '朋友圈文案已复制',
        () => {
          uni.showModal({
            title: '朋友圈任务指引',
            content:
              '文案已经复制。接下来请点击右上角菜单，选择“分享到朋友圈”，系统会自动带上你的分享口令。',
            showCancel: false,
          })
        },
      )
    })
  }

  function handlePlatformTask(
    platform: '抖音' | '小红书',
    successTitle: string,
  ) {
    runMissionWhenReady(() => {
      copyText(buildMissionCopy(platform, ownInviteCode.value), successTitle, () => {
        uni.showModal({
          title: `${platform}任务素材已就绪`,
          content: `文案和分享口令已经复制，你可以直接去${platform}发布内容。`,
          showCancel: false,
        })
      })
    })
  }

  function handleMission(key: MissionKey) {
    if (key === 'share-friend') {
      ensureTaskReady()
      return
    }

    if (key === 'moments') {
      handleMomentsTask()
      return
    }

    if (key === 'douyin') {
      handlePlatformTask('抖音', '抖音文案已复制')
      return
    }

    handlePlatformTask('小红书', '小红书文案已复制')
  }

  onShareAppMessage(() => ({
    title: ownInviteCode.value
      ? `来做积分任务，输入口令 ${ownInviteCode.value} 一起加入学习计划`
      : '来宝宝识物，完成任务赚积分',
    path: buildInviteSharePath(ownInviteCode.value),
  }))

  onShareTimeline(() => ({
    title: ownInviteCode.value
      ? `宝宝识物积分任务中心｜口令 ${ownInviteCode.value}`
      : '宝宝识物积分任务中心',
    query: ownInviteCode.value
      ? `inviteCode=${encodeURIComponent(ownInviteCode.value)}`
      : '',
  }))

  onShow(async () => {
    landingInviteCode.value = getStoredInviteCode()
    manualInviteCode.value = landingInviteCode.value
    canBindInviteCode.value = isInviteBindingWindowOpen(store.userInfo)

    if (!isLoggedIn.value) {
      ownInviteCode.value = ''
      invitedList.value = []
      return
    }

    await loadInviteData()
  })

  return {
    conversionHint,
    copyCode,
    decoratedInvitedList,
    displayInviteCode,
    goBack,
    goLogin,
    handleMission,
    inviteCodeHint,
    inviteCodeLabel,
    isLoggedIn,
    landingInviteCode,
    loading,
    manualInviteActionLabel,
    manualInviteCode,
    manualInviteHint,
    missionCards,
    missionTips,
    saveManualInviteCode,
    showManualInviteInput,
    statusBarHeight,
    summaryCards,
  }
}
