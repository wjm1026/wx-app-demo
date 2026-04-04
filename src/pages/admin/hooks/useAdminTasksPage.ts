import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  adminApi,
  type InviteTaskConfig,
  type InviteTaskKey,
  type PointsRuleConfig,
} from '@/api'
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
type PointsRuleNumberField = 'card_view_cost' | 'game_round_cost'
type ValueEvent = Event | { detail?: { value?: unknown } }
type PointsRuleForm = Required<Pick<PointsRuleConfig, 'card_view_cost' | 'game_round_cost'>>

const DEFAULT_POINTS_RULE_FORM: PointsRuleForm = {
  card_view_cost: 2,
  game_round_cost: 10,
}

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
  const pointsRuleForm = ref<PointsRuleForm>({ ...DEFAULT_POINTS_RULE_FORM })
  const lastSavedSnapshot = ref(JSON.stringify(taskForms.value))
  const lastSavedPointsRuleSnapshot = ref(JSON.stringify(pointsRuleForm.value))

  const enabledTaskCount = computed(
    () => taskForms.value.filter((item) => item.enabled).length,
  )

  const hasPendingChanges = computed(
    () =>
      JSON.stringify(taskForms.value) !== lastSavedSnapshot.value ||
      JSON.stringify(pointsRuleForm.value) !== lastSavedPointsRuleSnapshot.value,
  )

  /** 返回上一页 */
  function goBack() {
    navigateBack()
  }

  /** 记录快照 */
  function rememberSnapshot(taskConfigs: InviteTaskConfig[]) {
    lastSavedSnapshot.value = JSON.stringify(taskConfigs)
  }

  /** 记录积分规则快照 */
  function rememberPointsRuleSnapshot(ruleConfig: PointsRuleForm) {
    lastSavedPointsRuleSnapshot.value = JSON.stringify(ruleConfig)
  }

  /** 应用任务配置 */
  function applyTaskConfigs(taskConfigs: InviteTaskConfig[]) {
    const nextConfigs = cloneTaskConfigs(taskConfigs)
    taskForms.value = nextConfigs
    rememberSnapshot(nextConfigs)
  }

  /** 标准化积分规则 */
  function normalizePointsRuleConfig(config?: Partial<PointsRuleConfig> | null): PointsRuleForm {
    const cardCost = Number(config?.card_view_cost ?? DEFAULT_POINTS_RULE_FORM.card_view_cost)
    const gameCost = Number(config?.game_round_cost ?? DEFAULT_POINTS_RULE_FORM.game_round_cost)

    return {
      card_view_cost: Number.isFinite(cardCost) ? Math.max(0, Math.trunc(cardCost)) : 0,
      game_round_cost: Number.isFinite(gameCost) ? Math.max(0, Math.trunc(gameCost)) : 0,
    }
  }

  /** 应用积分规则 */
  function applyPointsRules(config?: Partial<PointsRuleConfig> | null) {
    const nextRules = normalizePointsRuleConfig(config)
    pointsRuleForm.value = nextRules
    rememberPointsRuleSnapshot(nextRules)
  }

  /** 加载任务配置 */
  async function loadTaskConfigs() {
    loading.value = true

    try {
      const [taskRes, pointsRuleRes] = await Promise.all([
        adminApi.getInviteTaskConfigs(),
        adminApi.getPointsRules(),
      ])

      if (taskRes.code !== 0 || !Array.isArray(taskRes.data)) {
        showToast(taskRes.msg || '加载任务配置失败')
        applyTaskConfigs(getDefaultInviteTaskConfigs())
      } else {
        applyTaskConfigs(taskRes.data)
      }

      if (pointsRuleRes.code !== 0 || !pointsRuleRes.data) {
        showToast(pointsRuleRes.msg || '加载积分规则失败')
        applyPointsRules(DEFAULT_POINTS_RULE_FORM)
      } else {
        applyPointsRules(pointsRuleRes.data)
      }
    } catch (error) {
      showToast(getErrorMessage(error, '加载任务配置失败'))
      applyTaskConfigs(getDefaultInviteTaskConfigs())
      applyPointsRules(DEFAULT_POINTS_RULE_FORM)
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

  /** 更新积分规则字段 */
  function updatePointsRuleField(field: PointsRuleNumberField, value: string) {
    const parsedValue = Number.parseInt(value, 10)
    pointsRuleForm.value = {
      ...pointsRuleForm.value,
      [field]: Number.isNaN(parsedValue) ? 0 : Math.max(0, parsedValue),
    }
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

  /** 处理积分规则数值输入 */
  function handlePointsRuleNumberInput(field: PointsRuleNumberField, event: ValueEvent) {
    updatePointsRuleField(field, String(readEventValue(event) ?? ''))
  }

  /** 恢复默认配置 */
  function restoreDefaults() {
    taskForms.value = getDefaultInviteTaskConfigs()
    pointsRuleForm.value = { ...DEFAULT_POINTS_RULE_FORM }
    showToast('已恢复默认配置，记得保存', 'success')
  }

  /** 保存任务配置 */
  async function saveTaskConfigs() {
    if (saving.value) {
      return
    }

    const nextConfigs = cloneTaskConfigs(taskForms.value)
    const nextPointsRules = normalizePointsRuleConfig(pointsRuleForm.value)

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

      const pointsRulesRes = await adminApi.savePointsRules(nextPointsRules)
      if (pointsRulesRes.code !== 0) {
        showToast(pointsRulesRes.msg || '积分规则保存失败')
        return
      }

      const savedTaskList = res.data?.tasks
      const savedTasks = Array.isArray(savedTaskList)
        ? cloneTaskConfigs(savedTaskList)
        : nextConfigs

      taskForms.value = savedTasks
      rememberSnapshot(savedTasks)
      applyPointsRules(pointsRulesRes.data || nextPointsRules)
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
    pointsRuleForm,
    handlePointsRuleNumberInput,
    updateTaskEnabled,
    updateTaskField,
    updateTaskNumberField,
    updatePointsRuleField,
  }
}
