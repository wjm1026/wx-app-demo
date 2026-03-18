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

function cloneTaskConfigs(taskConfigs: InviteTaskConfig[]) {
  return mergeInviteTaskConfigs(taskConfigs)
}

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

  function goBack() {
    navigateBack()
  }

  function rememberSnapshot(taskConfigs: InviteTaskConfig[]) {
    lastSavedSnapshot.value = JSON.stringify(taskConfigs)
  }

  function applyTaskConfigs(taskConfigs: InviteTaskConfig[]) {
    const nextConfigs = cloneTaskConfigs(taskConfigs)
    taskForms.value = nextConfigs
    rememberSnapshot(nextConfigs)
  }

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

  function updateTaskField(
    index: number,
    field: InviteTaskTextField,
    value: string,
  ) {
    patchTask(index, { [field]: value } as Partial<InviteTaskConfig>)
  }

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

  function updateTaskEnabled(index: number, value: boolean) {
    patchTask(index, { enabled: value })
  }

  function readEventValue(event: ValueEvent) {
    if (event && typeof event === 'object' && 'detail' in event) {
      return event.detail?.value
    }

    return undefined
  }

  function handleTaskFieldInput(
    index: number,
    field: InviteTaskTextField,
    event: ValueEvent,
  ) {
    updateTaskField(index, field, String(readEventValue(event) ?? ''))
  }

  function handleTaskNumberInput(
    index: number,
    field: InviteTaskNumberField,
    event: ValueEvent,
  ) {
    updateTaskNumberField(index, field, String(readEventValue(event) ?? ''))
  }

  function handleTaskEnabledChange(index: number, event: ValueEvent) {
    updateTaskEnabled(index, Boolean(readEventValue(event)))
  }

  function restoreDefaults() {
    taskForms.value = getDefaultInviteTaskConfigs()
    showToast('已恢复默认配置，记得保存', 'success')
  }

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
