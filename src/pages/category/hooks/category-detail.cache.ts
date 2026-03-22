import { ref } from 'vue'
import type { Card } from '@/api'

/** 创建卡片详情缓存（LRU） */
export function createCardDetailCache(limit = 20) {
  // 至少保留 1 项，避免被传入 0 或负数后缓存失效。
  const normalizedLimit = Math.max(1, Math.trunc(limit))
  // 实际缓存容器
  const detailCache = new Map<string, Card>()
  // 访问顺序队列（越靠后越新）
  const cacheOrder: string[] = []
  // 用于触发响应式依赖更新（Map 本身不是深响应式）
  const cacheVersion = ref(0)

  /** 读取缓存并更新访问顺序 */
  function getCachedDetail(cardId: string) {
    if (!cardId || !detailCache.has(cardId)) {
      return null
    }

    const keyIndex = cacheOrder.indexOf(cardId)
    if (keyIndex >= 0) {
      cacheOrder.splice(keyIndex, 1)
      cacheOrder.push(cardId)
    }

    return detailCache.get(cardId) || null
  }

  /** 只读缓存，不更新访问顺序 */
  function peekCachedDetail(cardId: string) {
    if (!cardId) {
      return null
    }

    return detailCache.get(cardId) || null
  }

  /** 写入缓存 */
  function setCachedDetail(cardId: string, detail: Card) {
    if (!cardId) {
      return
    }

    const existsIndex = cacheOrder.indexOf(cardId)
    if (existsIndex >= 0) {
      cacheOrder.splice(existsIndex, 1)
    }

    detailCache.set(cardId, detail)
    cacheOrder.push(cardId)

    while (cacheOrder.length > normalizedLimit) {
      const firstKey = cacheOrder.shift()
      if (firstKey) {
        detailCache.delete(firstKey)
      }
    }

    cacheVersion.value += 1
  }

  return {
    cacheVersion,
    getCachedDetail,
    peekCachedDetail,
    setCachedDetail,
  }
}
