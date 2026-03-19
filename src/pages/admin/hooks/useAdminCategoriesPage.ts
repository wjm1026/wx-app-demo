import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import {
  adminApi,
  type AdminCategoryPayload,
  type Category,
} from '@/api'
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
  const categories = ref<Category[]>([])
  const keyword = ref('')
  const formVisible = ref(false)
  const imageUploading = ref(false)
  const formModel = ref<CategoryFormState>(createDefaultCategoryForm())

  const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())

  const filteredCategories = computed(() => {
    const rows = [...categories.value].sort((left, right) => {
      const sortDiff = normalizeSort(right.sort) - normalizeSort(left.sort)
      if (sortDiff !== 0) {
        return sortDiff
      }

      return Number(left.create_time || 0) - Number(right.create_time || 0)
    })

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
    if (loading.value) {
      return '正在同步分类数据'
    }

    if (normalizedKeyword.value) {
      return `关键词：${keyword.value}`
    }

    return '按排序值从高到低展示'
  })

  const hasKeyword = computed(() => Boolean(normalizedKeyword.value))
  const isEditMode = computed(() => Boolean(formModel.value._id))
  const formTitle = computed(() => (isEditMode.value ? '编辑分类' : '新增分类'))

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

      categories.value = Array.isArray(response.data) ? response.data : []
    } catch (error) {
      showToast(getErrorMessage(error, '加载分类失败'))
      categories.value = []
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

  /** 更新排序字段 */
  function handleSortInput(event: ValueEvent) {
    formModel.value = {
      ...formModel.value,
      sort: normalizeSort(readEventValue(event)),
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

  /** 提取文件扩展名 */
  function extractFileExtension(filePath: string) {
    const matched = filePath.match(/\.([0-9a-zA-Z]+)(?:$|\?)/)
    return matched?.[1]?.toLowerCase() || 'png'
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
    const extension = extractFileExtension(filePath)
    const cloudPath = `category-${field}-${formModel.value._id || 'new'}-${Date.now()}.${extension}`

    const result = await uniCloud.uploadFile({
      filePath,
      cloudPath,
    })

    return result.fileID
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
    categories,
    clearKeyword,
    closeForm,
    deleteCategory,
    filteredCategories,
    formModel,
    formTitle,
    formVisible,
    goBack,
    handleSortInput,
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
    statusBarHeight,
    uploadFieldImage,
  }
}
