import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  adminApi,
  type AdminUserDetailResult,
  type PointsLogItem,
} from '@/api'
import { usePageLayout } from '@/composables/usePageLayout'
import {
  DEFAULT_AVATAR,
  formatDate,
  getErrorMessage,
  hideLoading,
  navigateBack,
  showLoading,
  showToast,
} from '@/utils'

export function useAdminUserDetailPage() {
  const { statusBarHeight } = usePageLayout()
  const userId = ref('')
  const userInfo = ref<AdminUserDetailResult['user'] | null>(null)
  const favoriteCount = ref(0)
  const invitedCount = ref(0)
  const recentPoints = ref<PointsLogItem[]>([])
  const showPointsModal = ref(false)
  const adjustForm = reactive({
    amount: '',
    reason: '',
  })

  function goBack() {
    navigateBack()
  }

  function formatUserDate(value: number | string | undefined) {
    return formatDate(value, 'ymdHm') || '-'
  }

  function copyId() {
    if (!userInfo.value?._id) {
      return
    }

    uni.setClipboardData({
      data: userInfo.value._id,
      success: () => showToast('ID已复制'),
    })
  }

  async function loadUserDetail() {
    try {
      showLoading()
      const res = await adminApi.getUserDetail(userId.value)

      if (res.code === 0 && res.data) {
        userInfo.value = res.data.user
        favoriteCount.value = res.data.favoriteCount || 0
        invitedCount.value = res.data.invitedCount || 0
        recentPoints.value = res.data.recentPoints || []
        return
      }

      showToast(res.msg || '加载失败')
    } catch (error) {
      showToast(getErrorMessage(error, '加载失败'))
      console.error(error)
    } finally {
      hideLoading()
    }
  }

  async function toggleUserStatus() {
    if (!userInfo.value) {
      return
    }

    const isBanned = userInfo.value.status === 2
    const actionText = isBanned ? '解封' : '封禁'
    const newStatus = isBanned ? 1 : 2

    uni.showModal({
      title: '确认操作',
      content: `确定要${actionText}该用户吗？`,
      success: async (res) => {
        if (!res.confirm) {
          return
        }

        try {
          showLoading('处理中...')
          const apiRes = await adminApi.updateUserStatus(userId.value, newStatus)

          if (apiRes.code === 0) {
            showToast(`${actionText}成功`)
            void loadUserDetail()
            return
          }

          showToast(apiRes.msg || '操作失败')
        } catch (error) {
          showToast(getErrorMessage(error, '操作失败'))
        } finally {
          hideLoading()
        }
      },
    })
  }

  async function toggleUserRole() {
    if (!userInfo.value) {
      return
    }

    const isAdmin = userInfo.value.role === 'admin'
    const actionText = isAdmin ? '取消管理员' : '设为管理员'
    const newRole = isAdmin ? 'user' : 'admin'

    uni.showModal({
      title: '确认操作',
      content: `确定要${actionText}吗？`,
      success: async (res) => {
        if (!res.confirm) {
          return
        }

        try {
          showLoading('处理中...')
          const apiRes = await adminApi.setUserRole(userId.value, newRole)

          if (apiRes.code === 0) {
            showToast('设置成功')
            void loadUserDetail()
            return
          }

          showToast(apiRes.msg || '操作失败')
        } catch (error) {
          showToast(getErrorMessage(error, '操作失败'))
        } finally {
          hideLoading()
        }
      },
    })
  }

  function openPointsModal() {
    adjustForm.amount = ''
    adjustForm.reason = ''
    showPointsModal.value = true
  }

  function closePointsModal() {
    showPointsModal.value = false
  }

  async function submitPointsAdjust() {
    if (!adjustForm.amount) {
      showToast('请输入变动数量')
      return
    }

    const amount = parseInt(adjustForm.amount, 10)

    if (Number.isNaN(amount)) {
      showToast('请输入有效的数字')
      return
    }

    try {
      showLoading('处理中...')
      const res = await adminApi.adjustUserPoints(
        userId.value,
        amount,
        adjustForm.reason || '管理员调整',
      )

      if (res.code === 0) {
        showToast('调整成功')
        closePointsModal()
        void loadUserDetail()
        return
      }

      showToast(res.msg || '调整失败')
    } catch (error) {
      showToast(getErrorMessage(error, '调整失败'))
    } finally {
      hideLoading()
    }
  }

  onLoad((options) => {
    const id = typeof options?.id === 'string' ? options.id : ''

    if (id) {
      userId.value = id
      void loadUserDetail()
      return
    }

    showToast('参数错误')
    setTimeout(() => goBack(), 1500)
  })

  return {
    adjustForm,
    closePointsModal,
    copyId,
    defaultAvatar: DEFAULT_AVATAR,
    favoriteCount,
    formatDate: formatUserDate,
    goBack,
    invitedCount,
    openPointsModal,
    recentPoints,
    showPointsModal,
    statusBarHeight,
    submitPointsAdjust,
    toggleUserRole,
    toggleUserStatus,
    userInfo,
  }
}
