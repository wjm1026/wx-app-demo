import { computed, onBeforeUnmount, reactive, toRefs } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { cardApi, pointsApi } from '@/api'
import {
  getErrorMessage,
  getStatusBarHeight,
  getSafeAreaBottom,
  navigateBack,
  showToast,
  switchTab,
} from '@/utils'
import {
  applyTemplate,
  buildSessionTargetQueue,
  CARD_MAX_PAGES,
  CARD_PAGE_SIZE,
  decodeQueryValue,
  DEFAULT_AUDIO_FORMAT,
  DEFAULT_GAME_NAME,
  DEFAULT_TEMPLATE,
  detectAudioBaseFromCards,
  FALLBACK_CATEGORY_KEYWORD,
  FALLBACK_CATEGORY_NAME,
  GAME_TEMPLATES,
  normalizeBaseUrl,
  pickRandom,
  sanitizePathSegment,
  shuffleArray,
  toGameCard,
  type AudioFormat,
  type GameCard,
  type GameTemplate,
  type ListenPickQuery,
} from './listen-pick.shared'
import { useListenPickAudio } from './useListenPickAudio'

const configuredGameAudioBase = normalizeBaseUrl(import.meta.env?.VITE_GAME_AUDIO_BASE_URL)

const NEXT_BUTTON_ACTIVE_MS = 240
const SHAKE_DURATION_MS = 420

