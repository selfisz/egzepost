import { GAP, clean } from '../text'

export const MAX_CONTEXT = 600

/** Sentence boundaries that are not abbreviations (art., pkt, ust., lit., poz., r., nr). */
const SENTENCE_END = /(?<!\b(?:art|pkt|ust|lit|poz|nr|r|tj|np|m\.in|zm|Dz|U|ze zm))\.\s+(?=\p{Lu}|§)/gu

export function sentences(text: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = []
  let start = 0
  SENTENCE_END.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = SENTENCE_END.exec(text))) {
    out.push({ start, end: m.index + 1 })
    start = m.index + m[0].length
  }
  out.push({ start, end: text.length })
  return out
}

/** The text itself if short enough, else the sentence containing `index`, marked with ellipses. */
export function focus(text: string, index: number, max = MAX_CONTEXT): string | null {
  if (text.length <= max) return text
  const s = sentences(text).find((x) => index >= x.start && index < x.end)
  if (!s) return null
  const body = clean(text.slice(s.start, s.end))
  if (body.length > max) return null
  return `${s.start > 0 ? '… ' : ''}${body}${s.end < text.length ? ' …' : ''}`
}

/** Replace the first occurrence of `needle` in `text` with the gap marker. */
export function gap(text: string, needle: string): string | null {
  const i = text.indexOf(needle)
  if (i < 0) return null
  return `${text.slice(0, i)}${GAP}${text.slice(i + needle.length)}`
}

export function quoteCtx(s: string): string {
  return `„${s}”`
}
