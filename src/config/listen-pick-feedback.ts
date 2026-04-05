import type {
  FeedbackAudioItem,
  ListenPickFeedbackConfig,
  ListenPickFeedbackTtsConfig,
} from '@/api'

export const DEFAULT_LISTEN_PICK_CORRECT_TEXTS = ['真棒', '真厉害', '太棒了']
export const DEFAULT_LISTEN_PICK_WRONG_TEXTS = ['不对哦', '再想想', '再试试呢']
export const DEFAULT_LISTEN_PICK_FEEDBACK_TTS: ListenPickFeedbackTtsConfig = {
  voice: 'zhibei_emo',
  speechRate: -110,
  pitchRate: 130,
  volume: 60,
  format: 'mp3',
  sampleRate: 16000,
  emotionCategory: '',
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function dedupeTexts(values: unknown[] | null | undefined, fallback: string[]) {
  const source = Array.isArray(values) ? values : []
  const deduped: string[] = []
  const seen = new Set<string>()

  for (const value of source) {
    const text = normalizeText(value)
    if (!text || seen.has(text)) {
      continue
    }

    seen.add(text)
    deduped.push(text)
  }

  if (deduped.length > 0) {
    return deduped
  }

  return [...fallback]
}

function normalizeInteger(value: unknown, fallback: number) {
  const raw = normalizeText(value)
  if (!raw) {
    return fallback
  }

  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) {
    return fallback
  }

  return parsed
}

function normalizeFormat(value: unknown): ListenPickFeedbackTtsConfig['format'] {
  const format = normalizeText(value).toLowerCase()
  if (format === 'wav' || format === 'pcm') {
    return format
  }
  return 'mp3'
}

function normalizeSampleRate(value: unknown): ListenPickFeedbackTtsConfig['sampleRate'] {
  const sampleRate = normalizeInteger(value, DEFAULT_LISTEN_PICK_FEEDBACK_TTS.sampleRate)
  if (sampleRate === 8000 || sampleRate === 16000 || sampleRate === 24000 || sampleRate === 48000) {
    return sampleRate
  }
  return DEFAULT_LISTEN_PICK_FEEDBACK_TTS.sampleRate
}

export function normalizeListenPickFeedbackTtsConfig(
  value?: Partial<ListenPickFeedbackTtsConfig> | Record<string, unknown> | null,
): ListenPickFeedbackTtsConfig {
  const record = value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}

  return {
    voice: normalizeText(record.voice) || DEFAULT_LISTEN_PICK_FEEDBACK_TTS.voice,
    speechRate: normalizeInteger(record.speechRate, DEFAULT_LISTEN_PICK_FEEDBACK_TTS.speechRate),
    pitchRate: normalizeInteger(record.pitchRate, DEFAULT_LISTEN_PICK_FEEDBACK_TTS.pitchRate),
    volume: normalizeInteger(record.volume, DEFAULT_LISTEN_PICK_FEEDBACK_TTS.volume),
    format: normalizeFormat(record.format),
    sampleRate: normalizeSampleRate(record.sampleRate),
    emotionCategory: normalizeText(record.emotionCategory),
  }
}

export function normalizeFeedbackAudioItems(value: unknown): FeedbackAudioItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized: FeedbackAudioItem[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const record = item as Record<string, unknown>
    const key = normalizeText(record.key)
    const text = normalizeText(record.text)
    const audio = normalizeText(record.audio)

    if (!key && !text && !audio) {
      continue
    }

    normalized.push({
      key,
      text,
      audio,
    })
  }

  return normalized
}

export function normalizeListenPickFeedbackConfig(
  value?: Partial<ListenPickFeedbackConfig> | null,
): ListenPickFeedbackConfig {
  return {
    autoNextOnCorrect: value?.autoNextOnCorrect !== false,
    correctTexts: dedupeTexts(value?.correctTexts, DEFAULT_LISTEN_PICK_CORRECT_TEXTS),
    wrongTexts: dedupeTexts(value?.wrongTexts, DEFAULT_LISTEN_PICK_WRONG_TEXTS),
    tts: normalizeListenPickFeedbackTtsConfig(value?.tts),
    correctAudios: normalizeFeedbackAudioItems(value?.correctAudios),
    wrongAudios: normalizeFeedbackAudioItems(value?.wrongAudios),
  }
}

export function feedbackTextsToTextarea(texts: string[]) {
  return dedupeTexts(texts, []).join('\n')
}

export function parseFeedbackTextarea(value: string, fallback: string[]) {
  return dedupeTexts(String(value || '').split(/\r?\n/), fallback)
}

export function countGeneratedFeedbackAudios(items: FeedbackAudioItem[]) {
  return normalizeFeedbackAudioItems(items).filter((item) => normalizeText(item.audio)).length
}
