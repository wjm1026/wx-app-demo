import { getErrorMessage, hideLoading, showLoading, showToast } from '@/utils'

interface ActionFeedbackOptions<TResult> {
  loadingText?: string
  successText?: string
  errorText?: string
  execute: () => Promise<TResult>
  getSuccessMessage?: (result: TResult) => string
  onSuccess?: (result: TResult) => void | Promise<void>
  onError?: (error: unknown) => void | Promise<void>
}

interface ConfirmedActionOptions<TResult> extends ActionFeedbackOptions<TResult> {
  title: string
  content: string
}

// 把 uni.showModal 包成 Promise，页面 hook 里就能统一用 async/await 串流程。
function confirmAction(title: string, content: string) {
  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title,
      content,
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false),
    })
  })
}

/** 封装确认操作逻辑 */
export function useConfirmedAction() {
  // 对于不需要确认弹窗、但仍需要统一 loading / toast 反馈的动作，复用这一层即可。
  async function runActionWithFeedback<TResult>({
    loadingText = '处理中...',
    successText,
    errorText,
    execute,
    getSuccessMessage,
    onSuccess,
    onError,
  }: ActionFeedbackOptions<TResult>) {
    showLoading(loadingText)

    try {
      const result = await execute()
      hideLoading()

      const nextSuccessText = getSuccessMessage?.(result) || successText
      if (nextSuccessText) {
        showToast(nextSuccessText, 'success')
      }

      await onSuccess?.(result)
      return true
    } catch (error) {
      hideLoading()
      await onError?.(error)
      showToast(getErrorMessage(error, errorText || '操作失败'))
      return false
    }
  }

  // 统一承接“确认 -> loading -> 执行 -> 反馈”的交互流，避免页面里反复手写。
  async function runConfirmedAction<TResult>({
    title,
    content,
    ...rest
  }: ConfirmedActionOptions<TResult>) {
    const confirmed = await confirmAction(title, content)
    if (!confirmed) {
      return false
    }

    return runActionWithFeedback(rest)
  }

  return {
    confirmAction,
    runActionWithFeedback,
    runConfirmedAction,
  }
}
