import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import {
  adminApi,
  type AdminCategoryPayload,
  type Category,
} from '@/api'
import { uploadApiFile } from '@/api/shared'
import { useConfirmedAction } from '@/composables/useConfirmedAction'
import { usePageLayout } from '@/composables/usePageLayout'
import {
  assertApiSuccess,
  getErrorMessage,
  hideLoading,
  navigateBack,
  showLoading,
  showToast,
} from '@/utils'

type ValueEvent = Event | { detail?: { value?: unknown } }
type UploadField = 'icon' | 'cover'
type TouchPoint = { clientY?: number; pageY?: number }
type TouchValueEvent = ValueEvent & {
  touches?: TouchPoint[]
  changedTouches?: TouchPoint[]
}

interface CategoryFormState {
  _id?: string
  name: string
  icon: string
  cover: string
  color: string
  gradient: string
  description: string
  sort: number
  status: number
}

/** 创建默认分类表单 */
function createDefaultCategoryForm(sort = 0): CategoryFormState {
  return {
    name: '',
    icon: '',
    cover: '',
    color: '',
    gradient: '',
    description: '',
    sort,
    status: 1,
  }
}

/** 规范化排序值 */
function normalizeSort(value: unknown) {
  const parsed = Number.parseInt(String(value ?? '0'), 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

const SORT_STEP = 10
const DRAG_MOVE_STEP_PX = 56

/** 分类排序比较器 */
function compareCategorySort(left: Category, right: Category) {
  const sortDiff = normalizeSort(right.sort ?? right.sort_order) - normalizeSort(left.sort ?? left.sort_order)
  if (sortDiff !== 0) {
    return sortDiff
  }

  return Number(left.create_time || 0) - Number(right.create_time || 0)
}

/** 生成排序后的分类列表 */
function sortCategoryRows(rows: Category[]) {
  return [...rows].sort(compareCategorySort)
}

/** 根据位置计算排序值 */
function computeSortByIndex(index: number, total: number) {
  return (Math.max(total, 1) - index) * SORT_STEP
}

/** 判断图片地址 */
function isImageUrl(value?: string) {
  if (!value) {
    return false
  }

  return /^(https?:\/\/|cloud:\/\/|file:\/\/|wxfile:\/\/|\/)/i.test(value.trim())
}

/** 封装后台分类管理页面逻辑 */
export function useAdminCategoriesPage() {
  const { statusBarHeight } = usePageLayout()
  const { runConfirmedAction } = useConfirmedAction()
  const loading = ref(false)
  const saving = ref(false)
  const sortSaving = ref(false)
  const categories = ref<Category[]>([])
  const keyword = ref('')
  const formVisible = ref(false)
  const imageUploading = ref(false)
  const formModel = ref<CategoryFormState>(createDefaultCategoryForm())
  const draggingCategoryId = ref('')
  const draggingIndex = ref(-1)
  const draggingTouchY = ref(0)
  const dragSnapshot = ref<Category[]>([])
  const dragOrderSnapshot = ref<string[]>([])

  const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())

  const filteredCategories = computed(() => {
    const rows = sortCategoryRows(categories.value)

    if (!normalizedKeyword.value) {
      return rows
    }

    return rows.filter((item) =>
      String(item.name || '').toLowerCase().includes(normalizedKeyword.value),
    )
  })

  const resultSummary = computed(
    () => `当前共 ${Number(categories.value.length || 0).toLocaleString()} 个分类`,
  )

  const resultHint = computed(() => {
    if (sortSaving.value) {
      return '正在保存拖拽排序'
    }

    if (loading.value) {
      return '正在同步分类数据'
    }

    if (normalizedKeyword.value) {
      return `关键词：${keyword.value}`
    }

    return '按住拖拽手柄可调整顺序'
  })

  const hasKeyword = computed(() => Boolean(normalizedKeyword.value))
  const canDragSort = computed(
    () => !loading.value && !saving.value && !sortSaving.value && !hasKeyword.value,
  )
  const dragHint = computed(() => {
    if (sortSaving.value) {
      return '排序保存中，请稍候'
    }
    if (hasKeyword.value) {
      return '清空搜索后可拖拽排序'
    }
    return '按住“拖拽排序”并上下移动'
  })
  const isEditMode = computed(() => Boolean(formModel.value._id))
  const formTitle = computed(() => (isEditMode.value ? '编辑分类' : '新增分类'))

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

  /** 返回上一页 */
  function goBack() {
    navigateBack()
  }

  /** 重置拖拽上下文 */
  function resetDragContext() {
    draggingCategoryId.value = ''
    draggingIndex.value = -1
    draggingTouchY.value = 0
    dragSnapshot.value = []
    dragOrderSnapshot.value = []
  }

  /** 应用拖拽排序结果并重算排序值 */
  function applyDragOrder(rows: Category[]) {
    const total = rows.length
    categories.value = rows.map((item, index) => ({
      ...item,
      sort: computeSortByIndex(index, total),
    }))
  }

  /** 构建拖拽排序保存 payload（避免覆盖字段） */
  function buildSortPayload(category: Category, sort: number): AdminCategoryPayload {
    return {
      _id: category._id,
      name: String(category.name || '').trim(),
      icon: String(category.icon || '').trim(),
      cover: String(category.cover || '').trim(),
      color: String(category.color || '').trim(),
      gradient: String(category.gradient || '').trim(),
      description: String(category.description || '').trim(),
      sort,
      status: Number(category.status) === 0 ? 0 : 1,
    }
  }

  /** 持久化拖拽后的排序 */
  async function persistDragOrder(previousRows: Category[]) {
    if (sortSaving.value) {
      return
    }

    const orderedRows = sortCategoryRows(categories.value)
    const previousSortMap = new Map<string, number>()
    previousRows.forEach((item) => {
      previousSortMap.set(item._id, normalizeSort(item.sort ?? item.sort_order))
    })

    const changedRows = orderedRows
      .map((item, index) => ({
        category: item,
        sort: computeSortByIndex(index, orderedRows.length),
      }))
      .filter((item) => previousSortMap.get(item.category._id) !== item.sort)

    if (changedRows.length === 0) {
      return
    }

    sortSaving.value = true
    try {
      for (const item of changedRows) {
        await assertApiSuccess(
          await adminApi.saveCategory(buildSortPayload(item.category, item.sort)),
          '保存排序失败',
        )
      }
      showToast('排序已更新', 'success')
    } catch (error) {
      categories.value = sortCategoryRows(
        previousRows.map((item) => ({
          ...item,
          sort: normalizeSort(item.sort ?? item.sort_order),
        })),
      )
      showToast(getErrorMessage(error, '保存排序失败，已恢复原顺序'))
    } finally {
      sortSaving.value = false
    }
  }

  /** 开始拖拽排序 */
  function startDragSort(categoryId: string, event: ValueEvent) {
    if (!canDragSort.value) {
      if (hasKeyword.value) {
        showToast('请先清空关键词后再拖拽排序')
      }
      return
    }

    const touchY = readTouchY(event)
    if (touchY === null) {
      return
    }

    const orderedRows = sortCategoryRows(categories.value)
    const startIndex = orderedRows.findIndex((item) => item._id === categoryId)
    if (startIndex < 0) {
      return
    }

    dragSnapshot.value = categories.value.map((item) => ({ ...item }))
    dragOrderSnapshot.value = orderedRows.map((item) => item._id)
    draggingCategoryId.value = categoryId
    draggingIndex.value = startIndex
    draggingTouchY.value = touchY
  }

  /** 拖拽中调整顺序 */
  function handleDragSortMove(event: ValueEvent) {
    if (!draggingCategoryId.value || sortSaving.value) {
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

    const orderedRows = sortCategoryRows(categories.value)
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

  /** 结束拖拽并保存排序 */
  function endDragSort() {
    if (!draggingCategoryId.value) {
      return
    }

    const previousRows = dragSnapshot.value.map((item) => ({ ...item }))
    const previousOrder = [...dragOrderSnapshot.value]
    const currentOrder = sortCategoryRows(categories.value).map((item) => item._id)
    const changed =
      previousOrder.length !== currentOrder.length ||
      previousOrder.some((id, index) => id !== currentOrder[index])

    resetDragContext()
    if (!changed) {
      return
    }

    void persistDragOrder(previousRows)
  }

  /** 计算新建分类排序值 */
  function computeNextSort() {
    const highestSort = categories.value.reduce(
      (maxValue, item) => Math.max(maxValue, normalizeSort(item.sort)),
      0,
    )

    return highestSort + 10
  }

  /** 加载分类列表 */
  async function loadCategories() {
    loading.value = true

    try {
      const response = assertApiSuccess(
        await adminApi.getCategoryList(),
        '加载分类失败',
      )

      categories.value = sortCategoryRows(Array.isArray(response.data) ? response.data : []).map((item) => ({
        ...item,
        sort: normalizeSort(item.sort ?? item.sort_order),
      }))
    } catch (error) {
      showToast(getErrorMessage(error, '加载分类失败'))
      categories.value = []
      resetDragContext()
    } finally {
      loading.value = false
    }
  }

  /** 清空关键词 */
  function clearKeyword() {
    keyword.value = ''
  }

  /** 打开新增表单 */
  function openCreateForm() {
    formModel.value = createDefaultCategoryForm(computeNextSort())
    formVisible.value = true
  }

  /** 打开编辑表单 */
  function openEditForm(category: Category) {
    formModel.value = {
      _id: category._id,
      name: String(category.name || ''),
      icon: String(category.icon || ''),
      cover: String(category.cover || ''),
      color: String(category.color || ''),
      gradient: String(category.gradient || ''),
      description: String(category.description || ''),
      sort: normalizeSort(category.sort ?? category.sort_order),
      status: Number(category.status) === 0 ? 0 : 1,
    }
    formVisible.value = true
  }

  /** 关闭表单 */
  function closeForm() {
    if (saving.value || imageUploading.value) {
      return
    }

    formVisible.value = false
  }

  /** 更新文本字段 */
  function handleTextInput(
    field: 'name' | 'icon' | 'cover' | 'color' | 'gradient' | 'description',
    event: ValueEvent,
  ) {
    const nextValue = String(readEventValue(event) ?? '')
    formModel.value = {
      ...formModel.value,
      [field]: nextValue,
    }
  }

  /** 更新状态 */
  function handleStatusChange(event: ValueEvent) {
    formModel.value = {
      ...formModel.value,
      status: Boolean(readEventValue(event)) ? 1 : 0,
    }
  }

  /** 判断是否取消动作 */
  function isCancelledAction(error: unknown) {
    return getErrorMessage(error).toLowerCase().includes('cancel')
  }

  /** 选择图片 */
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

  /** 上传分类图片 */
  async function uploadCategoryImage(filePath: string, field: UploadField) {
    const folder = `categories/${field}/${formModel.value._id || 'new'}`
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

  /** 执行字段图片上传 */
  async function uploadFieldImage(field: UploadField) {
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

      const fileId = await uploadCategoryImage(filePath, field)
      formModel.value = {
        ...formModel.value,
        [field]: fileId,
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
  function buildCategoryPayload(): AdminCategoryPayload {
    return {
      _id: formModel.value._id,
      name: formModel.value.name.trim(),
      icon: formModel.value.icon.trim(),
      cover: formModel.value.cover.trim(),
      color: formModel.value.color.trim(),
      gradient: formModel.value.gradient.trim(),
      description: formModel.value.description.trim(),
      sort: normalizeSort(formModel.value.sort),
      status: formModel.value.status === 0 ? 0 : 1,
    }
  }

  /** 校验表单 */
  function validateCategoryPayload(payload: AdminCategoryPayload) {
    if (!payload.name) {
      showToast('请填写分类名称')
      return false
    }

    return true
  }

  /** 保存分类 */
  async function saveCategory() {
    if (saving.value) {
      return
    }

    if (imageUploading.value) {
      showToast('图片上传中，请稍后保存')
      return
    }

    const payload = buildCategoryPayload()
    if (!validateCategoryPayload(payload)) {
      return
    }

    saving.value = true
    try {
      const response = assertApiSuccess(
        await adminApi.saveCategory(payload),
        '保存分类失败',
      )

      showToast(response.msg || '分类已保存', 'success')
      formVisible.value = false
      await loadCategories()
    } catch (error) {
      showToast(getErrorMessage(error, '保存分类失败'))
    } finally {
      saving.value = false
    }
  }

  /** 删除分类 */
  async function deleteCategory(category: Category) {
    await runConfirmedAction({
      title: '确认删除分类',
      content: `将删除分类“${category.name || '未命名分类'}”，若分类下有卡片会被系统拒绝，是否继续？`,
      loadingText: '删除中...',
      errorText: '删除分类失败',
      execute: async () =>
        assertApiSuccess(
          await adminApi.deleteCategory(category._id),
          '删除分类失败',
        ),
      getSuccessMessage: (result) => result.msg || '删除成功',
      onSuccess: async () => {
        await loadCategories()
      },
    })
  }

  onShow(() => {
    void loadCategories()
  })

  onPullDownRefresh(async () => {
    await loadCategories()
    uni.stopPullDownRefresh()
  })

  return {
    canDragSort,
    categories,
    clearKeyword,
    closeForm,
    dragHint,
    deleteCategory,
    draggingCategoryId,
    endDragSort,
    filteredCategories,
    formModel,
    formTitle,
    formVisible,
    goBack,
    handleDragSortMove,
    handleStatusChange,
    handleTextInput,
    hasKeyword,
    imageUploading,
    isEditMode,
    isImageUrl,
    keyword,
    loading,
    openCreateForm,
    openEditForm,
    resultHint,
    resultSummary,
    saveCategory,
    saving,
    sortSaving,
    startDragSort,
    statusBarHeight,
    uploadFieldImage,
  }
}
