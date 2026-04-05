import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  adminApi,
  type AdminDisplayConfigPayload,
  type FeedbackAudioItem,
  type DisplayConfigResult,
  type DisplayGameConfig,
  type DisplayGameLaunchMode,
  type DisplayGameTone,
  type ListenPickFeedbackTtsConfig,
} from '@/api'
import { uploadApiFile } from '@/api/shared'
import { usePageLayout } from '@/composables/usePageLayout'
import {
  countGeneratedFeedbackAudios,
  DEFAULT_LISTEN_PICK_CORRECT_TEXTS,
  DEFAULT_LISTEN_PICK_FEEDBACK_TTS,
  DEFAULT_LISTEN_PICK_WRONG_TEXTS,
  feedbackTextsToTextarea,
  normalizeListenPickFeedbackConfig,
  normalizeListenPickFeedbackTtsConfig,
  parseFeedbackTextarea,
} from '@/config/listen-pick-feedback'
import { getErrorMessage, hideLoading, navigateBack, showLoading, showToast } from '@/utils'

const GAME_KEY_PATTERN = /^[a-z0-9-]{2,32}$/

const TONE_OPTIONS: Array<{ label: string; value: DisplayGameTone }> = [
  { label: '金色 (gold)', value: 'gold' },
  { label: '蓝色 (blue)', value: 'blue' },
  { label: '绿色 (green)', value: 'green' },
  { label: '粉色 (pink)', value: 'pink' },
  { label: '紫色 (purple)', value: 'purple' },
  { label: '青色 (teal)', value: 'teal' },
]

const LAUNCH_MODE_OPTIONS: Array<{ label: string; value: DisplayGameLaunchMode }> = [
  { label: '先选分类再进入 (listen-pick-category)', value: 'listen-pick-category' },
  { label: '直接跳转 (direct)', value: 'direct' },
]

const VALID_TONES = new Set<DisplayGameTone>(TONE_OPTIONS.map((item) => item.value))
const VALID_LAUNCH_MODES = new Set<DisplayGameLaunchMode>(LAUNCH_MODE_OPTIONS.map((item) => item.value))

type ValueEvent = Event | { detail?: { value?: unknown } }
type UploadField = 'icon' | 'cover'

