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

export const API_BASE_URL = normalizeBaseUrl(import.meta.env?.VITE_API_BASE_URL)

/** 解析请求地址 */
export function resolveRequestUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
