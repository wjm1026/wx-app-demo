import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  adminApi,
  type AdminAliyunCredentials,
  type AdminCardBatchRequest,
  type AdminCardBatchResult,
} from '@/api'
import { useConfirmedAction } from '@/composables/useConfirmedAction'
import { usePageLayout } from '@/composables/usePageLayout'
import { assertApiSuccess, navigateBack, showToast } from '@/utils'

type BatchActionType = 'translate-zh-to-en' | 'generate-cn-audio' | 'generate-en-audio'

interface BatchActionMeta {
  title: string
  subtitle: string
  loadingText: string
  errorText: string
  fallbackSuccessText: string
  requirement: string
}

interface BatchParamsForm {
  limit: string
  startId: string
  onlyEnabled: boolean
  overwrite: boolean
}

const CREDENTIALS_STORAGE_KEY = 'ADMIN_BATCH_ALIYUN_CREDENTIALS_V1'
const ACTION_PARAMS_STORAGE_PREFIX = 'ADMIN_BATCH_PARAMS_V1_'

const ACTION_META: Record<BatchActionType, BatchActionMeta> = {
  'translate-zh-to-en': {
    title: '中文转英文',
    subtitle: '批量翻译卡片中文名，仅写入 name_en。',
    loadingText: '中文转英文处理中...',
    errorText: '中文转英文失败',
    fallbackSuccessText: '中文转英文完成',
    requirement: '需要填写 AK 和 Secret。',
  },
  'generate-cn-audio': {
    title: '生成中文语音',
    subtitle: '按卡片中文名批量生成 audio 字段。',
    loadingText: '中文语音生成中...',
    errorText: '中文语音生成失败',
    fallbackSuccessText: '中文语音生成完成',
    requirement: '需要 AppKey，且必须提供 Token 或 AK+Secret。',
  },
  'generate-en-audio': {
    title: '生成英文语音',
    subtitle: '按 name_en 批量生成 audio_en，固定不自动翻译。',
    loadingText: '英文语音生成中...',
    errorText: '英文语音生成失败',
    fallbackSuccessText: '英文语音生成完成',
    requirement: '需要 AppKey，且必须提供 Token 或 AK+Secret。',
  },
}

const DEFAULT_PARAMS: BatchParamsForm = {
  limit: '100',
  startId: '',
  onlyEnabled: true,
  overwrite: false,
}

function isBatchActionType(value: unknown): value is BatchActionType {
  return value === 'translate-zh-to-en'
    || value === 'generate-cn-audio'
    || value === 'generate-en-audio'
}

function safeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readJsonStorage<T>(key: string): T | null {
  try {
    const raw = uni.getStorageSync(key)
    if (!raw || typeof raw !== 'string') {
      return null
    }
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJsonStorage(key: string, value: unknown) {
  uni.setStorageSync(key, JSON.stringify(value))
}

function parseUnsignedInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) {
    return null
  }
  return parsed
}

function hasText(value: string | undefined): boolean {
  return Boolean(value && value.trim())
}

function getEventValue(event: Event): unknown {
  const payload = event as Event & {
    detail?: {
      value?: unknown
    }
  }
  return payload.detail?.value
}

function formatSummary(data?: AdminCardBatchResult): string {
  if (!data) {
    return ''
  }
  const segments: string[] = []
  if (typeof data.scanned === 'number') {
    segments.push(`扫描 ${data.scanned}`)
  }
  if (typeof data.translated === 'number') {
    segments.push(`翻译 ${data.translated}`)
  }
  if (typeof data.generated === 'number') {
    segments.push(`生成 ${data.generated}`)
  }
  if (typeof data.skipped === 'number') {
    segments.push(`跳过 ${data.skipped}`)
  }
  if (typeof data.failed === 'number') {
    segments.push(`失败 ${data.failed}`)
  }
  return segments.join(' / ')
}

