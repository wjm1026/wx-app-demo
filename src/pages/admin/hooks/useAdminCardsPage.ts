import { computed, ref } from 'vue'
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import {
  adminApi,
  type AdminCardPayload,
  type AdminCardSortPayload,
  type Card,
  type Category,
} from '@/api'
import { uploadApiFile } from '@/api/shared'
import { useConfirmedAction } from '@/composables/useConfirmedAction'
import { usePageLayout } from '@/composables/usePageLayout'
import { usePagedList } from '@/composables/usePagedList'
import {
  assertApiSuccess,
  formatDate,
  getErrorMessage,
  hideLoading,
  navigateBack,
  showLoading,
  showToast,
} from '@/utils'

interface CardListQuery {
  keyword: string
  categoryId?: string
  status?: number
}

interface CardFormState {
  _id?: string
  name: string
  name_en: string
  name_pinyin: string
  category_id: string
  image: string
  description: string
  fun_fact: string
  audio: string
  audio_en: string
  sound: string
  video: string
  tagsInput: string
  is_free: boolean
  points_cost: number
  is_hot: boolean
  sort: number
  status: number
}

type CardTextField =
  | 'name'
  | 'name_en'
  | 'name_pinyin'
  | 'category_id'
  | 'image'
  | 'description'
  | 'fun_fact'
  | 'audio'
  | 'audio_en'
  | 'sound'
  | 'video'
  | 'tagsInput'

type CardNumberField = 'points_cost' | 'sort'

type ValueEvent = Event | { detail?: { value?: unknown } }
type TouchPoint = { clientY?: number; pageY?: number }
type TouchValueEvent = ValueEvent & {
  touches?: TouchPoint[]
  changedTouches?: TouchPoint[]
}

const STATUS_TABS = [
  { value: -1, label: '全部状态', note: '含启用和禁用' },
  { value: 1, label: '启用', note: '前台可展示' },
  { value: 0, label: '禁用', note: '前台不展示' },
] as const

const LAST_SELECTED_CATEGORY_STORAGE_KEY = 'admin:cards:lastSelectedCategoryId'
const SORT_STEP = 10
const DRAG_MOVE_STEP_PX = 56

/** 创建默认表单 */
function createDefaultForm(categoryId = '', sort = 0): CardFormState {
  return {
    name: '',
    name_en: '',
    name_pinyin: '',
    category_id: categoryId,
    image: '',
    description: '',
    fun_fact: '',
    audio: '',
    audio_en: '',
    sound: '',
    video: '',
    tagsInput: '',
    is_free: true,
    points_cost: 0,
    is_hot: false,
    sort,
    status: 1,
  }
}

