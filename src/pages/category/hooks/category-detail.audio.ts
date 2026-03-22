import { ref } from 'vue'
import { getErrorMessage, playAudio, showToast, stopAudio } from '@/utils'

type AudioType = '' | 'cn' | 'en'
type PronunciationType = Exclude<AudioType, ''>

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

  /** 停止当前播放音频 */
  function stopPlayingAudio() {
    playingAudioType.value = ''
    activeAudioContext = null
    stopAudio()
  }

  /** 绑定音频状态事件 */
  function bindAudioContext(context: UniApp.InnerAudioContext, type: PronunciationType) {
    activeAudioContext = context
    playingAudioType.value = type

    const clearWhenCurrent = () => {
      if (activeAudioContext !== context) {
        return
      }

      activeAudioContext = null
      playingAudioType.value = ''
    }

    context.onEnded(clearWhenCurrent)
    context.onStop(clearWhenCurrent)
    context.onError(() => {
      clearWhenCurrent()
      showToast('音频播放失败')
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
      bindAudioContext(context, type)
    } catch (error) {
      stopPlayingAudio()
      showToast(getErrorMessage(error, '音频播放失败'))
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
    playingAudioType,
    playChinesePronunciation,
    playEnglishPronunciation,
    stopPlayingAudio,
  }
}
