import { navigateBack, switchTab } from '@/utils'

/** 详情页支持的路由参数 */
export interface DetailQuery {
  categoryId?: string
  categoryName?: string
  cardId?: string
  startIndex?: string
}

/** 读取 query 值 */
function readQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return readQueryValue(value[0])
  }

  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

/** 解析并解码 query 值 */
export function decodeQueryValue(value: unknown) {
  const rawValue = readQueryValue(value)
  if (!rawValue) {
    return ''
  }

  try {
    return decodeURIComponent(rawValue)
  } catch {
    return rawValue
  }
}

/** 解析起始索引 */
export function parseStartIndex(value: unknown) {
  const rawValue = readQueryValue(value)
  if (!rawValue) {
    return 0
  }

  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.max(0, Math.floor(parsed))
}

/** 兜底返回上一页 */
export function fallbackBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    navigateBack()
    return
  }

  switchTab('/pages/index/index')
}
