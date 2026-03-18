import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { adminApi, type InviteTaskConfig, type InviteTaskKey } from '@/api'
import {
  getDefaultInviteTaskConfigs,
  getInviteTaskMeta,
  mergeInviteTaskConfigs,
} from '@/config/invite-tasks'
import { usePageLayout } from '@/composables/usePageLayout'
import { getErrorMessage, navigateBack, showToast } from '@/utils'

type InviteTaskTextField =
  | 'channel'
  | 'title'
  | 'desc'
  | 'note'
  | 'actionLabel'

type InviteTaskNumberField = 'points' | 'sortOrder'
type ValueEvent = Event | { detail?: { value?: unknown } }

/** 克隆任务配置 */
function cloneTaskConfigs(taskConfigs: InviteTaskConfig[]) {
  return mergeInviteTaskConfigs(taskConfigs)
}

/** 封装后台任务列表页面逻辑 */
export function useAdminTasksPage() {
  const { statusBarHeight } = usePageLayout()
  const loading = ref(true)
  const saving = ref(false)
  const taskForms = ref<InviteTaskConfig[]>(getDefaultInviteTaskConfigs())
  const lastSavedSnapshot = ref(JSON.stringify(taskForms.value))

  const enabledTaskCount = computed(
    () => taskForms.value.filter((item) => item.enabled).length,
  )

  const hasPendingChanges = computed(
    () => JSON.stringify(taskForms.value) !== lastSavedSnapshot.value,
  )

  /** 返回上一页 */
  function goBack() {
    navigateBack()
  }

  /** 记录快照 */
  function rememberSnapshot(taskConfigs: InviteTaskConfig[]) {
    lastSavedSnapshot.value = JSON.stringify(taskConfigs)
  }

  /** 应用任务配置 */
  function applyTaskConfigs(taskConfigs: InviteTaskConfig[]) {
    const nextConfigs = cloneTaskConfigs(taskConfigs)
    taskForms.value = nextConfigs
    rememberSnapshot(nextConfigs)
  }

  /** 加载任务配置 */
  async function loadTaskConfigs() {
    loading.value = true

    try {
      const res = await adminApi.getInviteTaskConfigs()

      if (res.code !== 0 || !Array.isArray(res.data)) {
        showToast(res.msg || '加载任务配置失败')
        applyTaskConfigs(getDefaultInviteTaskConfigs())
        return
      }

      applyTaskConfigs(res.data)
    } catch (error) {
      showToast(getErrorMessage(error, '加载任务配置失败'))
      applyTaskConfigs(getDefaultInviteTaskConfigs())
    } finally {
      loading.value = false
    }
  }

  /** 按补丁更新任务 */
  function patchTask(index: number, patch: Partial<InviteTaskConfig>) {
    taskForms.value = taskForms.value.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            ...patch,
          }
        : item,
    )
  }

  /** 更新任务字段 */
  function updateTaskField(
    index: number,
    field: InviteTaskTextField,
    value: string,
  ) {
    patchTask(index, { [field]: value } as Partial<InviteTaskConfig>)
  }

  /** 更新任务数值字段 */
  function updateTaskNumberField(
    index: number,
    field: InviteTaskNumberField,
    value: string,
  ) {
    const parsedValue = Number.parseInt(value, 10)

    patchTask(index, {
      [field]: Number.isNaN(parsedValue) ? 0 : parsedValue,
    } as Partial<InviteTaskConfig>)
  }

  /** 更新任务启用 */
  function updateTaskEnabled(index: number, value: boolean) {
    patchTask(index, { enabled: value })
  }

  /** 读取事件值 */
  function readEventValue(event: ValueEvent) {
    if (event && typeof event === 'object' && 'detail' in event) {
      return event.detail?.value
    }

    return undefined
  }

  /** 处理任务字段输入内容 */
  function handleTaskFieldInput(
    index: number,
    field: InviteTaskTextField,
    event: ValueEvent,
  ) {
    updateTaskField(index, field, String(readEventValue(event) ?? ''))
  }

  /** 处理任务数值输入内容 */
  function handleTaskNumberInput(
    index: number,
    field: InviteTaskNumberField,
    event: ValueEvent,
  ) {
    updateTaskNumberField(index, field, String(readEventValue(event) ?? ''))
  }

  /** 处理任务启用状态变更 */
  function handleTaskEnabledChange(index: number, event: ValueEvent) {
    updateTaskEnabled(index, Boolean(readEventValue(event)))
  }

  /** 恢复默认配置 */
  function restoreDefaults() {
    taskForms.value = getDefaultInviteTaskConfigs()
    showToast('已恢复默认配置，记得保存', 'success')
  }

  /** 保存任务配置 */
  async function saveTaskConfigs() {
    if (saving.value) {
      return
    }

    const nextConfigs = cloneTaskConfigs(taskForms.value)

    if (!nextConfigs.some((item) => item.enabled)) {
      showToast('至少保留一个启用任务')
      return
    }

    saving.value = true

    try {
      const res = await adminApi.saveInviteTaskConfigs(nextConfigs)

      if (res.code !== 0) {
        showToast(res.msg || '任务配置保存失败')
        return
      }

      const savedTaskList = res.data?.tasks
      const savedTasks = Array.isArray(savedTaskList)
        ? cloneTaskConfigs(savedTaskList)
        : nextConfigs

      taskForms.value = savedTasks
      rememberSnapshot(savedTasks)
      showToast(res.msg || '任务配置已保存', 'success')
    } catch (error) {
      showToast(getErrorMessage(error, '任务配置保存失败'))
    } finally {
      saving.value = false
    }
  }

  /** 按键名获取任务元数据 */
  function getTaskMetaByKey(key: InviteTaskKey) {
    return getInviteTaskMeta(key)
  }

  onShow(() => {
    void loadTaskConfigs()
  })

  return {
    enabledTaskCount,
    getTaskMetaByKey,
    goBack,
    handleTaskEnabledChange,
    handleTaskFieldInput,
    handleTaskNumberInput,
    hasPendingChanges,
    loading,
    restoreDefaults,
    saveTaskConfigs,
    saving,
    statusBarHeight,
    taskForms,
    updateTaskEnabled,
    updateTaskField,
    updateTaskNumberField,
  }
}
