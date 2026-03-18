import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { userApi, type InviteInfoResult, type InviteUserInfo } from '@/api'
import { useLoginGuard } from '@/composables/useLoginGuard'
import { usePageLayout } from '@/composables/usePageLayout'
import {
  DEFAULT_AVATAR,
  formatDate,
  formatRelativeDate,
  getErrorMessage,
  navigateBack,
  showToast,
} from '@/utils'

const SELF_REWARD_POINTS = 100
const FRIEND_REWARD_POINTS = 50

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

function resolveInviteTime(item: InviteUserInfo) {
  return item.create_time || item.created_at || item.time
}

export function useInvitePage() {
  const { statusBarHeight } = usePageLayout()
  const { store, ensureLoggedIn } = useLoginGuard({
    message: '请先登录',
    delay: 1500,
  })
  const inviteCode = ref('')
  const invitedList = ref<InviteUserInfo[]>([])
  const loading = ref(false)

  const summaryCards = computed(() => [
    {
      key: 'count',
      label: '已邀请好友',
      value: String(invitedList.value.length),
      icon: '/static/icons/line/users.svg',
      tone: 'tone-cyan',
    },
    {
      key: 'earned',
      label: '累计奖励',
      value: `+${invitedList.value.length * SELF_REWARD_POINTS}`,
      icon: '/static/icons/line/coins.svg',
      tone: 'tone-gold',
    },
    {
      key: 'friend',
      label: '好友奖励',
      value: `+${FRIEND_REWARD_POINTS}`,
      icon: '/static/icons/line/gift.svg',
      tone: 'tone-green',
    },
  ])

  // 邀请记录原始字段比较散，这里先统一成展示层，模板只关心最终展示结果。
  const decoratedInvitedList = computed(() =>
    invitedList.value.map((item, index) => {
      const inviteTime = resolveInviteTime(item)

      return {
        key: item._id || `${item.nickname || 'guest'}-${index}`,
        avatar: item.avatar || DEFAULT_AVATAR,
        nickname: item.nickname || '微信好友',
        timeLabel: formatDate(inviteTime, 'mdHm') || '刚刚加入',
        relativeLabel: formatRelativeDate(inviteTime) || '刚刚',
        rewardLabel: `+${SELF_REWARD_POINTS}`,
      }
    }),
  )

  const sectionHint = computed(() => {
    if (decoratedInvitedList.value.length === 0) {
      return '分享邀请码后，加入学习计划的好友会出现在这里'
    }

    return `已加入 ${decoratedInvitedList.value.length} 位好友，继续分享可以解锁更多奖励`
  })

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
    showToast('分享海报功能开发中')
  }

  function goBack() {
    navigateBack()
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
    decoratedInvitedList,
    generatePoster,
    goBack,
    inviteCode,
    loading,
    sectionHint,
    statusBarHeight,
    summaryCards,
  }
}