/** 规范化排序值 */
function normalizeSort(value: unknown) {
  const parsed = Number.parseInt(String(value ?? '0'), 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

/** 从卡片ID解析数值（用于兜底排序） */
function parseCardNumericId(cardId: unknown) {
  const parsed = Number.parseInt(String(cardId ?? '0'), 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

/** 卡片排序比较器 */
function compareCardSort(left: Card, right: Card) {
  const sortDiff = normalizeSort(right.sort) - normalizeSort(left.sort)
  if (sortDiff !== 0) {
    return sortDiff
  }

  const createTimeDiff = Number(right.create_time || 0) - Number(left.create_time || 0)
  if (createTimeDiff !== 0) {
    return createTimeDiff
  }

  return parseCardNumericId(right._id) - parseCardNumericId(left._id)
}

/** 生成排序后的卡片列表 */
function sortCardRows(rows: Card[]) {
  return [...rows].sort(compareCardSort)
}

/** 根据位置计算排序值 */
function computeSortByIndex(index: number, total: number) {
  return (Math.max(total, 1) - index) * SORT_STEP
}

/** 规范化标签 */
function normalizeTags(value: string) {
  return value
    .split(/[\s,，]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/** 封装后台卡片管理页面逻辑 */
export function useAdminCardsPage() {
  const { statusBarHeight } = usePageLayout()
  const { runConfirmedAction } = useConfirmedAction()
  const keyword = ref('')
  const activeStatus = ref(-1)
  const activeCategoryId = ref('')
  const categories = ref<Category[]>([])
  const categoriesLoading = ref(false)
  const formVisible = ref(false)
  const formSaving = ref(false)
  const sortSaving = ref(false)
  const imageUploading = ref(false)
  const formModel = ref<CardFormState>(createDefaultForm())
  const draggingCardId = ref('')
  const draggingIndex = ref(-1)
  const draggingTouchY = ref(0)
  const dragOrderSnapshot = ref<string[]>([])
  const sortBaselineMap = ref<Map<string, number>>(new Map())
  const pendingSortMap = ref<Map<string, number>>(new Map())
  const lastSelectedCategoryId = ref(String(uni.getStorageSync(LAST_SELECTED_CATEGORY_STORAGE_KEY) || ''))

  const {
    list: cardList,
    loading,
    hasMore,
    total,
    refresh,
    loadMore,
  } = usePagedList<Card, CardListQuery>({
    pageSize: 12,
    initialQuery: {
      keyword: '',
    },
    fetcher: (params) => adminApi.getCardList(params),
    onError: (message) => showToast(message || '加载卡片失败'),
  })

  const normalizedKeyword = computed(() => keyword.value.trim())
  const selectedStatusTab = computed(
    () => STATUS_TABS.find((item) => item.value === activeStatus.value) ?? STATUS_TABS[0],
  )
  const pendingSortCount = computed(() => pendingSortMap.value.size)
  const hasPendingSortChanges = computed(() => pendingSortCount.value > 0)

  const categoryFilterOptions = computed(() => [
    {
      _id: '',
      name: '全部分类',
      card_count: total.value,
    },
    ...categories.value,
  ])

  const categoryNameMap = computed(() => {
    const map = new Map<string, string>()
    categories.value.forEach((item) => {
      map.set(item._id, item.name)
    })
    return map
  })

  const categorySummary = computed(() => {
    if (activeCategoryId.value) {
      return categoryNameMap.value.get(activeCategoryId.value) || '未知分类'
    }
    return '全部分类'
  })

  const dragBlockReason = computed(() => {
    if (sortSaving.value) {
      return '排序保存中，请稍候'
    }
    if (formSaving.value) {
      return '表单保存中，请稍候'
    }
    if (loading.value) {
      return '列表加载中，请稍候'
    }
    if (!activeCategoryId.value) {
      return '请先选择单个分类后再拖拽排序'
    }
    if (normalizedKeyword.value) {
      return '请先清空关键词后再拖拽排序'
    }
    if (activeStatus.value !== -1) {
      return '请切换到“全部状态”后再拖拽排序'
    }
    if (hasMore.value) {
      return '请先上拉加载完全部卡片后再拖拽排序'
    }
    if (cardList.value.length <= 1) {
      return '当前分类卡片不足两张，无需调整'
    }
    return ''
  })
  const canDragSort = computed(() => !dragBlockReason.value)
  const dragHint = computed(() => {
    if (dragBlockReason.value) {
      return dragBlockReason.value
    }
    if (hasPendingSortChanges.value) {
      return `有 ${pendingSortCount.value} 项待保存，点“保存排序”提交`
    }
    return '按住“拖拽排序”并上下移动'
  })

  const resultSummary = computed(() =>
    `当前共 ${Number(total.value || cardList.value.length).toLocaleString()} 张卡片`,
  )
  const resultHint = computed(() => {
    if (sortSaving.value) {
      return '正在批量保存排序'
    }
    if (hasPendingSortChanges.value) {
      return `当前有 ${pendingSortCount.value} 项排序待保存`
    }
    if (loading.value) {
      return '正在同步最新卡片数据'
    }
    if (normalizedKeyword.value) {
      return `关键词：${normalizedKeyword.value}`
    }
    return `${selectedStatusTab.value.label} · ${categorySummary.value}`
  })

  const hasFilters = computed(
    () =>
      Boolean(normalizedKeyword.value) ||
      Boolean(activeCategoryId.value) ||
      activeStatus.value !== -1,
  )

  const formTitle = computed(() => (formModel.value._id ? '编辑卡片' : '新增卡片'))
  const isEditMode = computed(() => Boolean(formModel.value._id))
  const formCategoryIndex = computed(() => {
    const index = categories.value.findIndex((item) => item._id === formModel.value.category_id)
    return index < 0 ? 0 : index
  })

  /** 判断分类是否存在 */
  function hasCategory(categoryId: string) {
    return categories.value.some((item) => item._id === categoryId)
  }

  /** 记住上次选择的分类 */
  function rememberLastSelectedCategory(categoryId: string) {
    const normalized = String(categoryId || '').trim()
    if (!normalized) {
      return
    }
    lastSelectedCategoryId.value = normalized
    uni.setStorageSync(LAST_SELECTED_CATEGORY_STORAGE_KEY, normalized)
  }

  /** 解析新增表单默认分类 */
  function resolveCreateFormCategoryId() {
    const rememberedCategoryId = lastSelectedCategoryId.value
    if (rememberedCategoryId && hasCategory(rememberedCategoryId)) {
      return rememberedCategoryId
    }
    if (activeCategoryId.value && hasCategory(activeCategoryId.value)) {
      return activeCategoryId.value
    }
    return ''
  }

  /** 读取事件值 */
  function readEventValue(event: ValueEvent) {
    if (event && typeof event === 'object' && 'detail' in event) {
      return event.detail?.value
    }
    return undefined
  }

  /** 读取触摸位置 */
  function readTouchY(event: ValueEvent) {
    const touchEvent = event as TouchValueEvent
    const touchPoint = touchEvent.touches?.[0] || touchEvent.changedTouches?.[0]
    const y = Number(touchPoint?.clientY ?? touchPoint?.pageY)
    return Number.isFinite(y) ? y : null
  }

  /** 重置拖拽上下文 */
  function resetDragContext() {
    draggingCardId.value = ''
    draggingIndex.value = -1
    draggingTouchY.value = 0
    dragOrderSnapshot.value = []
  }

  /** 归一化列表排序值并按规则排序 */
  function normalizeCardListRows(rows: Card[]) {
    return sortCardRows(rows).map((item) => ({
      ...item,
      sort: normalizeSort(item.sort),
    }))
  }

  /** 记录排序基线（用于识别待保存项） */
  function resetSortBaseline(rows: Card[]) {
    const nextBaseline = new Map<string, number>()
    rows.forEach((item) => {
      nextBaseline.set(item._id, normalizeSort(item.sort))
    })
    sortBaselineMap.value = nextBaseline
    pendingSortMap.value = new Map()
  }

  /** 同步待保存排序项 */
  function syncPendingSortChanges(rows: Card[] = cardList.value) {
    const nextPending = new Map<string, number>()
    rows.forEach((item) => {
      const currentSort = normalizeSort(item.sort)
      const baseSort = sortBaselineMap.value.get(item._id)
      if (baseSort === undefined || baseSort !== currentSort) {
        nextPending.set(item._id, currentSort)
      }
    })
    pendingSortMap.value = nextPending
  }

  /** 拦截会刷新查询的动作，避免丢失未保存排序 */
  function ensureNoPendingSortChanges() {
    if (!hasPendingSortChanges.value) {
      return true
    }
    showToast('有未保存排序，请先点击“保存排序”')
    return false
  }

  /** 计算新建卡片默认排序值 */
  function computeNextSort(categoryId: string) {
    if (!categoryId) {
      return 0
    }

    const highestSort = cardList.value
      .filter((item) => item.category_id === categoryId)
      .reduce((maxValue, item) => Math.max(maxValue, normalizeSort(item.sort)), 0)

    return highestSort + SORT_STEP
  }

  /** 返回上一页 */
  function goBack() {
    navigateBack()
  }

  /** 判断是否取消操作 */
  function isCancelledAction(error: unknown) {
    return getErrorMessage(error).toLowerCase().includes('cancel')
  }

  /** 构建查询条件 */
  function buildQuery(): CardListQuery {
    return {
      keyword: normalizedKeyword.value,
      categoryId: activeCategoryId.value || undefined,
      status: activeStatus.value === -1 ? undefined : activeStatus.value,
    }
  }

  /** 刷新列表 */
  async function refreshList() {
    resetDragContext()
    const refreshed = await refresh(buildQuery(), { replaceQuery: true })
    if (refreshed) {
      const normalizedRows = normalizeCardListRows(cardList.value)
      cardList.value = normalizedRows
      resetSortBaseline(normalizedRows)
    }
    return refreshed
  }

  /** 加载分类列表 */
  async function loadCategories() {
    categoriesLoading.value = true
    try {
      const response = assertApiSuccess(
        await adminApi.getCategoryList(),
        '加载分类失败',
      )
      categories.value = Array.isArray(response.data) ? response.data : []
      if (lastSelectedCategoryId.value && !hasCategory(lastSelectedCategoryId.value)) {
        lastSelectedCategoryId.value = ''
        uni.removeStorageSync(LAST_SELECTED_CATEGORY_STORAGE_KEY)
      }
    } catch (error) {
      showToast(getErrorMessage(error, '加载分类失败'))
      categories.value = []
    } finally {
      categoriesLoading.value = false
    }
  }

  /** 切换状态筛选 */
  function switchStatus(value: number) {
    if (activeStatus.value === value) {
      return
    }
    if (!ensureNoPendingSortChanges()) {
      return
    }
    activeStatus.value = value
    void refreshList()
  }

  /** 切换分类筛选 */
  function switchCategory(value: string) {
    if (activeCategoryId.value === value) {
      return
    }
    if (!ensureNoPendingSortChanges()) {
      return
    }
    activeCategoryId.value = value
    void refreshList()
  }

  /** 搜索 */
  function onSearch() {
    if (!ensureNoPendingSortChanges()) {
      return
    }
    void refreshList()
  }

  /** 清空搜索 */
  function clearKeyword() {
    if (!keyword.value) {
      return
    }
    if (!ensureNoPendingSortChanges()) {
      return
    }
    keyword.value = ''
    void refreshList()
  }

  /** 重置筛选 */
  function resetFilters() {
    if (!ensureNoPendingSortChanges()) {
      return
    }
    keyword.value = ''
    activeStatus.value = -1
    activeCategoryId.value = ''
    void refreshList()
  }

  /** 根据卡片创建表单数据 */
  function createFormFromCard(card: Card): CardFormState {
    return {
      _id: card._id,
      name: card.name || '',
      name_en: card.name_en || '',
      name_pinyin: card.name_pinyin || '',
      category_id: card.category_id || '',
      image: card.image || '',
      description: card.description || '',
      fun_fact: card.fun_fact || '',
      audio: card.audio || '',
      audio_en: card.audio_en || '',
      sound: card.sound || '',
      video: card.video || '',
      tagsInput: Array.isArray(card.tags) ? card.tags.join(', ') : '',
      is_free: Boolean(card.is_free),
      points_cost: Number(card.points_cost || 0),
      is_hot: Boolean(card.is_hot),
      sort: normalizeSort(card.sort),
      status: card.status === 0 ? 0 : 1,
    }
  }

  /** 打开新增表单 */
  function openCreateForm() {
    const categoryId = resolveCreateFormCategoryId()
    formModel.value = createDefaultForm(categoryId, computeNextSort(categoryId))
    formVisible.value = true
  }

  /** 打开编辑表单 */
  function openEditForm(card: Card) {
    formModel.value = createFormFromCard(card)
    formVisible.value = true
  }

  /** 关闭表单 */
  function closeForm() {
    if (formSaving.value || imageUploading.value) {
      return
    }
    formVisible.value = false
  }

  /** 更新文本字段 */
  function handleFormTextInput(field: CardTextField, event: ValueEvent) {
    const nextValue = String(readEventValue(event) ?? '')
    formModel.value = {
      ...formModel.value,
      [field]: nextValue,
    }
  }

  /** 更新数值字段 */
  function handleFormNumberInput(field: CardNumberField, event: ValueEvent) {
    const parsed = Number.parseInt(String(readEventValue(event) ?? '0'), 10)
    const nextValue = Number.isNaN(parsed)
      ? 0
      : field === 'points_cost'
        ? Math.max(0, parsed)
        : parsed

    formModel.value = {
      ...formModel.value,
      [field]: nextValue,
    }
  }

  /** 更新布尔字段 */
  function handleFormBooleanChange(field: 'is_free' | 'is_hot', event: ValueEvent) {
    formModel.value = {
      ...formModel.value,
      [field]: Boolean(readEventValue(event)),
    }
  }

  /** 更新状态字段 */
  function handleStatusChange(event: ValueEvent) {
    formModel.value = {
      ...formModel.value,
      status: Boolean(readEventValue(event)) ? 1 : 0,
    }
  }

  /** 处理分类切换 */
  function handleFormCategoryChange(event: ValueEvent) {
    const index = Number(readEventValue(event))
    if (Number.isNaN(index) || index < 0 || index >= categories.value.length) {
      return
    }

    const selectedCategory = categories.value[index]
    const selectedCategoryId = selectedCategory?._id || ''
    const nextSort = isEditMode.value
      ? formModel.value.sort
      : computeNextSort(selectedCategoryId)

    formModel.value = {
      ...formModel.value,
      category_id: selectedCategoryId,
      sort: nextSort,
    }
    rememberLastSelectedCategory(selectedCategoryId)
  }

  /** 选择图片文件 */
  async function selectImageFile() {
    const result = await new Promise<UniApp.ChooseImageSuccessCallbackResult>(
      (resolve, reject) => {
        uni.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject,
        })
      },
    )

    return result.tempFilePaths?.[0] || ''
  }

  /** 上传卡片图片 */
  async function uploadCardImage(filePath: string) {
    const folder = `cards/${formModel.value._id || 'new'}`
    const result = await uploadApiFile(filePath, { folder })
    if (result.code !== 0) {
      throw new Error(result.msg || '上传图片失败')
    }

    const uploadUrl = result.data?.url || result.data?.path
    if (!uploadUrl) {
      throw new Error('上传图片失败')
    }

    return uploadUrl
  }

  /** 选择并上传主图 */
  async function uploadFormImage() {
    if (imageUploading.value) {
      return
    }

    let loadingShown = false
    try {
      const filePath = await selectImageFile()
      if (!filePath) {
        return
      }

      imageUploading.value = true
      showLoading('上传图片中...')
      loadingShown = true
      const imageUrl = await uploadCardImage(filePath)
      formModel.value = {
        ...formModel.value,
        image: imageUrl,
      }
      showToast('图片上传成功', 'success')
    } catch (error) {
      if (!isCancelledAction(error)) {
        showToast(getErrorMessage(error, '图片上传失败'))
      }
    } finally {
      if (loadingShown) {
        hideLoading()
      }
      imageUploading.value = false
    }
  }

  /** 构建保存 payload */
  function buildCardPayload(): AdminCardPayload {
    const current = formModel.value
    const tags = normalizeTags(current.tagsInput)
    const pointsCost = current.is_free ? 0 : Math.max(0, Number(current.points_cost || 0))

    return {
      _id: current._id,
      name: current.name.trim(),
      name_en: current.name_en.trim(),
      name_pinyin: current.name_pinyin.trim(),
      category_id: current.category_id,
      image: current.image.trim(),
      description: current.description.trim(),
      fun_fact: current.fun_fact.trim(),
      audio: current.audio.trim(),
      audio_en: current.audio_en.trim(),
      sound: current.sound.trim(),
      video: current.video.trim(),
      tags,
      is_free: current.is_free,
      points_cost: pointsCost,
      is_hot: current.is_hot,
      sort: normalizeSort(current.sort),
      status: current.status === 0 ? 0 : 1,
    }
  }

  /** 校验表单 */
  function validateCardForm(payload: AdminCardPayload) {
    if (!payload.name) {
      showToast('请填写卡片名称')
      return false
    }

    if (!payload.category_id) {
      showToast('请选择分类')
      return false
    }

    if (!payload.image) {
      showToast('请填写主图 URL')
      return false
    }

    if (!payload.is_free && Number(payload.points_cost || 0) <= 0) {
      showToast('收费卡片的积分需大于 0')
      return false
    }

    return true
  }

  /** 应用拖拽排序结果并重算排序值（仅本地暂存） */
  function applyDragOrder(rows: Card[]) {
    const totalRows = rows.length
    const reordered = rows.map((item, index) => ({
      ...item,
      sort: computeSortByIndex(index, totalRows),
    }))
    cardList.value = reordered
    syncPendingSortChanges(reordered)
  }

  /** 提示拖拽阻塞原因 */
  function handleSortActionTap() {
    if (dragBlockReason.value) {
      showToast(dragBlockReason.value)
    }
  }

  /** 开始拖拽排序 */
  function startDragSort(cardId: string, event: ValueEvent) {
    if (dragBlockReason.value) {
      showToast(dragBlockReason.value)
      return
    }

    const touchY = readTouchY(event)
    if (touchY === null) {
      return
    }

    const orderedRows = [...cardList.value]
    const startIndex = orderedRows.findIndex((item) => item._id === cardId)
    if (startIndex < 0) {
      return
    }

    dragOrderSnapshot.value = orderedRows.map((item) => item._id)
    draggingCardId.value = cardId
    draggingIndex.value = startIndex
    draggingTouchY.value = touchY
  }

  /** 拖拽中调整顺序 */
  function handleDragSortMove(event: ValueEvent) {
    if (!draggingCardId.value || sortSaving.value) {
      return
    }

    const touchY = readTouchY(event)
    if (touchY === null) {
      return
    }

    const deltaY = touchY - draggingTouchY.value
    if (Math.abs(deltaY) < DRAG_MOVE_STEP_PX) {
      return
    }

    const orderedRows = [...cardList.value]
    const fromIndex = draggingIndex.value
    if (fromIndex < 0 || fromIndex >= orderedRows.length) {
      return
    }

    const toIndex = Math.min(
      orderedRows.length - 1,
      Math.max(0, fromIndex + (deltaY > 0 ? 1 : -1)),
    )
    if (toIndex === fromIndex) {
      draggingTouchY.value = touchY
      return
    }

    const [moved] = orderedRows.splice(fromIndex, 1)
    if (!moved) {
      return
    }

    orderedRows.splice(toIndex, 0, moved)
    applyDragOrder(orderedRows)
    draggingIndex.value = toIndex
    draggingTouchY.value = touchY
  }

  /** 结束拖拽（仅暂存，不自动保存） */
  function endDragSort() {
    if (!draggingCardId.value) {
      return
    }

    const previousOrder = [...dragOrderSnapshot.value]
    const currentOrder = cardList.value.map((item) => item._id)
    const changed =
      previousOrder.length !== currentOrder.length ||
      previousOrder.some((id, index) => id !== currentOrder[index])

    resetDragContext()
    if (changed) {
      showToast('排序已暂存，点击“保存排序”后生效')
    }
  }

  /** 批量保存当前排序 */
  async function saveDragSortOrder() {
    if (sortSaving.value) {
      return
    }

    if (!hasPendingSortChanges.value) {
      showToast('当前没有待保存的排序变化')
      return
    }

    const items: AdminCardSortPayload[] = cardList.value
      .filter((item) => pendingSortMap.value.has(item._id))
      .map((item) => ({
        _id: item._id,
        sort: normalizeSort(item.sort),
      }))

    if (items.length === 0) {
      showToast('当前没有待保存的排序变化')
      return
    }

    sortSaving.value = true
    try {
      const response = assertApiSuccess(
        await adminApi.saveCardSortBatch(items),
        '保存排序失败',
      )
      showToast(response.msg || '排序已保存', 'success')
      resetSortBaseline(cardList.value)
    } catch (error) {
      showToast(getErrorMessage(error, '保存排序失败'))
    } finally {
      sortSaving.value = false
    }
  }

  /** 保存卡片 */
  async function saveCardForm() {
    if (formSaving.value) {
      return
    }

    if (imageUploading.value) {
      showToast('图片上传中，请稍后再保存')
      return
    }

    const payload = buildCardPayload()
    if (!validateCardForm(payload)) {
      return
    }
    if (!isEditMode.value) {
      rememberLastSelectedCategory(payload.category_id || '')
    }

    formSaving.value = true
    try {
      const response = assertApiSuccess(await adminApi.saveCard(payload), '保存卡片失败')
      showToast(response.msg || '卡片已保存', 'success')
      formVisible.value = false
      await Promise.all([
        refreshList(),
        loadCategories(),
      ])
    } catch (error) {
      showToast(getErrorMessage(error, '保存卡片失败'))
    } finally {
      formSaving.value = false
    }
  }

  /** 删除卡片 */
  async function deleteCard(card: Card) {
    await runConfirmedAction({
      title: '确认删除卡片',
      content: `将删除“${card.name || '未命名卡片'}”，并清理关联收藏记录，确定继续吗？`,
      loadingText: '删除中...',
      errorText: '删除卡片失败',
      execute: async () =>
        assertApiSuccess(
          await adminApi.deleteCard(card._id),
          '删除卡片失败',
        ),
      getSuccessMessage: (result) => result.msg || '删除成功',
      onSuccess: async () => {
        await Promise.all([
          refreshList(),
          loadCategories(),
        ])
      },
    })
  }

  /** 获取分类名称 */
  function getCategoryName(categoryId: string) {
    return categoryNameMap.value.get(categoryId) || '未分配分类'
  }

  /** 格式化标签 */
  function formatTags(tags?: string[]) {
    if (!Array.isArray(tags) || tags.length === 0) {
      return '暂无标签'
    }
    return tags.slice(0, 4).join(' · ')
  }

  /** 格式化时间 */
  function formatCardDate(value: string | number | undefined) {
    return formatDate(value, 'ymdHm') || '-'
  }

  /** 首次加载 */
  async function bootstrap() {
    await loadCategories()
    await refreshList()
  }

  onShow(() => {
    void bootstrap()
  })

  onPullDownRefresh(async () => {
    if (!ensureNoPendingSortChanges()) {
      uni.stopPullDownRefresh()
      return
    }
    await bootstrap()
    uni.stopPullDownRefresh()
  })

  onReachBottom(() => {
    if (hasMore.value && !loading.value && !sortSaving.value && !draggingCardId.value) {
      void loadMore().then((loaded) => {
        if (!loaded) {
          return
        }

        const normalizedRows = normalizeCardListRows(cardList.value)
        cardList.value = normalizedRows
        if (hasPendingSortChanges.value) {
          syncPendingSortChanges(normalizedRows)
          return
        }
        resetSortBaseline(normalizedRows)
      })
    }
  })

  return {
    activeCategoryId,
    activeStatus,
    canDragSort,
    cardList,
    categoriesLoading,
    categories,
    categoryFilterOptions,
    clearKeyword,
    closeForm,
    deleteCard,
    dragHint,
    draggingCardId,
    endDragSort,
    formModel,
    formCategoryIndex,
    formSaving,
    formTitle,
    formVisible,
    formatCardDate,
    formatTags,
    getCategoryName,
    goBack,
    handleDragSortMove,
    handleFormBooleanChange,
    handleFormCategoryChange,
    handleFormNumberInput,
    handleFormTextInput,
    handleSortActionTap,
    handleStatusChange,
    hasFilters,
    hasMore,
    hasPendingSortChanges,
    imageUploading,
    isEditMode,
    keyword,
    loading,
    onSearch,
    openCreateForm,
    openEditForm,
    pendingSortCount,
    resetFilters,
    resultHint,
    resultSummary,
    saveCardForm,
    saveDragSortOrder,
    selectedStatusTab,
    sortSaving,
    startDragSort,
    statusBarHeight,
    statusTabs: STATUS_TABS,
    switchCategory,
    switchStatus,
    total,
    uploadFormImage,
  }
}
