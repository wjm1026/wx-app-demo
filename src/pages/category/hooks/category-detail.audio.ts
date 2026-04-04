import { ref } from 'vue'
import { destroyAudio, getErrorMessage, playAudio, showToast, stopAudio } from '@/utils'

type AudioType = '' | 'cn' | 'en'
export type PronunciationType = Exclude<AudioType, ''>
export type PronunciationOnceResult = 'played-ended' | 'played-stopped' | 'missing' | 'failed'

interface PlayPronunciationOnceOptions {
  silentWhenMissing?: boolean
  suppressErrorToast?: boolean
}

interface DetailAudioControllerOptions {
  /** 当前是否允许播放（例如详情加载中/错误态时不可播放） */
  canPlay: () => boolean
  /** 按发音类型返回音频地址 */
  getSource: (type: PronunciationType) => string
}

/** 分类详情页音频播放控制 */
export function useDetailAudioController(options: DetailAudioControllerOptions) {
  const playingAudioType = ref<AudioType>('')
  let activeAudioContext: UniApp.InnerAudioContext | null = null
  let boundAudioContext: UniApp.InnerAudioContext | null = null
  let shouldShowErrorToast = true
  let oncePlaybackResolver: ((result: PronunciationOnceResult) => void) | null = null
  let oncePlaybackContext: UniApp.InnerAudioContext | null = null

  function resolveOncePlayback(result: PronunciationOnceResult, context?: UniApp.InnerAudioContext) {
    if (!oncePlaybackResolver) {
      return
    }

    if (context && oncePlaybackContext && oncePlaybackContext !== context) {
      return
    }

    const resolver = oncePlaybackResolver
    oncePlaybackResolver = null
    oncePlaybackContext = null
    resolver(result)
  }

  function createOncePlaybackPromise(context: UniApp.InnerAudioContext) {
    resolveOncePlayback('played-stopped')
    oncePlaybackContext = context
    return new Promise<PronunciationOnceResult>((resolve) => {
      oncePlaybackResolver = resolve
    })
  }

  /** 停止当前播放音频 */
  function stopPlayingAudio() {
    resolveOncePlayback('played-stopped')
    playingAudioType.value = ''
    activeAudioContext = null
    stopAudio()
  }

  /** 页面卸载时销毁音频实例，避免遗留原生播放器和旧事件监听 */
  function destroyPlayingAudio() {
    resolveOncePlayback('played-stopped')
    playingAudioType.value = ''
    activeAudioContext = null
    boundAudioContext = null
    destroyAudio()
  }

  /** 绑定音频状态事件 */
  function bindAudioContext(
    context: UniApp.InnerAudioContext,
    type: PronunciationType,
    optionsForBind: { showErrorToast?: boolean } = {},
  ) {
    activeAudioContext = context
    playingAudioType.value = type
    shouldShowErrorToast = optionsForBind.showErrorToast !== false

    if (boundAudioContext === context) {
      return
    }

    boundAudioContext = context

    const clearWhenCurrent = (result: PronunciationOnceResult) => {
      if (activeAudioContext !== context) {
        return false
      }

      activeAudioContext = null
      playingAudioType.value = ''
      resolveOncePlayback(result, context)
      return true
    }

    context.onEnded(() => clearWhenCurrent('played-ended'))
    context.onStop(() => clearWhenCurrent('played-stopped'))
    context.onError(() => {
      const isCurrentContext = clearWhenCurrent('failed')
      if (isCurrentContext && shouldShowErrorToast) {
        showToast('音频播放失败')
      }
    })
  }

  /** 播放发音 */
  function playPronunciation(type: PronunciationType) {
    if (!options.canPlay()) {
      return
    }

    const source = options.getSource(type)
    if (!source) {
      showToast(type === 'cn' ? '暂无中文发音' : '暂无英文发音')
      return
    }

    if (playingAudioType.value === type) {
      stopPlayingAudio()
      return
    }

    try {
      const context = playAudio(source)
      bindAudioContext(context, type, { showErrorToast: true })
    } catch (error) {
      stopPlayingAudio()
      showToast(getErrorMessage(error, '音频播放失败'))
    }
  }

  /** 播放一次发音并等待结束结果（用于自动播放编排） */
  async function playPronunciationOnce(
    type: PronunciationType,
    optionsForPlay: PlayPronunciationOnceOptions = {},
  ): Promise<PronunciationOnceResult> {
    if (!options.canPlay()) {
      return 'failed'
    }

    const source = options.getSource(type)
    if (!source) {
      if (!optionsForPlay.silentWhenMissing) {
        showToast(type === 'cn' ? '暂无中文发音' : '暂无英文发音')
      }
      return 'missing'
    }

    try {
      const context = playAudio(source)
      const oncePlaybackResult = createOncePlaybackPromise(context)
      bindAudioContext(context, type, {
        showErrorToast: !optionsForPlay.suppressErrorToast,
      })
      return await oncePlaybackResult
    } catch (error) {
      stopPlayingAudio()
      if (!optionsForPlay.suppressErrorToast) {
        showToast(getErrorMessage(error, '音频播放失败'))
      }
      return 'failed'
    }
  }

  /** 播放中文发音 */
  function playChinesePronunciation() {
    playPronunciation('cn')
  }

  /** 播放英文发音 */
  function playEnglishPronunciation() {
    playPronunciation('en')
  }

  return {
    destroyPlayingAudio,
    playingAudioType,
    playChinesePronunciation,
    playEnglishPronunciation,
    playPronunciationOnce,
    stopPlayingAudio,
  }
}