interface GameForm {
  _id?: string
  key: string
  title: string
  desc: string
  icon: string
  cover: string
  entryTag: string
  tone: DisplayGameTone
  routePath: string
  launchMode: DisplayGameLaunchMode
  available: boolean
  enabled: boolean
  sortOrder: number
  listenPickFeedback: {
    autoNextOnCorrect: boolean
    correctTextArea: string
    wrongTextArea: string
    tts: {
      voice: string
      speechRate: string
      pitchRate: string
      volume: string
      format: string
      sampleRate: string
      emotionCategory: string
    }
    correctAudios: FeedbackAudioItem[]
    wrongAudios: FeedbackAudioItem[]
  }
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function readEventValue(event: ValueEvent) {
  if (event && typeof event === 'object' && 'detail' in event) {
    return event.detail?.value
  }
  return undefined
}

function normalizeSort(value: unknown, fallback = 0) {
  const raw = value === null || value === undefined ? '' : value
  const parsed = Number.parseInt(String(raw), 10)
  if (Number.isNaN(parsed)) {
    return fallback
  }
  return parsed
}

function parseIntegerInput(value: string) {
  if (!/^-?\d+$/.test(value)) {
    return null
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function parseUnsignedIntegerInput(value: string) {
  if (!/^\d+$/.test(value)) {
    return null
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function toFeedbackTtsForm(tts: ListenPickFeedbackTtsConfig) {
  return {
    voice: normalizeText(tts.voice),
    speechRate: String(tts.speechRate),
    pitchRate: String(tts.pitchRate),
    volume: String(tts.volume),
    format: normalizeText(tts.format) || DEFAULT_LISTEN_PICK_FEEDBACK_TTS.format,
    sampleRate: String(tts.sampleRate),
    emotionCategory: normalizeText(tts.emotionCategory),
  }
}

function normalizeTone(value: unknown): DisplayGameTone {
  const tone = normalizeText(value) as DisplayGameTone
  if (VALID_TONES.has(tone)) {
    return tone
  }
  return 'blue'
}

function normalizeLaunchMode(value: unknown): DisplayGameLaunchMode {
  const launchMode = normalizeText(value) as DisplayGameLaunchMode
  if (VALID_LAUNCH_MODES.has(launchMode)) {
    return launchMode
  }
  return 'direct'
}

function toGameForm(item: DisplayGameConfig, index: number): GameForm {
  const launchMode = normalizeLaunchMode(item.launchMode)
  const defaultRoutePath = launchMode === 'listen-pick-category'
    ? '/pages/game/listen-pick'
    : '/pages/game/coming-soon'
  const feedbackConfig = normalizeListenPickFeedbackConfig(item.listenPickFeedback)

  return {
    _id: normalizeText(item._id),
    key: normalizeText(item.key),
    title: normalizeText(item.title),
    desc: normalizeText(item.desc),
    icon: normalizeText(item.icon),
    cover: normalizeText(item.cover),
    entryTag: normalizeText(item.entryTag),
    tone: normalizeTone(item.tone),
    routePath: normalizeText(item.routePath) || defaultRoutePath,
    launchMode,
    available: Boolean(item.available),
    enabled: item.enabled !== false,
    sortOrder: normalizeSort(item.sortOrder, (index + 1) * 10),
    listenPickFeedback: {
      autoNextOnCorrect: feedbackConfig.autoNextOnCorrect,
      correctTextArea: feedbackTextsToTextarea(feedbackConfig.correctTexts),
      wrongTextArea: feedbackTextsToTextarea(feedbackConfig.wrongTexts),
      tts: toFeedbackTtsForm(feedbackConfig.tts),
      correctAudios: [...feedbackConfig.correctAudios],
      wrongAudios: [...feedbackConfig.wrongAudios],
    },
  }
}

function cloneGameForms(games: GameForm[]) {
  return games.map((item) => ({ ...item }))
}

export function useAdminDisplayConfigPage() {
  const { statusBarHeight } = usePageLayout()
  const loading = ref(true)
  const saving = ref(false)
  const uploading = ref(false)

  const miniAppIcon = ref('')
  const gameForms = ref<GameForm[]>([])
  const lastSavedSnapshot = ref('')

  const toneRange = TONE_OPTIONS.map((item) => item.label)
  const launchModeRange = LAUNCH_MODE_OPTIONS.map((item) => item.label)

  const previewLogo = computed(() => miniAppIcon.value)
  const enabledGameCount = computed(() => gameForms.value.filter((item) => item.enabled).length)
  const hasPendingChanges = computed(() => JSON.stringify(buildPayload()) !== lastSavedSnapshot.value)

  function toneIndexOf(value: DisplayGameTone) {
    for (let i = 0; i < TONE_OPTIONS.length; i += 1) {
      if (TONE_OPTIONS[i]?.value === value) {
        return i
      }
    }
    return 0
  }

  function launchModeIndexOf(value: DisplayGameLaunchMode) {
    for (let i = 0; i < LAUNCH_MODE_OPTIONS.length; i += 1) {
      if (LAUNCH_MODE_OPTIONS[i]?.value === value) {
        return i
      }
    }
    return 0
  }

  function resolveToneLabel(value: DisplayGameTone) {
    return TONE_OPTIONS[toneIndexOf(value)]?.label || value
  }

  function resolveLaunchModeLabel(value: DisplayGameLaunchMode) {
    return LAUNCH_MODE_OPTIONS[launchModeIndexOf(value)]?.label || value
  }

  function goBack() {
    navigateBack()
  }

  function rememberSnapshot(payload: AdminDisplayConfigPayload) {
    lastSavedSnapshot.value = JSON.stringify(payload)
  }

  function generateNextGameKey() {
    const used = new Set(gameForms.value.map((item) => item.key))
    let index = gameForms.value.length + 1
    let candidate = `game-${index}`
    while (used.has(candidate)) {
      index += 1
      candidate = `game-${index}`
    }
    return candidate
  }

  function buildPayload(): AdminDisplayConfigPayload {
    return {
      miniApp: {
        icon: normalizeText(miniAppIcon.value),
      },
      games: cloneGameForms(gameForms.value).map((item) => ({
        _id: normalizeText(item._id) || undefined,
        key: normalizeText(item.key),
        title: normalizeText(item.title),
        desc: normalizeText(item.desc),
        icon: normalizeText(item.icon),
        cover: normalizeText(item.cover),
        entryTag: normalizeText(item.entryTag),
        tone: normalizeTone(item.tone),
        routePath: normalizeText(item.routePath),
        launchMode: normalizeLaunchMode(item.launchMode),
        available: Boolean(item.available),
        enabled: Boolean(item.enabled),
        sortOrder: normalizeSort(item.sortOrder),
        listenPickFeedback: normalizeText(item.key) === 'listen-pick'
          ? {
              autoNextOnCorrect: item.listenPickFeedback.autoNextOnCorrect !== false,
              correctTexts: parseFeedbackTextarea(
                item.listenPickFeedback.correctTextArea,
                DEFAULT_LISTEN_PICK_CORRECT_TEXTS,
              ),
              wrongTexts: parseFeedbackTextarea(
                item.listenPickFeedback.wrongTextArea,
                DEFAULT_LISTEN_PICK_WRONG_TEXTS,
              ),
              tts: normalizeListenPickFeedbackTtsConfig(item.listenPickFeedback.tts),
              correctAudios: item.listenPickFeedback.correctAudios,
              wrongAudios: item.listenPickFeedback.wrongAudios,
            }
          : undefined,
      })),
    }
  }

  function applyDisplayConfig(data?: DisplayConfigResult) {
    miniAppIcon.value = normalizeText(data?.miniApp?.icon)

    const sourceGames = Array.isArray(data?.games) ? (data?.games || []) : []
    const mappedGames = sourceGames
      .map(toGameForm)
      .sort((left, right) => left.sortOrder - right.sortOrder)

    gameForms.value = mappedGames
    rememberSnapshot(buildPayload())
  }

  async function loadDisplayConfig() {
    loading.value = true

    try {
      const res = await adminApi.getDisplayConfig()
      if (res.code !== 0) {
        showToast(res.msg || '加载展示配置失败')
        applyDisplayConfig({
          miniApp: { icon: '' },
          games: [],
        })
        return
      }
      applyDisplayConfig(res.data)
    } catch (error) {
      showToast(getErrorMessage(error, '加载展示配置失败'))
      applyDisplayConfig({
        miniApp: { icon: '' },
        games: [],
      })
    } finally {
      loading.value = false
    }
  }

  function addGame() {
    const nextSort = gameForms.value.length > 0
      ? Math.max(...gameForms.value.map((item) => item.sortOrder)) + 10
      : 10

    gameForms.value.push({
      _id: '',
      key: generateNextGameKey(),
      title: '新游戏',
      desc: '',
      icon: '',
      cover: '',
      entryTag: '',
      tone: 'blue',
      routePath: '/pages/game/coming-soon',
      launchMode: 'direct',
      available: false,
      enabled: true,
      sortOrder: nextSort,
      listenPickFeedback: {
        autoNextOnCorrect: true,
        correctTextArea: feedbackTextsToTextarea(DEFAULT_LISTEN_PICK_CORRECT_TEXTS),
        wrongTextArea: feedbackTextsToTextarea(DEFAULT_LISTEN_PICK_WRONG_TEXTS),
        tts: toFeedbackTtsForm(DEFAULT_LISTEN_PICK_FEEDBACK_TTS),
        correctAudios: [],
        wrongAudios: [],
      },
    })
  }

  function removeGame(index: number) {
    gameForms.value = gameForms.value.filter((_, itemIndex) => itemIndex !== index)
  }

  function patchGame(index: number, patch: Partial<GameForm>) {
    gameForms.value = gameForms.value.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            ...patch,
          }
        : item,
    )
  }

  function handleMiniAppIconInput(event: ValueEvent) {
    miniAppIcon.value = String(readEventValue(event) || '')
  }

  function clearMiniAppIcon() {
    miniAppIcon.value = ''
  }

  function handleGameTextInput(index: number, field: keyof Pick<GameForm, 'key' | 'title' | 'desc' | 'icon' | 'cover' | 'entryTag' | 'routePath'>, event: ValueEvent) {
    patchGame(index, {
      [field]: String(readEventValue(event) || ''),
    })
  }

  function handleGameSortInput(index: number, event: ValueEvent) {
    patchGame(index, {
      sortOrder: normalizeSort(readEventValue(event), 0),
    })
  }

  function handleGameSwitchChange(index: number, field: 'available' | 'enabled', event: ValueEvent) {
    patchGame(index, {
      [field]: Boolean(readEventValue(event)),
    })
  }

  function handleToneChange(index: number, event: ValueEvent) {
    const selectedIndex = normalizeSort(readEventValue(event), 0)
    const selectedTone = TONE_OPTIONS[selectedIndex]?.value || 'blue'
    patchGame(index, {
      tone: selectedTone,
    })
  }

  function handleLaunchModeChange(index: number, event: ValueEvent) {
    const selectedIndex = normalizeSort(readEventValue(event), 0)
    const selectedMode = LAUNCH_MODE_OPTIONS[selectedIndex]?.value || 'direct'

    patchGame(index, {
      launchMode: selectedMode,
      routePath: selectedMode === 'listen-pick-category'
        ? '/pages/game/listen-pick'
        : gameForms.value[index]?.routePath || '/pages/game/coming-soon',
    })
  }

  function patchFeedback(
    index: number,
    patch: Partial<GameForm['listenPickFeedback']>,
  ) {
    const current = gameForms.value[index]
    if (!current) {
      return
    }

    patchGame(index, {
      listenPickFeedback: {
        ...current.listenPickFeedback,
        ...patch,
      },
    })
  }

  function handleListenPickFeedbackInput(
    index: number,
    field: 'correctTextArea' | 'wrongTextArea',
    event: ValueEvent,
  ) {
    patchFeedback(index, {
      [field]: String(readEventValue(event) || ''),
    })
  }

  function handleListenPickAutoNextChange(index: number, event: ValueEvent) {
    patchFeedback(index, {
      autoNextOnCorrect: Boolean(readEventValue(event)),
    })
  }

  function handleListenPickTtsInput(
    index: number,
    field: keyof GameForm['listenPickFeedback']['tts'],
    event: ValueEvent,
  ) {
    const current = gameForms.value[index]
    if (!current) {
      return
    }

    patchFeedback(index, {
      tts: {
        ...current.listenPickFeedback.tts,
        [field]: String(readEventValue(event) || ''),
      },
    })
  }

  async function chooseImageFile() {
    const result = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject,
      })
    })
    return result.tempFilePaths?.[0] || ''
  }

  async function uploadImage(filePath: string, folder: string) {
    const result = await uploadApiFile(filePath, { folder })
    if (result.code !== 0) {
      throw new Error(result.msg || '上传图片失败')
    }

    const uploadedUrl = normalizeText(result.data?.url || result.data?.path)
    if (!uploadedUrl) {
      throw new Error('上传图片失败')
    }

    return uploadedUrl
  }

  function isCancelledAction(error: unknown) {
    return getErrorMessage(error).toLowerCase().includes('cancel')
  }

  async function uploadMiniAppLogo() {
    if (uploading.value) {
      return
    }

    let loadingShown = false
    try {
      const filePath = await chooseImageFile()
      if (!filePath) {
        return
      }

      uploading.value = true
      showLoading('上传 Logo 中...')
      loadingShown = true

      miniAppIcon.value = await uploadImage(filePath, 'display/logo')
      showToast('Logo 上传成功', 'success')
    } catch (error) {
      if (!isCancelledAction(error)) {
        showToast(getErrorMessage(error, 'Logo 上传失败'))
      }
    } finally {
      if (loadingShown) {
        hideLoading()
      }
      uploading.value = false
    }
  }

  async function uploadGameMedia(index: number, field: UploadField) {
    if (uploading.value) {
      return
    }

    const game = gameForms.value[index]
    if (!game) {
      return
    }

    let loadingShown = false
    try {
      const filePath = await chooseImageFile()
      if (!filePath) {
        return
      }

      uploading.value = true
      showLoading('上传图片中...')
      loadingShown = true

      const folder = `display/games/${normalizeText(game.key) || 'new'}/${field}`
      const uploadedUrl = await uploadImage(filePath, folder)
      patchGame(index, {
        [field]: uploadedUrl,
      })
      showToast('图片上传成功', 'success')
    } catch (error) {
      if (!isCancelledAction(error)) {
        showToast(getErrorMessage(error, '图片上传失败'))
      }
    } finally {
      if (loadingShown) {
        hideLoading()
      }
      uploading.value = false
    }
  }

  function validatePayload(payload: AdminDisplayConfigPayload) {
    const seenKeys = new Set<string>()

    for (let index = 0; index < payload.games.length; index += 1) {
      const game = payload.games[index]
      if (!GAME_KEY_PATTERN.test(game.key)) {
        showToast(`游戏 key 不合法: ${game.key || '(空)'}`)
        return false
      }
      if (seenKeys.has(game.key)) {
        showToast(`游戏 key 重复: ${game.key}`)
        return false
      }
      seenKeys.add(game.key)

      if (!game.title) {
        showToast(`游戏 ${game.key} 缺少标题`)
        return false
      }
      if (!game.routePath.startsWith('/pages/')) {
        showToast(`游戏 ${game.key} 路径必须以 /pages/ 开头`)
        return false
      }
      if (!VALID_LAUNCH_MODES.has(game.launchMode)) {
        showToast(`游戏 ${game.key} 启动模式不支持`)
        return false
      }
      if (!VALID_TONES.has(game.tone)) {
        showToast(`游戏 ${game.key} 色调不支持`)
        return false
      }

      const form = gameForms.value[index]
      if (game.key === 'listen-pick' && form && !validateListenPickFeedbackTts(game.key, form.listenPickFeedback.tts)) {
        return false
      }
    }

    return true
  }

  function validateListenPickFeedbackTts(
    gameKey: string,
    tts: GameForm['listenPickFeedback']['tts'],
  ) {
    const voice = normalizeText(tts.voice)
    if (!voice) {
      showToast(`游戏 ${gameKey} 的反馈语音音色不能为空`)
      return false
    }

    const speechRate = parseIntegerInput(normalizeText(tts.speechRate))
    if (speechRate === null || speechRate < -500 || speechRate > 500) {
      showToast(`游戏 ${gameKey} 的反馈语音语速范围必须是 -500 到 500`)
      return false
    }

    const pitchRate = parseIntegerInput(normalizeText(tts.pitchRate))
    if (pitchRate === null || pitchRate < -500 || pitchRate > 500) {
      showToast(`游戏 ${gameKey} 的反馈语调范围必须是 -500 到 500`)
      return false
    }

    const volume = parseUnsignedIntegerInput(normalizeText(tts.volume))
    if (volume === null || volume < 0 || volume > 100) {
      showToast(`游戏 ${gameKey} 的反馈音量范围必须是 0 到 100`)
      return false
    }

    const sampleRate = parseUnsignedIntegerInput(normalizeText(tts.sampleRate))
    if (sampleRate !== 8000 && sampleRate !== 16000 && sampleRate !== 24000 && sampleRate !== 48000) {
      showToast(`游戏 ${gameKey} 的反馈采样率仅支持 8000 / 16000 / 24000 / 48000`)
      return false
    }

    const format = normalizeText(tts.format).toLowerCase()
    if (format !== 'mp3' && format !== 'wav' && format !== 'pcm') {
      showToast(`游戏 ${gameKey} 的反馈格式仅支持 mp3 / wav / pcm`)
      return false
    }

    const emotionCategory = normalizeText(tts.emotionCategory)
    if (emotionCategory.length > 32) {
      showToast(`游戏 ${gameKey} 的反馈情感不能超过 32 个字符`)
      return false
    }

    return true
  }

  async function saveDisplayConfig() {
    if (saving.value) {
      return
    }

    const payload = buildPayload()
    if (!validatePayload(payload)) {
      return
    }

    saving.value = true

    try {
      const res = await adminApi.saveDisplayConfig(payload)
      if (res.code !== 0) {
        showToast(res.msg || '保存展示配置失败')
        return
      }

      applyDisplayConfig(res.data)
      showToast(res.msg || '展示配置已保存', 'success')
    } catch (error) {
      showToast(getErrorMessage(error, '保存展示配置失败'))
    } finally {
      saving.value = false
    }
  }

  onShow(() => {
    void loadDisplayConfig()
  })

  return {
    countGeneratedFeedbackAudios,
    enabledGameCount,
    gameForms,
    goBack,
    handleGameSortInput,
    handleGameSwitchChange,
    handleGameTextInput,
    handleListenPickAutoNextChange,
    handleListenPickFeedbackInput,
    handleListenPickTtsInput,
    handleLaunchModeChange,
    handleMiniAppIconInput,
    handleToneChange,
    hasPendingChanges,
    launchModeRange,
    launchModeOptions: LAUNCH_MODE_OPTIONS,
    loading,
    miniAppIcon,
    previewLogo,
    removeGame,
    saveDisplayConfig,
    saving,
    statusBarHeight,
    toneRange,
    toneIndexOf,
    toneOptions: TONE_OPTIONS,
    uploading,
    uploadGameMedia,
    uploadMiniAppLogo,
    addGame,
    clearMiniAppIcon,
    launchModeIndexOf,
    resolveLaunchModeLabel,
    resolveToneLabel,
  }
}
