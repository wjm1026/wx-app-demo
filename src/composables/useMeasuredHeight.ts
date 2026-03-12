import { computed, nextTick, ref } from 'vue'
import { resolveNodeRect } from '@/utils'

export function useMeasuredHeight(selector: string, fallback = 0) {
  const height = ref(fallback)

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
