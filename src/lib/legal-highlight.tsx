import type { ReactNode } from 'react'

const TERM =
  /\b(\d+\s*dni|\d+\s*dzie[nń]|\d+\s*miesi[aą]c(?:e|y)?|\d+\s*tygodni(?:e)?|niezwłocznie|co najmniej|bezzwłocznie)\b/giu

const DECISION =
  /\b(postanowieni(?:e|a|u)|decyzj(?:a|i|ę)|zażalen(?:ie|ia|iu)|zarzut(?:y|u|em)?|skarg(?:a|i|ę)|tytuł(?:u|em)?\s+wykonawcz(?:y|ego|ym)|egzekucj(?:a|i)|zajęci(?:e|a)|wierzyciel(?:a|owi)?|zobowiązan(?:y|ego|emu)|organ egzekucyjny)\b/giu

const EXCEPTION =
  /\b(chyba że|z zastrzeżeniem|nie stosuje się|pod rygorem|z wyjątkiem|o ile|jeżeli przepisy(?:\s+\w+){0,4}\s+nie stanowią inaczej)\b/giu

const CROSS_REF =
  /\b((?:art\.|artykuł)\s*\d+[a-z]?(?:\s*[§]\s*\d+[a-z]?)?|(?:§\s*\d+[a-z]?))\b/giu

export type HighlightSegment =
  | { kind: 'text'; value: string }
  | { kind: 'term'; value: string }
  | { kind: 'decision'; value: string }
  | { kind: 'exception'; value: string }
  | { kind: 'xref'; value: string }
  | { kind: 'mark'; value: string }

type Span = { start: number; end: number; kind: Exclude<HighlightSegment['kind'], 'text' | 'mark'> }

function collect(regex: RegExp, kind: Span['kind'], text: string, into: Span[]) {
  regex.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text))) {
    into.push({ start: m.index, end: m.index + m[0].length, kind })
  }
}

function mergeSpans(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end)
  const out: Span[] = []
  for (const s of sorted) {
    const last = out[out.length - 1]
    if (last && s.start < last.end) continue
    out.push(s)
  }
  return out
}

function applyMark(segments: HighlightSegment[], query: string): HighlightSegment[] {
  const q = query.trim()
  if (!q || q.length < 2) return segments
  const out: HighlightSegment[] = []
  const qLower = q.toLocaleLowerCase('pl')
  for (const seg of segments) {
    if (seg.kind !== 'text' && seg.kind !== 'term' && seg.kind !== 'decision' && seg.kind !== 'exception') {
      out.push(seg)
      continue
    }
    const value = seg.value
    const lower = value.toLocaleLowerCase('pl')
    let i = 0
    let idx = lower.indexOf(qLower, i)
    if (idx < 0) {
      out.push(seg)
      continue
    }
    while (idx >= 0) {
      if (idx > i) {
        const before = value.slice(i, idx)
        out.push(seg.kind === 'text' ? { kind: 'text', value: before } : { ...seg, value: before })
      }
      out.push({ kind: 'mark', value: value.slice(idx, idx + q.length) })
      i = idx + q.length
      idx = lower.indexOf(qLower, i)
    }
    if (i < value.length) {
      const rest = value.slice(i)
      out.push(seg.kind === 'text' ? { kind: 'text', value: rest } : { ...seg, value: rest })
    }
  }
  return out
}

export function segmentLegalText(text: string, query = ''): HighlightSegment[] {
  const spans = mergeSpans([
    ...(() => {
      const s: Span[] = []
      collect(TERM, 'term', text, s)
      collect(DECISION, 'decision', text, s)
      collect(EXCEPTION, 'exception', text, s)
      collect(CROSS_REF, 'xref', text, s)
      return s
    })(),
  ])

  const segments: HighlightSegment[] = []
  let cursor = 0
  for (const s of spans) {
    if (s.start > cursor) segments.push({ kind: 'text', value: text.slice(cursor, s.start) })
    segments.push({ kind: s.kind, value: text.slice(s.start, s.end) })
    cursor = s.end
  }
  if (cursor < text.length) segments.push({ kind: 'text', value: text.slice(cursor) })
  return applyMark(segments, query)
}

export function parseXrefTarget(
  value: string,
  currentActId: string,
  currentArticleNumber: string,
): { actId: string; number: string } | null {
  const art = value.match(/art(?:ykuł|\.)?\s*(\d+[a-z]?)/i)
  if (art) return { actId: currentActId, number: art[1] }
  const para = value.match(/§\s*(\d+[a-z]?)/i)
  if (para) return { actId: currentActId, number: currentArticleNumber }
  return null
}

type RenderOpts = {
  query?: string
  onXref?: (raw: string) => void
}

export function renderLegalText(text: string, opts: RenderOpts = {}): ReactNode {
  const segments = segmentLegalText(text, opts.query ?? '')
  return segments.map((seg, i) => {
    switch (seg.kind) {
      case 'mark':
        return (
          <mark key={i} className="search-hit">
            {seg.value}
          </mark>
        )
      case 'term':
        return (
          <span
            key={i}
            className="rounded bg-amber-500/15 px-1 font-semibold text-amber-800 dark:text-amber-300"
          >
            {seg.value}
          </span>
        )
      case 'decision':
        return (
          <span
            key={i}
            className="rounded bg-blue-500/15 px-1 font-medium text-blue-800 dark:text-blue-300"
          >
            {seg.value}
          </span>
        )
      case 'exception':
        return (
          <span
            key={i}
            className="underline decoration-rose-500 decoration-dashed underline-offset-4"
          >
            {seg.value}
          </span>
        )
      case 'xref':
        return (
          <button
            key={i}
            type="button"
            className="rounded bg-slate-200/80 px-1 font-mono text-[0.92em] font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-zinc-800 dark:text-indigo-300 dark:hover:bg-zinc-700"
            onClick={(e) => {
              e.stopPropagation()
              opts.onXref?.(seg.value)
            }}
          >
            {seg.value}
          </button>
        )
      default:
        return <span key={i}>{seg.value}</span>
    }
  })
}
