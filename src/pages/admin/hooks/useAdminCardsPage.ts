import { computed, ref } from 'vue'
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import {
  adminApi,
  type AdminCardPayload,
  type Card,
  type Category,
} from '@/api'
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

type CardNumberField = 'points_cost'

type ValueEvent = Event | { detail?: { value?: unknown } }

const STATUS_TABS = [
  { value: -1, label: '全部状态', note: '含启用和禁用' },
  { value: 1, label: '启用', note: '前台可展示' },
  { value: 0, label: '禁用', note: '前台不展示' },
] as const

/** 创建默认表单 */
function createDefaultForm(categoryId = ''): CardFormState {
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
    status: 1,
  }
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
  const imageUploading = ref(false)
  const formModel = ref<CardFormState>(createDefaultForm())

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

  const resultSummary = computed(() =>
    `当前共 ${Number(total.value || cardList.value.length).toLocaleString()} 张卡片`,
  )

  const resultHint = computed(() => {
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

  /** 读取事件值 */
  function readEventValue(event: ValueEvent) {
    if (event && typeof event === 'object' && 'detail' in event) {
      return event.detail?.value
    }
    return undefined
  }

  /** 返回上一页 */
  function goBack() {
    navigateBack()
  }

  /** 提取文件扩展名 */
  function extractFileExtension(filePath: string) {
    const matched = filePath.match(/\.([0-9a-zA-Z]+)(?:$|\?)/)
    return matched?.[1]?.toLowerCase() || 'png'
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
    return refresh(buildQuery(), { replaceQuery: true })
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

    activeStatus.value = value
    void refreshList()
  }

  /** 切换分类筛选 */
  function switchCategory(value: string) {
    if (activeCategoryId.value === value) {
      return
    }

    activeCategoryId.value = value
    void refreshList()
  }

  /** 搜索 */
  function onSearch() {
    void refreshList()
  }

  /** 清空搜索 */
  function clearKeyword() {
    if (!keyword.value) {
      return
    }

    keyword.value = ''
    void refreshList()
  }

  /** 重置筛选 */
  function resetFilters() {
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
      status: card.status === 0 ? 0 : 1,
    }
  }

  /** 打开新增表单 */
  function openCreateForm() {
    formModel.value = createDefaultForm(activeCategoryId.value)
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
    formModel.value = {
      ...formModel.value,
      [field]: Number.isNaN(parsed) ? 0 : Math.max(0, parsed),
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
    formModel.value = {
      ...formModel.value,
      category_id: selectedCategory?._id || '',
    }
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
    const extension = extractFileExtension(filePath)
    const cloudPath = `card-image-${formModel.value._id || 'new'}-${Date.now()}.${extension}`
    const result = await uniCloud.uploadFile({
      filePath,
      cloudPath,
    })

    return result.fileID
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
    await bootstrap()
    uni.stopPullDownRefresh()
  })

  onReachBottom(() => {
    if (hasMore.value && !loading.value) {
      void loadMore()
    }
  })

  return {
    activeCategoryId,
    activeStatus,
    cardList,
    categoriesLoading,
    categories,
    categoryFilterOptions,
    clearKeyword,
    closeForm,
    deleteCard,
    formModel,
    formSaving,
    formTitle,
    formVisible,
    imageUploading,
    formatCardDate,
    formatTags,
    getCategoryName,
    goBack,
    hasFilters,
    hasMore,
    handleFormBooleanChange,
    handleFormCategoryChange,
    handleFormNumberInput,
    handleFormTextInput,
    handleStatusChange,
    isEditMode,
    keyword,
    loading,
    onSearch,
    openCreateForm,
    openEditForm,
    uploadFormImage,
    resetFilters,
    resultHint,
    resultSummary,
    saveCardForm,
    selectedStatusTab,
    statusBarHeight,
    statusTabs: STATUS_TABS,
    switchCategory,
    switchStatus,
    total,
  }
}
