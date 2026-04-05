import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  adminApi,
  type AdminAliyunCredentials,
  type AdminCardBatchRequest,
  type AdminCardBatchResult,
  type AdminGamePromptAudioRequest,
  type AdminGamePromptTemplateItem,
  type Category,
} from '@/api'
import { useConfirmedAction } from '@/composables/useConfirmedAction'
import { usePageLayout } from '@/composables/usePageLayout'
import { assertApiSuccess, navigateBack, showToast } from '@/utils'

type BatchActionType =
  | 'translate-zh-to-en'
  | 'generate-cn-audio'
  | 'generate-en-audio'
  | 'generate-game-prompts'

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
  categoryId: string
  gameName: string
  template: string
  voice: string
  speechRate: string
  pitchRate: string
  volume: string
  format: string
  sampleRate: string
  emotionCategory: string
}

interface StoredBatchParams extends Partial<BatchParamsForm> {
  categoryTemplates?: Record<string, string>
}

const CREDENTIALS_STORAGE_KEY = 'ADMIN_BATCH_ALIYUN_CREDENTIALS_V1'
const ACTION_PARAMS_STORAGE_PREFIX = 'ADMIN_BATCH_PARAMS_V1_'
const DEFAULT_GAME_TEMPLATES = [
  '小朋友，请问下面哪一张是“%s”呢？',
  '请指出下面“%s”的图片。',
  '点一点“%s”吧。',
  '“%s”在哪里？请选出来。',
]

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
  'generate-game-prompts': {
    title: '生成游戏题干语音',
    subtitle: '按分类批量生成“哪一张是 xxx”题干语音，并上传到 OSS game 目录。',
    loadingText: '游戏题干语音生成中...',
    errorText: '游戏题干语音生成失败',
    fallbackSuccessText: '游戏题干语音生成完成',
    requirement: '需要 AppKey，且必须提供 Token 或 AK+Secret。',
  },
}

const DEFAULT_PARAMS: BatchParamsForm = {
  limit: '100',
  startId: '',
  onlyEnabled: true,
  overwrite: false,
  categoryId: '',
  gameName: 'listen-pick',
  template: DEFAULT_GAME_TEMPLATES.join('\n'),
  voice: 'zhibei_emo',
  speechRate: '46',
  pitchRate: '0',
  volume: '100',
  format: 'mp3',
  sampleRate: '16000',
  emotionCategory: 'happy',
}

