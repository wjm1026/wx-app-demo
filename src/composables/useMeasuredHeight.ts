import { computed, nextTick, ref } from 'vue'
import { resolveNodeRect } from '@/utils'

/** 封装测量高度逻辑 */
export function useMeasuredHeight(selector: string, fallback = 0) {
  const height = ref(fallback)

  /** 测量高度 */
  function measureHeight() {
    nextTick(() => {
      uni
        .createSelectorQuery()
        .select(selector)
        .boundingClientRect((rect) => {
          const nodeRect = resolveNodeRect(rect)

          if (nodeRect?.height) {
            height.value = nodeRect.height
          }
        })
        .exec()
    })
  }

  const resolvedHeight = computed(() => height.value || fallback)

  return {
    height,
    resolvedHeight,
    measureHeight,
  }
}
