import { computed, ref, type ComputedRef } from 'vue'
import { destroyAudio, getErrorMessage, playAudio, showToast, stopAudio } from '@/utils'

interface ReplayVoiceOptions {
  silentWhenMissing?: boolean
}

/**
 * 题干音频播放控制：
 * - 管理按压态和播放态
 * - 负责自动播放调度
 * - 统一清理音频上下文和定时器
 */
export function useListenPickAudio(audioSrc: ComputedRef<string>) {
  const isVoicePressed = ref(false)
  const isVoicePlaying = ref(false)
  const canReplayVoice = computed(() => !!audioSrc.value)

  let pressTimer: ReturnType<typeof setTimeout> | null = null
  let autoPlayTimer: ReturnType<typeof setTimeout> | null = null
  let activeAudioContext: UniApp.InnerAudioContext | null = null
  let boundAudioContext: UniApp.InnerAudioContext | null = null

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

  function stopQuestionAudio() {
    isVoicePlaying.value = false
    activeAudioContext = null
    stopAudio()
  }

  function destroyQuestionAudio() {
    isVoicePlaying.value = false
    activeAudioContext = null
    boundAudioContext = null
    destroyAudio()
  }

  function bindQuestionAudioContext(context: UniApp.InnerAudioContext) {
    activeAudioContext = context
    isVoicePlaying.value = true

    if (boundAudioContext === context) {
      return
    }

    boundAudioContext = context

    const clearWhenCurrent = () => {
      if (activeAudioContext !== context) {
        return
      }

      activeAudioContext = null
      isVoicePlaying.value = false
    }

    context.onEnded(clearWhenCurrent)
    context.onStop(clearWhenCurrent)
    context.onError(() => {
      clearWhenCurrent()
      showToast('音频播放失败')
    })
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
      const context = playAudio(audioSrc.value)
      bindQuestionAudioContext(context)
    } catch (error) {
      stopQuestionAudio()
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