/** 听音选图页主 Hook：负责数据加载、回合编排、交互状态和生命周期清理。 */
export function useListenPickPage() {
  // 会话进度状态
  const progressState = reactive({
    round: 1,
    streak: 0,
    score: 0,
    totalRounds: 0,
    remainingTargetIds: [] as string[],
  })

  // 当前回合与卡片状态
  const boardState = reactive({
    allCards: [] as GameCard[],
    roundCards: [] as GameCard[],
    targetCardId: '',
    selectedCardId: '',
    shakingCardId: '',
    currentTemplateId: DEFAULT_TEMPLATE.templateId,
    currentTemplateText: DEFAULT_TEMPLATE.templateText,
    lastTemplateId: '',
  })

  // 页面运行时状态
  const runtimeState = reactive({
    isLoading: true,
    loadError: '',
    fireworksKey: 1,
    isNextPressed: false,
  })

  // 页面配置状态（query + 自动探测）
  const configState = reactive({
    gameName: DEFAULT_GAME_NAME,
    audioFormat: DEFAULT_AUDIO_FORMAT as AudioFormat,
    categoryId: '',
    categoryName: FALLBACK_CATEGORY_NAME,
    categoryKeyword: FALLBACK_CATEGORY_KEYWORD,
    detectedAudioBase: '',
  })

  const { round, streak, score, totalRounds, remainingTargetIds } = toRefs(progressState)
  const {
    allCards,
    roundCards,
    targetCardId,
    selectedCardId,
    shakingCardId,
    currentTemplateId,
    currentTemplateText,
    lastTemplateId,
  } = toRefs(boardState)
  const { isLoading, loadError, fireworksKey, isNextPressed } = toRefs(runtimeState)
  const { gameName, audioFormat, categoryId, categoryName, categoryKeyword, detectedAudioBase } =
    toRefs(configState)

  let shakeTimer: ReturnType<typeof setTimeout> | null = null
  let nextPressTimer: ReturnType<typeof setTimeout> | null = null
  let sessionRoundKey = ''

  const stageStyle = computed<Record<string, string>>(() => {
    const topInset = getStatusBarHeight() + uni.upx2px(8)
    const bottomInset = getSafeAreaBottom() + uni.upx2px(40)

    return {
      paddingTop: `${topInset}px`,
      paddingBottom: `${bottomInset}px`,
    }
  })

  const targetCard = computed(() => roundCards.value.find((item) => item.id === targetCardId.value) || null)
  const isSuccess = computed(() => !!selectedCardId.value && selectedCardId.value === targetCardId.value)
  const canPlayRound = computed(
    () => !isLoading.value && !loadError.value && roundCards.value.length === 2 && !!targetCard.value,
  )
  const shouldShowReloadAction = computed(
    () => !isLoading.value && (!!loadError.value || allCards.value.length < 2),
  )
  const isNextActionEnabled = computed(() => isSuccess.value || shouldShowReloadAction.value)
  const isSessionComplete = computed(() => isSuccess.value && remainingTargetIds.value.length <= 0)

  const effectiveAudioBase = computed(() => configuredGameAudioBase || detectedAudioBase.value)

  const questionText = computed(() => {
    if (isLoading.value) {
      return '正在准备题目...'
    }

    if (!targetCard.value) {
      return '当前分类还不能开始听音选图。'
    }

    return applyTemplate(currentTemplateText.value, targetCard.value.name)
  })

  const voiceLabel = computed(() => {
    if (totalRounds.value > 0) {
      return `语音提示 · ${categoryName.value} · 第 ${round.value}/${totalRounds.value} 关`
    }

    return `语音提示 · ${categoryName.value}`
  })

  const currentQuestionAudioSrc = computed(() => {
    if (!targetCardId.value || !currentTemplateId.value || !effectiveAudioBase.value) {
      return ''
    }

    const encodedGameName = encodeURIComponent(gameName.value)
    const encodedCardId = encodeURIComponent(targetCardId.value)
    const encodedTemplateId = encodeURIComponent(currentTemplateId.value)

    return `${effectiveAudioBase.value}/game/${encodedGameName}/${encodedCardId}/${encodedTemplateId}.${audioFormat.value}`
  })

  const {
    canReplayVoice,
    cleanup: cleanupAudio,
    isVoicePlaying,
    isVoicePressed,
    replayVoice,
    scheduleAutoPlay,
    stopQuestionAudio,
  } = useListenPickAudio(currentQuestionAudioSrc)

  const placeholderText = computed(() => {
    if (isLoading.value) {
      return '正在加载分类卡片...'
    }

    if (loadError.value) {
      return `加载失败：${loadError.value}`
    }

    return '当前分类至少需要 2 张卡片，才能开始听音选图。'
  })

  const replayButtonText = computed(() => (canReplayVoice.value ? '再听一遍' : '音频未就绪'))
  const nextButtonText = computed(() => {
    if (shouldShowReloadAction.value) {
      return '重新加载'
    }

    if (isSessionComplete.value) {
      return '返回游戏首页'
    }

    return '继续下一题'
  })

  const rewardText = computed(() => {
    const base = `本题 +10 分 · 连对 ${streak.value} 题 · 累计 ${score.value} 分`
    if (totalRounds.value <= 0) {
      return base
    }

    return `${base} · 进度 ${round.value}/${totalRounds.value}`
  })

  function clearShakeTimer() {
    if (!shakeTimer) {
      return
    }

    clearTimeout(shakeTimer)
    shakeTimer = null
  }

  function clearNextPressTimer() {
    if (!nextPressTimer) {
      return
    }

    clearTimeout(nextPressTimer)
    nextPressTimer = null
  }

  function clearTimers() {
    clearShakeTimer()
    clearNextPressTimer()
  }

  function resetRoundSelection() {
    selectedCardId.value = ''
    shakingCardId.value = ''
  }

  function resetRoundBoard() {
    roundCards.value = []
    targetCardId.value = ''
    resetRoundSelection()
  }

  function resetSessionState() {
    sessionRoundKey = ''

    round.value = 1
    streak.value = 0
    score.value = 0
    totalRounds.value = 0
    remainingTargetIds.value = []

    allCards.value = []
    resetRoundBoard()
    currentTemplateId.value = DEFAULT_TEMPLATE.templateId
    currentTemplateText.value = DEFAULT_TEMPLATE.templateText
    lastTemplateId.value = ''

    loadError.value = ''
    detectedAudioBase.value = ''
  }

  function handleReplayVoice(options: { silentWhenMissing?: boolean } = {}) {
    replayVoice(options)
  }

  function resolveCardClass(cardId: string) {
    const isSelected = selectedCardId.value === cardId
    return {
      'is-selected': isSelected,
      'is-correct': isSelected && isSuccess.value,
      'is-wrong': isSelected && !isSuccess.value,
      'is-shake': shakingCardId.value === cardId,
    }
  }

  /**
   * 选卡逻辑：
   * - 已答对时锁定当前回合，避免重复点击把成功态覆盖
   * - 答错只重置连击，不扣累计分
   */
  function handleChoose(cardId: string) {
    if (!canPlayRound.value || isSuccess.value) {
      return
    }

    selectedCardId.value = cardId

    if (cardId === targetCardId.value) {
      shakingCardId.value = ''
      fireworksKey.value += 1
      streak.value += 1
      score.value += 10
      return
    }

    streak.value = 0
    shakingCardId.value = cardId

    clearShakeTimer()
    shakeTimer = setTimeout(() => {
      shakingCardId.value = ''
    }, SHAKE_DURATION_MS)
  }

  function markNextPressed() {
    isNextPressed.value = true
    clearNextPressTimer()

    nextPressTimer = setTimeout(() => {
      isNextPressed.value = false
    }, NEXT_BUTTON_ACTIVE_MS)
  }

  async function handleNextRound() {
    markNextPressed()

    if (shouldShowReloadAction.value) {
      await initializeGame()
      return
    }

    if (!isSuccess.value) {
      return
    }

    if (isSessionComplete.value) {
      switchTab('/pages/game/game')
      return
    }

    round.value += 1
    try {
      if (await setupNextRound()) {
        scheduleAutoPlay()
      }
    } catch (error) {
      round.value = Math.max(1, round.value - 1)
      loadError.value = getErrorMessage(error, '本局开局失败')
      showToast(loadError.value)
    }
  }

  /**
   * 初始化流程：
   * 1. 解析分类与配置
   * 2. 拉取卡片并构建目标队列
   * 3. 进入首轮并自动播报
   */
  async function initializeGame() {
    clearTimers()
    stopQuestionAudio()

    isLoading.value = true
    resetSessionState()

    try {
      const category = await resolveCategoryContext()
      categoryId.value = category.id
      categoryName.value = category.name

      const cards = await fetchCardsByCategory(category.id)
      if (cards.length < 2) {
        throw new Error('该分类卡片不足 2 张')
      }

      allCards.value = cards
      detectedAudioBase.value = detectAudioBaseFromCards(cards, configuredGameAudioBase)

      remainingTargetIds.value = buildSessionTargetQueue(cards)
      totalRounds.value = remainingTargetIds.value.length
      if (totalRounds.value <= 0) {
        throw new Error('当前分类没有可用题目')
      }

      round.value = 1
      streak.value = 0
      score.value = 0

      sessionRoundKey = createSessionRoundKey()
      await consumeGameRound()

      if (await setupNextRound()) {
        scheduleAutoPlay(320)
      }
    } catch (error) {
      loadError.value = getErrorMessage(error, '加载游戏数据失败')
      resetRoundBoard()
    } finally {
      isLoading.value = false
    }
  }

  async function setupNextRound() {
    if (allCards.value.length < 2) {
      resetRoundBoard()
      return false
    }

    const nextTargetId = remainingTargetIds.value.shift()
    if (!nextTargetId) {
      resetRoundBoard()
      return false
    }

    const target = allCards.value.find((item) => item.id === nextTargetId)
    const distractorPool = allCards.value.filter((item) => item.id !== nextTargetId)
    const distractor = pickRandom(distractorPool)

    if (!target || !distractor) {
      resetRoundBoard()
      return false
    }

    const template = pickTemplate()

    roundCards.value = shuffleArray([target, distractor])
    targetCardId.value = target.id
    currentTemplateId.value = template.templateId
    currentTemplateText.value = template.templateText
    resetRoundSelection()
    return true
  }

  async function consumeGameRound() {
    if (!sessionRoundKey) {
      throw new Error('缺少本局扣费标识')
    }

    const response = await pointsApi.consumeAction({
      actionType: 'game_round',
      roundKey: sessionRoundKey,
    })
    if (response.code !== 0 || !response.data) {
      throw new Error(response.msg || '本局积分扣费失败')
    }
  }

  function createSessionRoundKey() {
    const randomPart = Math.random().toString(36).slice(2, 8)
    return `${gameName.value}:${categoryId.value || 'default'}:${Date.now()}-${randomPart}`
  }

  function pickTemplate(): GameTemplate {
    if (GAME_TEMPLATES.length <= 1) {
      return DEFAULT_TEMPLATE
    }

    const candidates = GAME_TEMPLATES.filter((item) => item.templateId !== lastTemplateId.value)
    const selected = pickRandom(candidates.length > 0 ? candidates : GAME_TEMPLATES) || DEFAULT_TEMPLATE

    lastTemplateId.value = selected.templateId
    return selected
  }

  async function resolveCategoryContext() {
    if (categoryId.value) {
      return {
        id: categoryId.value,
        name: categoryName.value || FALLBACK_CATEGORY_NAME,
      }
    }

    const categoryResp = await cardApi.getCategories()
    if (categoryResp.code !== 0 || !Array.isArray(categoryResp.data) || categoryResp.data.length <= 0) {
      throw new Error(categoryResp.msg || '未找到可用分类')
    }

    const keyword = (categoryKeyword.value || categoryName.value || FALLBACK_CATEGORY_KEYWORD).toLowerCase()
    const matched = categoryResp.data.find((item) => {
      const name = String(item?.name || '').toLowerCase()
      const desc = String(item?.description || '').toLowerCase()
      return !!keyword && (name.includes(keyword) || desc.includes(keyword))
    })

    const category = matched || categoryResp.data[0]
    const resolvedId = String(category?._id || '').trim()
    if (!resolvedId) {
      throw new Error('分类数据缺少 ID')
    }

    return {
      id: resolvedId,
      name: String(category?.name || FALLBACK_CATEGORY_NAME).trim() || FALLBACK_CATEGORY_NAME,
    }
  }

  async function fetchCardsByCategory(targetCategoryId: string) {
    const merged: GameCard[] = []
    let page = 1
    let expectedTotal = 0

    while (page <= CARD_MAX_PAGES) {
      const response = await cardApi.getCardsByCategoryLite({
        categoryId: targetCategoryId,
        page,
        pageSize: CARD_PAGE_SIZE,
      })

      if (response.code !== 0 || !response.data) {
        throw new Error(response.msg || '加载卡片失败')
      }

      const rows = Array.isArray(response.data.list) ? response.data.list : []
      if (page === 1) {
        expectedTotal = Math.max(0, Number(response.data.total || 0))
      }

      merged.push(...rows.map(toGameCard).filter((item): item is GameCard => !!item))

      if (rows.length <= 0 || rows.length < CARD_PAGE_SIZE) {
        break
      }

      if (expectedTotal > 0 && merged.length >= expectedTotal) {
        break
      }

      page += 1
    }

    return Array.from(new Map(merged.map((item) => [item.id, item])).values())
  }

  function applyQuery(query: ListenPickQuery) {
    const resolvedCategoryId = decodeQueryValue(query.categoryId)
    const resolvedCategoryName = decodeQueryValue(query.categoryName)
    const resolvedCategoryKeyword = decodeQueryValue(query.categoryKeyword)
    const resolvedGameName = decodeQueryValue(query.gameName)
    const resolvedAudioFormat = decodeQueryValue(query.audioFormat)

    if (resolvedCategoryId) {
      categoryId.value = resolvedCategoryId
    }

    if (resolvedCategoryName) {
      categoryName.value = resolvedCategoryName
    }

    if (resolvedCategoryKeyword) {
      categoryKeyword.value = resolvedCategoryKeyword
    }

    if (resolvedGameName) {
      gameName.value = sanitizePathSegment(resolvedGameName, DEFAULT_GAME_NAME)
    }

    if (resolvedAudioFormat === 'wav' || resolvedAudioFormat === 'pcm' || resolvedAudioFormat === 'mp3') {
      audioFormat.value = resolvedAudioFormat
    }
  }

  function cleanupPage() {
    clearTimers()
    cleanupAudio()
  }

  onLoad((query) => {
    applyQuery((query || {}) as ListenPickQuery)
    void initializeGame()
  })

  onUnload(() => {
    cleanupPage()
  })

  onBeforeUnmount(() => {
    cleanupPage()
  })

  return {
    canPlayRound,
    canReplayVoice,
    fireworksKey,
    handleChoose,
    handleNextRound,
    handleReplayVoice,
    isNextActionEnabled,
    isNextPressed,
    isSuccess,
    isVoicePlaying,
    isVoicePressed,
    navigateBack,
    nextButtonText,
    placeholderText,
    questionText,
    replayButtonText,
    resolveCardClass,
    rewardText,
    roundCards,
    stageStyle,
    targetCardId,
    voiceLabel,
  }
}
