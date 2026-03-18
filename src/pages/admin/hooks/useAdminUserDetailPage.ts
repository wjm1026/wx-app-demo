import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  adminApi,
  type AdminUserDetailResult,
  type PointsLogItem,
} from '@/api'
import { useConfirmedAction } from '@/composables/useConfirmedAction'
import { usePageLayout } from '@/composables/usePageLayout'
import {
  assertApiSuccess,
  DEFAULT_AVATAR,
  formatDate,
  formatNumber,
  getErrorMessage,
  hideLoading,
  navigateBack,
  showLoading,
  showToast,
} from '@/utils'

/** 封装后台用户详情页面逻辑 */
export function useAdminUserDetailPage() {
  const { statusBarHeight } = usePageLayout()
  const { runActionWithFeedback, runConfirmedAction } = useConfirmedAction()
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

  /** 返回上一页 */
  function goBack() {
    navigateBack()
  }

  /** 应用用户详情 */
  function applyUserDetail(detail: AdminUserDetailResult) {
    userInfo.value = detail.user
    favoriteCount.value = detail.favoriteCount || 0
    invitedCount.value = detail.invitedCount || 0
    recentPoints.value = detail.recentPoints || []
  }

  /** 格式化用户日期 */
  function formatUserDate(value: number | string | undefined) {
    return formatDate(value, 'ymdHm') || '-'
  }

  /** 格式化指标 */
  function formatMetric(value: number | string | undefined) {
    return formatNumber(Number(value || 0))
  }

  /** 复制ID */
  function copyId() {
    if (!userInfo.value?._id) {
      return
    }

    uni.setClipboardData({
      data: userInfo.value._id,
      success: () => showToast('ID已复制'),
    })
  }

  /** 加载用户详情 */
  async function loadUserDetail(showLoadingMask = true) {
    try {
      if (showLoadingMask) {
        showLoading()
      }

      const res = await adminApi.getUserDetail(userId.value)

      if (res.code === 0 && res.data) {
        applyUserDetail(res.data)
        return
      }

      showToast(res.msg || '加载失败')
    } catch (error) {
      showToast(getErrorMessage(error, '加载失败'))
    } finally {
      if (showLoadingMask) {
        hideLoading()
      }
    }
  }

  /** 切换用户状态 */
  async function toggleUserStatus() {
    if (!userInfo.value) {
      return
    }

    const isBanned = userInfo.value.status === 2
    const actionText = isBanned ? '解封' : '封禁'
    const newStatus = isBanned ? 1 : 2

    await runConfirmedAction({
      title: '确认操作',
      content: `确定要${actionText}该用户吗？`,
      loadingText: '处理中...',
      errorText: '操作失败',
      execute: async () =>
        assertApiSuccess(
          await adminApi.updateUserStatus(userId.value, newStatus),
          '操作失败',
        ),
      getSuccessMessage: () => `${actionText}成功`,
      onSuccess: async () => {
        await loadUserDetail(false)
      },
    })
  }

  /** 切换用户角色 */
  async function toggleUserRole() {
    if (!userInfo.value) {
      return
    }

    const isAdmin = userInfo.value.role === 'admin'
    const actionText = isAdmin ? '取消管理员' : '设为管理员'
    const newRole = isAdmin ? 'user' : 'admin'

    await runConfirmedAction({
      title: '确认操作',
      content: `确定要${actionText}吗？`,
      loadingText: '处理中...',
      errorText: '操作失败',
      execute: async () =>
        assertApiSuccess(
          await adminApi.setUserRole(userId.value, newRole),
          '操作失败',
        ),
      successText: '设置成功',
      onSuccess: async () => {
        await loadUserDetail(false)
      },
    })
  }

  /** 打开积分弹窗 */
  function openPointsModal() {
    adjustForm.amount = ''
    adjustForm.reason = ''
    showPointsModal.value = true
  }

  /** 关闭积分弹窗 */
  function closePointsModal() {
    showPointsModal.value = false
  }

  /** 提交积分调整 */
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

    await runActionWithFeedback({
      loadingText: '处理中...',
      successText: '调整成功',
      errorText: '调整失败',
      execute: async () =>
        assertApiSuccess(
          await adminApi.adjustUserPoints(
            userId.value,
            amount,
            adjustForm.reason || '管理员调整',
          ),
          '调整失败',
        ),
      onSuccess: async () => {
        closePointsModal()
        await loadUserDetail(false)
      },
    })
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
    formatMetric,
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
