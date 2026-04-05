import { computed, ref, type ComputedRef } from 'vue'
import { getErrorMessage, showToast } from '@/utils'

interface ReplayVoiceOptions {
  silentWhenMissing?: boolean
}

/**
 * 题干音频播放控制：
 * - 每个页面独立持有题干音频上下文，避免和反馈语音串音
 * - 支持自动播报、手动重播与统一清理
 */
export function useListenPickAudio(audioSrc: ComputedRef<string>) {
  const isVoicePressed = ref(false)
  const isVoicePlaying = ref(false)
  const canReplayVoice = computed(() => !!audioSrc.value)

  let pressTimer: ReturnType<typeof setTimeout> | null = null
  let autoPlayTimer: ReturnType<typeof setTimeout> | null = null
  let audioContext: UniApp.InnerAudioContext | null = null
  let audioContextSrc = ''

  function clearPressTimer() {
    if (!pressTimer) {
      return
    }

    clearTimeout(pressTimer)
    pressTimer = null
  }

  function clearAutoPlayTimer() {
    if (!autoPlayTimer) {
      return
    }

    clearTimeout(autoPlayTimer)
    autoPlayTimer = null
  }

  function bindAudioContext(context: UniApp.InnerAudioContext) {
    context.onEnded(() => {
      if (audioContext !== context) {
        return
      }

      isVoicePlaying.value = false
    })

    context.onStop(() => {
      if (audioContext !== context) {
        return
      }

      isVoicePlaying.value = false
    })

    context.onError((error) => {
      if (audioContext !== context) {
        return
      }

      isVoicePlaying.value = false
      showToast(getErrorMessage(error, '音频播放失败'))
    })
  }

  function destroyQuestionAudio() {
    const current = audioContext
    audioContext = null
    audioContextSrc = ''
    isVoicePlaying.value = false

    if (!current) {
      return
    }

    try {
      current.stop()
    } catch {
      // ignore stop errors during teardown
    }

    try {
      current.destroy()
    } catch {
      // ignore destroy errors during teardown
    }
  }

  function ensureAudioContext(src: string) {
    if (audioContext && audioContextSrc === src) {
      return audioContext
    }

    destroyQuestionAudio()

    const context = uni.createInnerAudioContext()
    context.src = src
    bindAudioContext(context)

    audioContext = context
    audioContextSrc = src
    return context
  }

  function stopQuestionAudio() {
    if (!audioContext) {
      return
    }

    isVoicePlaying.value = false
    audioContext.stop()
  }

  function replayVoice(options: ReplayVoiceOptions = {}) {
    isVoicePressed.value = true
    clearPressTimer()

    pressTimer = setTimeout(() => {
      isVoicePressed.value = false
    }, 240)

    if (!audioSrc.value) {
      if (!options.silentWhenMissing) {
        showToast('题干音频未就绪，请先配置地址或完成生成')
      }
      return
    }

    try {
      const context = ensureAudioContext(audioSrc.value)
      if (audioContextSrc === audioSrc.value) {
        try {
          context.seek(0)
        } catch {
          // 某些平台刚切流时 seek 可能失败，直接 play 即可。
        }
      }

      isVoicePlaying.value = true
      context.play()
    } catch (error) {
      destroyQuestionAudio()
      showToast(getErrorMessage(error, '音频播放失败'))
    }
  }

  function scheduleAutoPlay(delay = 260) {
    clearAutoPlayTimer()

    autoPlayTimer = setTimeout(() => {
      replayVoice({ silentWhenMissing: true })
    }, delay)
  }

  function clearTimers() {
    clearPressTimer()
    clearAutoPlayTimer()
  }

  function cleanup() {
    clearTimers()
    destroyQuestionAudio()
  }

  return {
    canReplayVoice,
    cleanup,
    isVoicePlaying,
    isVoicePressed,
    replayVoice,
    scheduleAutoPlay,
    stopQuestionAudio,
  }
}
