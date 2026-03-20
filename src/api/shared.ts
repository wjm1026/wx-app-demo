import { readStoredAuthToken } from '@/auth'
import type { ApiResponse } from './types'

type RequestMethod = UniApp.RequestOptions['method']

interface RequestApiOptions {
  url: string
  method?: RequestMethod
  data?: unknown
  withAuth?: boolean
  headers?: Record<string, string>
}

interface RequestControlOptions {
  withAuth?: boolean
}

export interface UploadedFileInfo {
  url?: string
  path?: string
  size?: number
  name?: string
}

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8080'

/** 规范化基础地址 */
function normalizeBaseUrl(url?: string) {
  if (!url) {
    return DEFAULT_API_BASE_URL
  }

  const normalized = String(url).trim()
  if (!normalized) {
    return DEFAULT_API_BASE_URL
  }

  return normalized.replace(/\/+$/, '')
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env?.VITE_API_BASE_URL)

/** 解析请求地址 */
function resolveRequestUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

/** 构建请求头 */
function buildHeaders(
  withAuth = true,
  headers: Record<string, string> = {},
  options: { withDefaultContentType?: boolean } = {},
) {
  const merged: Record<string, string> = {
    ...headers,
  }

  const { withDefaultContentType = true } = options
  if (withDefaultContentType && !merged['Content-Type']) {
    merged['Content-Type'] = 'application/json'
  }

  if (!withAuth) {
    return merged
  }

  const token = readStoredAuthToken()
  if (token) {
    merged.Authorization = `Bearer ${token}`
  }

  return merged
}

/** 解析字符串 JSON */
function parseJsonString(text: string) {
  const normalized = text.trim()
  if (!normalized) {
    return null
  }

  try {
    return JSON.parse(normalized)
  } catch {
    return normalized
  }
}

/** 判断普通对象 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

/** 清理 undefined 字段 */
function sanitizeRequestData(data: unknown): UniApp.RequestOptions['data'] {
  if (data === undefined) {
    return undefined
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeRequestData(item))
  }

  if (isPlainObject(data)) {
    const cleaned: Record<string, unknown> = {}
    Object.keys(data).forEach((key) => {
      const nextValue = sanitizeRequestData(data[key])
      if (nextValue !== undefined) {
        cleaned[key] = nextValue
      }
    })
    return cleaned
  }

  return data as UniApp.RequestOptions['data']
}

/** 提取消息文案 */
function resolveMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const value = payload as Record<string, unknown>
  if (typeof value.msg === 'string' && value.msg) {
    return value.msg
  }

  if (typeof value.message === 'string' && value.message) {
    return value.message
  }

  if (typeof value.errMsg === 'string' && value.errMsg) {
    return value.errMsg
  }

  return fallback
}

/** 规范化接口返回 */
function normalizeApiResponse<T>(
  statusCode: number,
  payload: unknown,
): ApiResponse<T> {
  const data =
    typeof payload === 'string'
      ? parseJsonString(payload)
      : payload

  if (
    data &&
    typeof data === 'object' &&
    typeof (data as ApiResponse<T>).code === 'number'
  ) {
    const normalized = data as ApiResponse<T>
    if (typeof normalized.msg !== 'string') {
      normalized.msg = normalized.code === 0 ? 'success' : '请求失败'
    }
    return normalized
  }

  if (statusCode >= 200 && statusCode < 300) {
    return {
      code: 0,
      msg: 'success',
      data: data as T,
    }
  }

  const fallback =
    statusCode === 401
      ? '请先登录'
      : `请求失败(${statusCode || 'unknown'})`

  return {
    code: statusCode || -1,
    msg: resolveMessage(data, fallback),
    data: undefined,
  }
}

/** 执行 HTTP 请求 */
export async function requestApi<T = unknown>(
  options: RequestApiOptions,
): Promise<ApiResponse<T>> {
  const {
    url,
    method = 'GET',
    data,
    withAuth = true,
    headers,
  } = options

  const response = await new Promise<UniApp.RequestSuccessCallbackResult>(
    (resolve, reject) => {
      uni.request({
        url: resolveRequestUrl(url),
        method: method as UniApp.RequestOptions['method'],
        data: sanitizeRequestData(data),
        timeout: 15000,
        header: buildHeaders(withAuth, headers),
        success: resolve,
        fail: reject,
      })
    },
  )

  return normalizeApiResponse<T>(response.statusCode || 0, response.data)
}

/** GET 请求 */
export function apiGet<T = unknown>(
  url: string,
  data?: unknown,
  options: RequestControlOptions = {},
) {
  return requestApi<T>({
    url,
    method: 'GET',
    data,
    withAuth: options.withAuth,
  })
}

/** POST 请求 */
export function apiPost<T = unknown>(
  url: string,
  data?: unknown,
  options: RequestControlOptions = {},
) {
  return requestApi<T>({
    url,
    method: 'POST',
    data,
    withAuth: options.withAuth,
  })
}

/** PUT 请求 */
export function apiPut<T = unknown>(
  url: string,
  data?: unknown,
  options: RequestControlOptions = {},
) {
  return requestApi<T>({
    url,
    method: 'PUT',
    data,
    withAuth: options.withAuth,
  })
}

/** DELETE 请求 */
export function apiDelete<T = unknown>(
  url: string,
  data?: unknown,
  options: RequestControlOptions = {},
) {
  return requestApi<T>({
    url,
    method: 'DELETE',
    data,
    withAuth: options.withAuth,
  })
}

/** 上传文件 */
export async function uploadApiFile(
  filePath: string,
  options: {
    folder?: string
    withAuth?: boolean
  } = {},
) {
  const { folder = 'uploads', withAuth = true } = options

  const uploadResult = await new Promise<UniApp.UploadFileSuccessCallbackResult>(
    (resolve, reject) => {
      uni.uploadFile({
        url: resolveRequestUrl('/api/v1/files/upload'),
        filePath,
        name: 'file',
        timeout: 30000,
        header: buildHeaders(withAuth, {}, { withDefaultContentType: false }),
        formData: {
          folder,
        },
        success: resolve,
        fail: reject,
      })
    },
  )

  return normalizeApiResponse<UploadedFileInfo>(
    uploadResult.statusCode || 0,
    uploadResult.data,
  )
}
