import { emptyResult, type DraftOption, type ExtractResult } from './draft'
import {
  LADDER,
  durationSpellings,
  formatDuration,
  parseDeadlines,
  sameDuration,
  type DeadlineHit,
  type Duration,
} from './deadline-parse'
import { focus, gap, quoteCtx } from './common'
import { Citation, sourceOf, type Corpus, type Unit } from './units'
import { hasArtifacts, isRepealed, shuffle, tooSimilar } from '../text'

export type DeadlineFact = { unit: Unit; hit: DeadlineHit }

/** Start event must be a short noun phrase that ends at punctuation, not a run-on clause. */
function crispStart(s: string): boolean {
  const words = s.split(' ').length
  const tail = s.split(' ').slice(3)
  return words >= 3 && words <= 8 && !tail.some((w) => ['nie', 'może', 'jeżeli', 'organ', 'strona'].includes(w))
}

/** `od dnia jego doręczenia` only makes sense inside its own sentence — never as a distractor. */
const ANAPHORA = /\b(jego|jej|ich|tego|tej|tych)\b/u

/** Units stating exactly one deadline (counting descendants) — otherwise the question is ambiguous. */
export function findDeadlines(corpus: Corpus): { facts: DeadlineFact[]; ambiguous: Unit[] } {
  const facts: DeadlineFact[] = []
  const ambiguous: Unit[] = []
  for (const u of corpus.units) {
    if (isRepealed(u.text)) continue
    const own = parseDeadlines(u.text)
    if (own.length === 0) continue
    const all = parseDeadlines(u.fullText)
    if (own.length !== 1 || all.length !== 1) {
      ambiguous.push(u)
      continue
    }
    facts.push({ unit: u, hit: own[0] })
  }
  return { facts, ambiguous }
}

function distractorValues(d: Duration, seed: string): Duration[] {
  const ladder = LADDER[d.unit].filter((n) => n !== d.n)
  return shuffle(ladder, seed).map((n) => ({ n, unit: d.unit }))
}

export function extractDeadlines(corpus: Corpus): ExtractResult {
  const res = emptyResult()
  const { facts, ambiguous } = findDeadlines(corpus)
  for (const u of ambiguous) {
    res.rejected.push({ type: 'deadline', reason: 'kilka terminów w jednej jednostce', articleId: u.article.id, detail: u.path })
  }

  for (const f of facts) {
    const { unit, hit } = f
    const aid = unit.article.id
    if (hasArtifacts(unit.text)) {
      res.rejected.push({ type: 'deadline', reason: 'artefakt importu', articleId: aid, detail: unit.path })
      continue
    }
    const ctxBase = focus(unit.text, hit.index)
    if (!ctxBase) {
      res.rejected.push({ type: 'deadline', reason: 'zdanie za długie', articleId: aid, detail: unit.path })
      continue
    }
    const src = sourceOf(unit)
    const cite = Citation(unit)
    const correct = formatDuration(hit.duration)

    const values = distractorValues(hit.duration, unit.article.id + unit.path)
      .filter((v) => !sameDuration(v, hit.duration))
      .slice(0, 3)
    const ctx = gap(ctxBase, hit.valueText)
    if (ctx && values.length >= 2) {
      res.drafts.push({
        id: `deadline:value:${aid}:${unit.path}`,
        type: 'deadline',
        variant: 'value',
        format: 'single',
        difficulty: 2,
        actId: unit.act.id,
        articleId: aid,
        prompt: `Jaki termin przewiduje ${cite}?`,
        context: quoteCtx(ctx),
        answer: `${correct}${hit.start && crispStart(hit.start) ? ` (${hit.start})` : ''}`,
        hidden: [hit.valueText],
        sources: [src],
        options: [
          { text: correct, correct: true, present: [{ text: hit.phrase }] },
          ...values.map<DraftOption>((v) => ({
            text: formatDuration(v),
            correct: false,
            note: `${cite} przewiduje ${correct}, nie ${formatDuration(v)}.`,
            absent: durationSpellings(v).map((text) => ({ text })),
          })),
        ],
      })
    }

    if (!hit.start || !crispStart(hit.start)) continue
    const startCtx = gap(ctxBase, hit.start)
    if (!startCtx) continue
    const others = facts.filter(
      (o) =>
        o !== f && o.unit.act.id === unit.act.id && o.hit.start && crispStart(o.hit.start) &&
        !ANAPHORA.test(o.hit.start),
    )
    const starts: { text: string; from: Unit }[] = []
    for (const o of shuffle(others, `${aid}${unit.path}:start`)) {
      const s = o.hit.start!
      if (tooSimilar(s, hit.start, 0.6)) continue
      if (starts.some((x) => tooSimilar(x.text, s, 0.6))) continue
      starts.push({ text: s, from: o.unit })
      if (starts.length === 3) break
    }
    if (starts.length < 3) {
      res.rejected.push({ type: 'deadline', reason: 'za mało dystraktorów zdarzenia początkowego', articleId: aid, detail: unit.path })
      continue
    }
    res.drafts.push({
      id: `deadline:start:${aid}:${unit.path}`,
      type: 'deadline',
      variant: 'start',
      format: 'single',
      difficulty: 3,
      actId: unit.act.id,
      articleId: aid,
      prompt: `Od jakiego zdarzenia liczy się termin ${correct} w ${cite.replace(/^Art/, 'art')}?`,
      context: quoteCtx(startCtx),
      answer: hit.start,
      hidden: [hit.start],
      sources: [src],
      options: [
        { text: hit.start, correct: true, present: [{ text: hit.start }] },
        ...starts.map<DraftOption>((s) => ({
          text: s.text,
          correct: false,
          note: `Tak liczy się termin w ${Citation(s.from).replace(/^Art/, 'art')}.`,
          absent: [{ text: s.text }],
        })),
      ],
    })
  }
  return res
}