function isBatchActionType(value: unknown): value is BatchActionType {
  return value === 'translate-zh-to-en'
    || value === 'generate-cn-audio'
    || value === 'generate-en-audio'
    || value === 'generate-game-prompts'
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

function parseInteger(value: string): number | null {
  if (!/^-?\d+$/.test(value)) {
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

function parseTemplateItems(rawText: string): AdminGamePromptTemplateItem[] {
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  const deduped = Array.from(new Set(lines))
  return deduped.map((text, index) => ({
    templateId: `t${index + 1}`,
    templateText: text,
  }))
}

function normalizeCategoryTemplates(raw?: Record<string, string> | null) {
  const normalized: Record<string, string> = {}
  for (const [categoryId, template] of Object.entries(raw || {})) {
    const key = safeText(categoryId)
    const value = safeText(template)
    if (!key || !value || value === DEFAULT_PARAMS.template) {
      continue
    }
    normalized[key] = value
  }
  return normalized
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
  const categories = ref<Category[]>([])
  const categoriesLoading = ref(false)
  const gamePromptCategoryTemplates = ref<Record<string, string>>({})

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
  const isGamePromptAction = computed(() => action.value === 'generate-game-prompts')
  const resultSummary = computed(() => formatSummary(result.value || undefined))

  const categoryOptions = computed(() =>
    categories.value
      .filter(item => hasText(item?._id) && hasText(item?.name))
      .map(item => ({ id: String(item._id), name: String(item.name) })),
  )

  const categoryPickerIndex = computed(() => {
    const idx = categoryOptions.value.findIndex(item => item.id === params.categoryId)
    return idx >= 0 ? idx : 0
  })

  const selectedCategoryName = computed(() => {
    const selected = categoryOptions.value.find(item => item.id === params.categoryId)
    return selected?.name || ''
  })

  const actionTag = computed(() => {
    if (action.value === 'translate-zh-to-en') {
      return 'TRANSLATE'
    }
    if (action.value === 'generate-cn-audio') {
      return 'CN TTS'
    }
    if (action.value === 'generate-en-audio') {
      return 'EN TTS'
    }
    return 'GAME TTS'
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

  function resolveStoredTemplate(categoryId: string, fallback?: string) {
    const key = safeText(categoryId)
    if (key && hasText(gamePromptCategoryTemplates.value[key])) {
      return safeText(gamePromptCategoryTemplates.value[key])
    }
    return safeText(fallback) || DEFAULT_PARAMS.template
  }

  function syncCurrentCategoryTemplate() {
    if (!isGamePromptAction.value) {
      return
    }
    const key = safeText(params.categoryId)
    if (!key) {
      return
    }
    const nextValue = safeText(params.template)
    const nextTemplates = { ...gamePromptCategoryTemplates.value }
    if (!nextValue || nextValue === DEFAULT_PARAMS.template) {
      delete nextTemplates[key]
    } else {
      nextTemplates[key] = nextValue
    }
    gamePromptCategoryTemplates.value = nextTemplates
  }

  function applyCategoryTemplate(categoryId: string, fallback?: string) {
    params.template = resolveStoredTemplate(categoryId, fallback)
  }

  function loadActionParams(nextAction: BatchActionType) {
    const stored = readJsonStorage<StoredBatchParams>(ACTION_PARAMS_STORAGE_PREFIX + nextAction)
    params.limit = safeText(stored?.limit) || DEFAULT_PARAMS.limit
    params.startId = safeText(stored?.startId)
    params.onlyEnabled = stored?.onlyEnabled !== false
    params.overwrite = stored?.overwrite === true

    params.categoryId = safeText(stored?.categoryId)
    params.gameName = safeText(stored?.gameName) || DEFAULT_PARAMS.gameName
    gamePromptCategoryTemplates.value = nextAction === 'generate-game-prompts'
      ? normalizeCategoryTemplates(stored?.categoryTemplates)
      : {}
    params.template = nextAction === 'generate-game-prompts'
      ? resolveStoredTemplate(params.categoryId, safeText(stored?.template))
      : safeText(stored?.template) || DEFAULT_PARAMS.template
    params.voice = safeText(stored?.voice) || DEFAULT_PARAMS.voice
    params.speechRate = safeText(stored?.speechRate) || DEFAULT_PARAMS.speechRate
    params.pitchRate = safeText(stored?.pitchRate) || DEFAULT_PARAMS.pitchRate
    params.volume = safeText(stored?.volume) || DEFAULT_PARAMS.volume
    params.format = safeText(stored?.format) || DEFAULT_PARAMS.format
    params.sampleRate = safeText(stored?.sampleRate) || DEFAULT_PARAMS.sampleRate
    params.emotionCategory = safeText(stored?.emotionCategory) || DEFAULT_PARAMS.emotionCategory
  }

  function persistCredentials() {
    writeJsonStorage(CREDENTIALS_STORAGE_KEY, {
      appKey: safeText(credentials.appKey),
      accessKeyId: safeText(credentials.accessKeyId),
      accessKeySecret: safeText(credentials.accessKeySecret),
      nlsToken: safeText(credentials.nlsToken),
    })
  }

  function persistActionParams(options: { syncCurrentTemplate?: boolean } = {}) {
    if (options.syncCurrentTemplate !== false) {
      syncCurrentCategoryTemplate()
    }
    writeJsonStorage(ACTION_PARAMS_STORAGE_PREFIX + action.value, {
      limit: safeText(params.limit) || DEFAULT_PARAMS.limit,
      startId: safeText(params.startId),
      onlyEnabled: params.onlyEnabled,
      overwrite: params.overwrite,
      categoryId: safeText(params.categoryId),
      gameName: safeText(params.gameName),
      template: safeText(params.template),
      voice: safeText(params.voice),
      speechRate: safeText(params.speechRate),
      pitchRate: safeText(params.pitchRate),
      volume: safeText(params.volume),
      format: safeText(params.format),
      sampleRate: safeText(params.sampleRate),
      emotionCategory: safeText(params.emotionCategory),
      categoryTemplates: isGamePromptAction.value ? { ...gamePromptCategoryTemplates.value } : undefined,
    })
  }

  async function loadCategories() {
    if (categoriesLoading.value) {
      return
    }

    categoriesLoading.value = true
    try {
      const res = assertApiSuccess(await adminApi.getCategoryList(), '加载分类失败')
      const list = Array.isArray(res.data) ? res.data : []
      categories.value = list
      if (!params.categoryId && list.length > 0) {
        params.categoryId = String(list[0]?._id || '')
      }
      if (params.categoryId) {
        const exists = list.some(item => String(item?._id || '') === params.categoryId)
        if (!exists && list.length > 0) {
          params.categoryId = String(list[0]?._id || '')
        }
      }
      if (isGamePromptAction.value) {
        applyCategoryTemplate(params.categoryId)
      }
    } catch {
      categories.value = []
      if (isGamePromptAction.value) {
        showToast('加载分类失败，请稍后重试')
      }
    } finally {
      categoriesLoading.value = false
    }
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

  function buildBatchPayload(): (AdminCardBatchRequest & { autoTranslate?: boolean }) | AdminGamePromptAudioRequest | null {
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

    if (isAudioAction.value) {
      if (!hasAppKey) {
        showToast('语音生成需要填写 AppKey')
        return null
      }
      if (!hasToken && !hasAk) {
        showToast('语音生成需要 Token 或 AK+Secret')
        return null
      }
    }

    const commonPayload: AdminCardBatchRequest = {
      overwrite: params.overwrite,
      limit,
      startId,
      onlyEnabled: params.onlyEnabled,
      credentials: normalizedCredentials,
    }

    if (action.value !== 'generate-game-prompts') {
      return commonPayload
    }

    const categoryId = parseUnsignedInteger(safeText(params.categoryId))
    if (!categoryId || categoryId < 1) {
      showToast('请选择要生成的分类')
      return null
    }

    const speechRate = parseInteger(safeText(params.speechRate))
    if (speechRate === null || speechRate < -500 || speechRate > 500) {
      showToast('语速范围必须是 -500 到 500')
      return null
    }

    const pitchRate = parseInteger(safeText(params.pitchRate))
    if (pitchRate === null || pitchRate < -500 || pitchRate > 500) {
      showToast('语调范围必须是 -500 到 500')
      return null
    }

    const volume = parseUnsignedInteger(safeText(params.volume))
    if (volume === null || volume < 0 || volume > 100) {
      showToast('音量范围必须是 0 到 100')
      return null
    }

    const sampleRate = parseUnsignedInteger(safeText(params.sampleRate))
    if (sampleRate !== 8000 && sampleRate !== 16000 && sampleRate !== 24000 && sampleRate !== 48000) {
      showToast('采样率仅支持 8000 / 16000 / 24000 / 48000')
      return null
    }

    const format = safeText(params.format).toLowerCase()
    if (format !== 'mp3' && format !== 'wav' && format !== 'pcm') {
      showToast('格式仅支持 mp3 / wav / pcm')
      return null
    }

    const voice = safeText(params.voice) || DEFAULT_PARAMS.voice
    const gameName = safeText(params.gameName) || DEFAULT_PARAMS.gameName
    const templateTextRaw = safeText(params.template) || DEFAULT_PARAMS.template
    const templates = parseTemplateItems(templateTextRaw)
    if (templates.length === 0) {
      showToast('请至少填写 1 条模板（每行一条）')
      return null
    }
    const emotionCategory = safeText(params.emotionCategory) || DEFAULT_PARAMS.emotionCategory

    const gamePayload: AdminGamePromptAudioRequest = {
      ...commonPayload,
      categoryId,
      gameName,
      template: templates[0]?.templateText || DEFAULT_GAME_TEMPLATES[0],
      templates,
      voice,
      speechRate,
      pitchRate,
      volume,
      sampleRate,
      format: format as 'mp3' | 'wav' | 'pcm',
      emotionCategory,
    }

    return gamePayload
  }

  async function executeBatch(payload: (AdminCardBatchRequest & { autoTranslate?: boolean }) | AdminGamePromptAudioRequest) {
    if (action.value === 'translate-zh-to-en') {
      return adminApi.translateCardZhToEn(payload as AdminCardBatchRequest)
    }
    if (action.value === 'generate-cn-audio') {
      return adminApi.generateCardCnAudio(payload as AdminCardBatchRequest)
    }
    if (action.value === 'generate-en-audio') {
      return adminApi.generateCardEnAudio({
        ...(payload as AdminCardBatchRequest),
        autoTranslate: false,
      })
    }
    return adminApi.generateGamePromptAudio(payload as AdminGamePromptAudioRequest)
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

  function handleGameParamInput(field: keyof Pick<BatchParamsForm,
    'gameName' | 'template' | 'voice' | 'speechRate' | 'pitchRate' | 'volume' | 'format' | 'sampleRate' | 'emotionCategory'>,
    event: Event,
  ) {
    params[field] = String(getEventValue(event) || '')
    if (field === 'template') {
      syncCurrentCategoryTemplate()
      persistActionParams({ syncCurrentTemplate: false })
    }
  }

  function handleCategoryChange(event: Event) {
    const rawIndex = Number(getEventValue(event))
    if (!Number.isInteger(rawIndex) || rawIndex < 0 || rawIndex >= categoryOptions.value.length) {
      return
    }
    syncCurrentCategoryTemplate()
    params.categoryId = categoryOptions.value[rawIndex]?.id || ''
    applyCategoryTemplate(params.categoryId)
    persistActionParams({ syncCurrentTemplate: false })
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
    if (rawAction === 'generate-game-prompts') {
      void loadCategories()
    }
  })

  return {
    actionMeta,
    actionTag,
    categoriesLoading,
    categoryOptions,
    categoryPickerIndex,
    clearCredentials,
    credentials,
    goBack,
    handleCategoryChange,
    handleCredentialInput,
    handleGameParamInput,
    handleLimitInput,
    handleOnlyEnabledChange,
    handleOverwriteChange,
    handleStartIdInput,
    isAudioAction,
    isGamePromptAction,
    params,
    revealSecrets,
    result,
    resultSummary,
    resultMessage,
    running,
    selectedCategoryName,
    statusBarHeight,
    submitBatch,
    toggleSecretVisibility,
  }
}
