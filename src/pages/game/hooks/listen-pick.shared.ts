import type { CardLite } from '@/api'

export interface ListenPickQuery {
  categoryId?: unknown
  categoryName?: unknown
  categoryKeyword?: unknown
  gameName?: unknown
  audioFormat?: unknown
}

export interface GameCard {
  id: string
  name: string
  image: string
}

export interface GameTemplate {
  templateId: string
  templateText: string
}

export type AudioFormat = 'mp3' | 'wav' | 'pcm'

export const FALLBACK_CATEGORY_KEYWORD = '动物'
export const FALLBACK_CATEGORY_NAME = '动物认知'
export const CARD_PAGE_SIZE = 100
export const CARD_MAX_PAGES = 20
export const DEFAULT_GAME_NAME = 'listen-pick'
export const DEFAULT_AUDIO_FORMAT: AudioFormat = 'mp3'

export const GAME_TEMPLATES: GameTemplate[] = [
  { templateId: 't1', templateText: '小朋友，请问下面哪一张是“%s”呢？' },
  { templateId: 't2', templateText: '请指出下面“%s”的图片。' },
  { templateId: 't3', templateText: '点一点“%s”吧。' },
  { templateId: 't4', templateText: '“%s”在哪里？请选出来。' },
]

export const DEFAULT_TEMPLATE = GAME_TEMPLATES[0]

export function normalizeBaseUrl(value: unknown) {
  return String(value || '').trim().replace(/\/+$/, '')
}

export function sanitizePathSegment(value: string, fallback: string) {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || fallback
}

export function decodeQueryValue(value: unknown) {
  const raw = readQueryValue(value)
  if (!raw) {
    return ''
  }

  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function readQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return readQueryValue(value[0])
  }

  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

export function applyTemplate(templateText: string, targetName: string) {
  const normalizedTemplate = templateText || DEFAULT_TEMPLATE.templateText
  const replacement = targetName || '目标'
  return normalizedTemplate.replace(/%s/g, replacement)
}

export function pickRandom<T>(list: T[]) {
  if (list.length <= 0) {
    return null
  }

  const index = Math.floor(Math.random() * list.length)
  return list[index] || null
}

export function shuffleArray<T>(list: T[]) {
  const copied = [...list]

  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copied[i], copied[j]] = [copied[j], copied[i]]
  }

  return copied
}

export function toGameCard(card: CardLite): GameCard | null {
  const id = String(card?._id || '').trim()
  const name = String(card?.name || '').trim()
  const image = String(card?.image || '').trim()

  if (!id || !name) {
    return null
  }

  return {
    id,
    name,
    image,
  }
}

export function extractStorageBase(rawUrl: string) {
  const normalized = String(rawUrl || '').trim()
  if (!/^https?:\/\//i.test(normalized)) {
    return ''
  }

  try {
    const url = new URL(normalized)
    const pathname = url.pathname || ''

    const splitMarks = ['/image/', '/audio/', '/video/']
    for (const mark of splitMarks) {
      const index = pathname.indexOf(mark)
      if (index > 0) {
        return normalizeBaseUrl(`${url.origin}${pathname.slice(0, index)}`)
      }
    }

    const segments = pathname.split('/').filter(Boolean)
    if (segments.length >= 2) {
      return normalizeBaseUrl(`${url.origin}/${segments[0]}`)
    }

    return normalizeBaseUrl(url.origin)
  } catch {
    return ''
  }
}

export function detectAudioBaseFromCards(cards: GameCard[], configuredBase: string) {
  if (configuredBase) {
    return configuredBase
  }

  return cards.map((item) => extractStorageBase(item.image)).find(Boolean) || ''
}

export function buildSessionTargetQueue(cards: GameCard[]) {
  return shuffleArray(cards.map((item) => item.id))
}