/** 封装批处理配置页面逻辑 */
export function useAdminBatchRunnerPage() {
  const { statusBarHeight } = usePageLayout()
  const { runActionWithFeedback, runConfirmedAction } = useConfirmedAction()
  const action = ref<BatchActionType>('translate-zh-to-en')
  const running = ref(false)
  const revealSecrets = ref(false)
  const result = ref<AdminCardBatchResult | null>(null)
  const resultMessage = ref('')

  const credentials = reactive<AdminAliyunCredentials>({
    appKey: '',
    accessKeyId: '',
    accessKeySecret: '',
    nlsToken: '',
  })

  const params = reactive<BatchParamsForm>({
    ...DEFAULT_PARAMS,
  })

  const actionMeta = computed(() => ACTION_META[action.value])
  const isAudioAction = computed(() => action.value !== 'translate-zh-to-en')
  const resultSummary = computed(() => formatSummary(result.value || undefined))

  const actionTag = computed(() => {
    if (action.value === 'translate-zh-to-en') {
      return 'TRANSLATE'
    }
    if (action.value === 'generate-cn-audio') {
      return 'CN TTS'
    }
    return 'EN TTS'
  })

  function goBack() {
    navigateBack()
  }

  function applyCredentials(next: AdminAliyunCredentials | null) {
    credentials.appKey = safeText(next?.appKey)
    credentials.accessKeyId = safeText(next?.accessKeyId)
    credentials.accessKeySecret = safeText(next?.accessKeySecret)
    credentials.nlsToken = safeText(next?.nlsToken)
  }

  function loadCredentials() {
    const stored = readJsonStorage<AdminAliyunCredentials>(CREDENTIALS_STORAGE_KEY)
    applyCredentials(stored)
  }

  function loadActionParams(nextAction: BatchActionType) {
    const stored = readJsonStorage<BatchParamsForm>(ACTION_PARAMS_STORAGE_PREFIX + nextAction)
    params.limit = safeText(stored?.limit) || DEFAULT_PARAMS.limit
    params.startId = safeText(stored?.startId)
    params.onlyEnabled = stored?.onlyEnabled !== false
    params.overwrite = stored?.overwrite === true
  }

  function persistCredentials() {
    writeJsonStorage(CREDENTIALS_STORAGE_KEY, {
      appKey: safeText(credentials.appKey),
      accessKeyId: safeText(credentials.accessKeyId),
      accessKeySecret: safeText(credentials.accessKeySecret),
      nlsToken: safeText(credentials.nlsToken),
    })
  }

  function persistActionParams() {
    writeJsonStorage(ACTION_PARAMS_STORAGE_PREFIX + action.value, {
      limit: safeText(params.limit) || DEFAULT_PARAMS.limit,
      startId: safeText(params.startId),
      onlyEnabled: params.onlyEnabled,
      overwrite: params.overwrite,
    })
  }

  function normalizeCredentialsForPayload(): AdminAliyunCredentials | undefined {
    const normalized: AdminAliyunCredentials = {}
    if (hasText(credentials.appKey)) {
      normalized.appKey = safeText(credentials.appKey)
    }
    if (hasText(credentials.accessKeyId)) {
      normalized.accessKeyId = safeText(credentials.accessKeyId)
    }
    if (hasText(credentials.accessKeySecret)) {
      normalized.accessKeySecret = safeText(credentials.accessKeySecret)
    }
    if (hasText(credentials.nlsToken)) {
      normalized.nlsToken = safeText(credentials.nlsToken)
    }
    if (Object.keys(normalized).length === 0) {
      return undefined
    }
    return normalized
  }

  function buildBatchPayload(): (AdminCardBatchRequest & { autoTranslate?: boolean }) | null {
    const limit = parseUnsignedInteger(safeText(params.limit))
    if (limit === null || limit < 1 || limit > 1000) {
      showToast('limit 必须是 1-1000 的整数')
      return null
    }

    let startId: number | undefined
    const startIdRaw = safeText(params.startId)
    if (startIdRaw) {
      const parsedStartId = parseUnsignedInteger(startIdRaw)
      if (parsedStartId === null || parsedStartId < 1) {
        showToast('startId 必须是大于 0 的整数')
        return null
      }
      startId = parsedStartId
    }

    const normalizedCredentials = normalizeCredentialsForPayload()
    const hasAk = hasText(normalizedCredentials?.accessKeyId) && hasText(normalizedCredentials?.accessKeySecret)
    const hasToken = hasText(normalizedCredentials?.nlsToken)
    const hasAppKey = hasText(normalizedCredentials?.appKey)

    if (action.value === 'translate-zh-to-en' && !hasAk) {
      showToast('中文转英文需要填写 AK 和 Secret')
      return null
    }

    if (action.value !== 'translate-zh-to-en') {
      if (!hasAppKey) {
        showToast('语音生成需要填写 AppKey')
        return null
      }
      if (!hasToken && !hasAk) {
        showToast('语音生成需要 Token 或 AK+Secret')
        return null
      }
    }

    return {
      overwrite: params.overwrite,
      limit,
      startId,
      onlyEnabled: params.onlyEnabled,
      credentials: normalizedCredentials,
    }
  }

  async function executeBatch(payload: AdminCardBatchRequest & { autoTranslate?: boolean }) {
    if (action.value === 'translate-zh-to-en') {
      return adminApi.translateCardZhToEn(payload)
    }
    if (action.value === 'generate-cn-audio') {
      return adminApi.generateCardCnAudio(payload)
    }
    return adminApi.generateCardEnAudio({
      ...payload,
      autoTranslate: false,
    })
  }

  async function submitBatch() {
    if (running.value) {
      return
    }

    const payload = buildBatchPayload()
    if (!payload) {
      return
    }

    persistCredentials()
    persistActionParams()

    running.value = true
    await runActionWithFeedback({
      loadingText: actionMeta.value.loadingText,
      errorText: actionMeta.value.errorText,
      execute: async () => assertApiSuccess(await executeBatch(payload), actionMeta.value.errorText),
      getSuccessMessage: (res) => {
        const summary = formatSummary(res.data)
        if (!summary) {
          return res.msg || actionMeta.value.fallbackSuccessText
        }
        return `${res.msg || actionMeta.value.fallbackSuccessText}（${summary}）`
      },
      onSuccess: async (res) => {
        result.value = res.data || null
        resultMessage.value = res.msg || actionMeta.value.fallbackSuccessText
      },
    })
    running.value = false
  }

  async function clearCredentials() {
    await runConfirmedAction({
      title: '确认清空凭据',
      content: '仅清除本机缓存，不会影响后端环境变量配置，确认继续吗？',
      loadingText: '清空中...',
      successText: '凭据已清空',
      errorText: '清空凭据失败',
      execute: async () => {
        uni.removeStorageSync(CREDENTIALS_STORAGE_KEY)
      },
      onSuccess: async () => {
        applyCredentials(null)
      },
    })
  }

  function handleCredentialInput(field: keyof AdminAliyunCredentials, event: Event) {
    credentials[field] = String(getEventValue(event) || '')
  }

  function handleLimitInput(event: Event) {
    params.limit = String(getEventValue(event) || '')
  }

  function handleStartIdInput(event: Event) {
    params.startId = String(getEventValue(event) || '')
  }

  function handleOnlyEnabledChange(event: Event) {
    params.onlyEnabled = Boolean(getEventValue(event))
  }

  function handleOverwriteChange(event: Event) {
    params.overwrite = Boolean(getEventValue(event))
  }

  function toggleSecretVisibility() {
    revealSecrets.value = !revealSecrets.value
  }

  onLoad((options) => {
    const rawAction = safeText(options?.action)
    if (!isBatchActionType(rawAction)) {
      showToast('无效的批处理动作')
      setTimeout(() => goBack(), 1200)
      return
    }

    action.value = rawAction
    loadCredentials()
    loadActionParams(rawAction)
  })

  return {
    actionMeta,
    actionTag,
    clearCredentials,
    credentials,
    goBack,
    handleCredentialInput,
    handleLimitInput,
    handleOnlyEnabledChange,
    handleOverwriteChange,
    handleStartIdInput,
    isAudioAction,
    params,
    revealSecrets,
    result,
    resultSummary,
    resultMessage,
    running,
    statusBarHeight,
    submitBatch,
    toggleSecretVisibility,
  }
}
