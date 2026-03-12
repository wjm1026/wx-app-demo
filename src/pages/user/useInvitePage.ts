import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { userApi, type InviteInfoResult, type InviteUserInfo } from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'
import {
  DEFAULT_AVATAR,
  formatRelativeDate,
  getErrorMessage,
  showToast,
} from '@/utils'

function extractInvitedList(data: InviteInfoResult): InviteUserInfo[] {
  const candidates = [
    data.list,
    data.invitedList,
    data.invitedUsers,
    data.invited_users,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  return []
}

export function useInvitePage() {
  const { store, ensureLoggedIn } = useLoginGuard({
    message: '请先登录',
    delay: 1500,
  })
  const inviteCode = ref('')
  const invitedList = ref<InviteUserInfo[]>([])
  const loading = ref(false)

  function formatDate(value: string | number | undefined) {
    return formatRelativeDate(value)
  }

  async function loadInviteData() {
    loading.value = true

    try {
      const res = await userApi.getInviteInfo()

      if (res.code !== 0 || !res.data) {
        showToast(res.msg || '获取邀请信息失败')
        return
      }

      if (res.data.invite_code || res.data.inviteCode) {
        inviteCode.value = res.data.invite_code || res.data.inviteCode || ''
      }

      invitedList.value = extractInvitedList(res.data)
    } catch (error) {
      showToast(getErrorMessage(error, '网络错误，请稍后重试'))
    } finally {
      loading.value = false
    }
  }

  function copyCode() {
    if (!inviteCode.value) {
      return
    }

    uni.setClipboardData({
      data: inviteCode.value,
      success: () => {
        showToast('邀请码已复制', 'success')
      },
    })
  }

  function generatePoster() {
    showToast('生成海报中...')
  }

  onShow(async () => {
    if (!ensureLoggedIn()) {
      return
    }

    if (store.userInfo?.invite_code) {
      inviteCode.value = store.userInfo.invite_code
    }

    await loadInviteData()
  })

  return {
    copyCode,
    defaultAvatar: DEFAULT_AVATAR,
    formatDate,
    generatePoster,
    inviteCode,
    invitedList,
    loading,
  }
}
