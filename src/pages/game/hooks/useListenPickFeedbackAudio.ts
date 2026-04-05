import { ref } from 'vue'
import type { FeedbackAudioItem } from '@/api'
import { getErrorMessage, showToast } from '@/utils'

interface PlayFeedbackAudioOptions {
  fallbackText?: string
  onEnded?: () => void
  onFailed?: () => void
}

/**
 * 反馈语音播放控制：
 * - 独立于题干音频，避免共享全局单例导致串音
 * - 支持播放结束回调，供自动续题与解锁选项使用
 */
export function useListenPickFeedbackAudio() {
  const isFeedbackPlaying = ref(false)

  let audioContext: UniApp.InnerAudioContext | null = null

  function destroyContext(context: UniApp.InnerAudioContext | null) {
    if (!context) {
      return
    }

    try {
      context.stop()
    } catch {
      // ignore stop errors during cleanup
    }

    try {
      context.destroy()
    } catch {
      // ignore destroy errors during cleanup
    }
  }

  function stopFeedbackAudio() {
    const current = audioContext
    audioContext = null
    isFeedbackPlaying.value = false
    destroyContext(current)
  }

  function playFeedbackAudio(
    item: FeedbackAudioItem | null,
    options: PlayFeedbackAudioOptions = {},
  ) {
    const audio = String(item?.audio || '').trim()
    const fallbackText = String(item?.text || options.fallbackText || '').trim()

    stopFeedbackAudio()

    if (!audio) {
      if (fallbackText) {
        showToast(fallbackText)
      }
      options.onFailed?.()
      return false
    }

    try {
      const context = uni.createInnerAudioContext()
      audioContext = context
      isFeedbackPlaying.value = true

      context.onEnded(() => {
        if (audioContext !== context) {
          return
        }

        audioContext = null
        isFeedbackPlaying.value = false
        destroyContext(context)
        options.onEnded?.()
      })

      context.onStop(() => {
        if (audioContext !== context) {
          return
        }

        audioContext = null
        isFeedbackPlaying.value = false
        destroyContext(context)
      })

      context.onError((error) => {
        if (audioContext !== context) {
          return
        }

        audioContext = null
        isFeedbackPlaying.value = false
        destroyContext(context)
        showToast(fallbackText || getErrorMessage(error, '反馈语音播放失败'))
        options.onFailed?.()
      })

      context.src = audio
      context.play()
      return true
    } catch (error) {
      audioContext = null
      isFeedbackPlaying.value = false
      showToast(fallbackText || getErrorMessage(error, '反馈语音播放失败'))
      options.onFailed?.()
      return false
    }
  }

  function cleanup() {
    stopFeedbackAudio()
  }

  return {
    cleanup,
    isFeedbackPlaying,
    playFeedbackAudio,
    stopFeedbackAudio,
  }
}
