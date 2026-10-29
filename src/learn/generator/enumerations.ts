import { emptyResult, type DraftOption, type ExtractResult } from './draft'
import { quoteCtx } from './common'
import { Citation, sourceOf, type Corpus, type Unit } from './units'
import type { QuestionType } from '../model'
import { hasArtifacts, isRepealed, norm, shuffle, tooSimilar, trimItem } from '../text'

export type ListKind = Extract<QuestionType, 'conditions' | 'enumeration' | 'exception'>

export type EnumList = {
  unit: Unit
  intro: string
  kind: ListKind
  open: boolean
  /** Self-contained items usable as options. */
  items: { text: string; unit: Unit }[]
  /** All live items incl. ones with sub-lists (for distractor exclusion). */
  allItems: string[]
}

const OPEN_RE = /w szczególności|między innymi|\bm\.in\.|\bnp\.|w tym:?$|innych niż/iu
const EXCEPTION_RE = /nie stosuje się|z wyjątkiem|nie dotyczy|wyłącza się|nie podlegają|nie podlega/iu
const CONDITION_TAIL_RE = /(jeżeli|gdy|w przypadku|w przypadkach|w razie)\s*:$/iu
const CONDITION_RE = /(^|\s)(podstaw|przesłank)\p{L}*/iu

export function classifyIntro(intro: string): ListKind {
  if (EXCEPTION_RE.test(intro)) return 'exception'
  if (CONDITION_TAIL_RE.test(intro.trim()) || CONDITION_RE.test(intro)) return 'conditions'
  return 'enumeration'
}

export function findLists(corpus: Corpus): EnumList[] {
  const out: EnumList[] = []
  for (const u of corpus.units) {
    if (!u.text.endsWith(':') || u.children.length < 3) continue
    const kids = u.children.filter((c) => !isRepealed(c.text))
    if (kids.length < 3) continue
    const items = kids
      .filter((c) => c.children.length === 0 && !c.text.includes(':') && !hasArtifacts(c.text))
      .map((c) => ({ text: trimItem(c.text), unit: c }))
      .filter((x) => x.text.length >= 8 && x.text.length <= 200)
    out.push({
      unit: u,
      intro: u.text,
      kind: classifyIntro(u.text),
      open: OPEN_RE.test(u.text),
      items,
      allItems: kids.map((c) => trimItem(c.text)),
    })
  }
  return out
}

const WEAK_TAIL = new Set(['również', 'także', 'też', 'się', 'jest', 'są', 'w', 'z', 'do', 'o', 'na', 'dla', 'od', 'przez'])

/** A foreign item reused across many lists becomes recognisable as "the usual wrong answer". */
const MAX_DISTRACTOR_USES = 3

function introTail(intro: string): string {
  const t = norm(intro).replace(/:$/, '').split(' ').slice(-1)[0]
  return WEAK_TAIL.has(t) ? `~${intro}` : t
}

const PREPOSITION = /^(w|we|z|ze|za|na|do|o|od|po|przy|przez|dla|u|wobec)$/u

function firstSuffix(item: string): string {
  const [first, second = ''] = norm(item).split(' ')
  return PREPOSITION.test(first) ? `${first} ${second.slice(-2)}` : first.slice(-2)
}

function introOk(l: EnumList): string | null {
  if (hasArtifacts(l.intro)) return 'artefakt importu'
  if (l.intro.length < 15) return 'wprowadzenie wyliczenia zbyt ogólne'
  if (l.intro.length > 400) return 'wprowadzenie za długie'
  if (l.unit.kind === 'letter') return 'wyliczenie zbyt głęboko zagnieżdżone'
  if (/w drodze rozporządzenia/iu.test(l.intro)) return 'upoważnienie do rozporządzenia'
  return null
}

const LIST_LABEL: Record<ListKind, string> = {
  conditions: 'przesłanki / przypadki',
  enumeration: 'elementy',
  exception: 'wyłączenia',
}

export function extractEnumerations(corpus: Corpus): ExtractResult {
  const res = emptyResult()
  const lists = findLists(corpus)
  const uses = new Map<string, number>()
  for (const l of lists) {
    const aid = l.unit.article.id
    const why = introOk(l)
    if (why) {
      res.rejected.push({ type: l.kind, reason: why, articleId: aid, detail: l.unit.path })
      continue
    }
    const cite = Citation(l.unit)
    const src = sourceOf(l.unit)
    const base = { type: l.kind, actId: l.unit.act.id, articleId: aid, sources: [src] }

    if (l.open) {
      // Open list: no "not listed" test is verifiable. Flashcard only, when short enough to recall.
      if (l.allItems.length > 8 || l.items.length !== l.allItems.length) {
        res.rejected.push({ type: l.kind, reason: 'lista otwarta i zbyt długa na fiszkę', articleId: aid, detail: l.unit.path })
        continue
      }
      res.drafts.push({
        ...base,
        id: `${l.kind}:recall:${aid}:${l.unit.path}`,
        variant: 'recall',
        format: 'flashcard',
        difficulty: 3,
        prompt: `Wymień ${LIST_LABEL[l.kind]} z ${cite.replace(/^Art/, 'art')} (lista przykładowa).`,
        context: quoteCtx(l.intro),
        answer: l.items.map((x, i) => `${i + 1}) ${x.text}`).join('\n'),
      })
      continue
    }

    if (l.items.length < 3) {
      res.rejected.push({ type: l.kind, reason: 'za mało samodzielnych punktów', articleId: aid, detail: l.unit.path })
      continue
    }

    // Distractors must fit the list grammatically, or the right answers are guessable by case/form.
    const myTail = introTail(l.intro)
    const suffixes = new Set(l.items.map((x) => firstSuffix(x.text)))
    const myChapter = l.unit.article.chapter ?? ''
    const score = (o: EnumList) =>
      2 * Number(introTail(o.intro) === myTail) +
      2 * Number((o.unit.article.chapter ?? '') === myChapter) +
      Number(o.kind === l.kind)
    const foreign: { text: string; from: Unit }[] = []
    const candidates = shuffle(
      lists.filter(
        (o) => o !== l && !o.open && o.unit.act.id === l.unit.act.id && o.unit.article.id !== aid,
      ),
      `${aid}${l.unit.path}`,
    ).sort((a, b) => score(b) - score(a))
    for (const o of candidates) {
      for (const it of shuffle(o.items, o.unit.path)) {
        if (it.text.length > 160 || it.text.split(' ').length < 3) continue
        if (!suffixes.has(firstSuffix(it.text))) continue
        if (l.allItems.some((x) => tooSimilar(x, it.text))) continue
        if (foreign.some((x) => tooSimilar(x.text, it.text))) continue
        if (norm(l.unit.fullText).includes(norm(it.text))) continue
        const key = norm(it.text)
        if ((uses.get(key) ?? 0) >= MAX_DISTRACTOR_USES) continue
        uses.set(key, (uses.get(key) ?? 0) + 1)
        foreign.push({ text: it.text, from: it.unit })
        break
      }
      if (foreign.length >= 3) break
    }

    const listed = shuffle(l.items, `${aid}${l.unit.path}:items`)
    const wrongOpt = (f: { text: string; from: Unit }, correct: boolean): DraftOption => ({
      text: f.text,
      correct,
      note: `Tego ${cite.replace(/^Art/, 'art')} nie wymienia — pochodzi z ${Citation(f.from).replace(/^Art/, 'art')}.`,
      absent: [{ text: f.text }],
    })
    const listedOpt = (x: { text: string; unit: Unit }, correct: boolean): DraftOption => ({
      text: x.text,
      correct,
      present: [{ text: x.text }],
    })

    if (foreign.length >= 2) {
      const take = Math.min(3, listed.length)
      const wrong = foreign.slice(0, take === 3 ? 3 : 2)
      res.drafts.push({
        ...base,
        id: `${l.kind}:multiple:${aid}:${l.unit.path}`,
        variant: 'multiple',
        format: 'multiple',
        difficulty: 3,
        prompt: `${cite}: zaznacz wszystkie ${LIST_LABEL[l.kind]}, które wymienia ten przepis.`,
        context: quoteCtx(l.intro),
        answer: listed.slice(0, take).map((x) => x.text).join('; '),
        options: [...listed.slice(0, take).map((x) => listedOpt(x, true)), ...wrong.map((f) => wrongOpt(f, false))],
      })
    } else {
      res.rejected.push({ type: l.kind, reason: 'za mało dystraktorów spoza listy', articleId: aid, detail: l.unit.path })
    }

    if (l.items.length >= 4 && foreign.length >= 1) {
      const f = foreign[foreign.length - 1]
      res.drafts.push({
        ...base,
        id: `${l.kind}:not-listed:${aid}:${l.unit.path}`,
        variant: 'not-listed',
        format: 'single',
        difficulty: 2,
        negated: true,
        prompt: `Czego NIE wymienia ${cite.replace(/^Art/, 'art')}?`,
        context: quoteCtx(l.intro),
        answer: f.text,
        options: [...listed.slice(0, 3).map((x) => listedOpt(x, false)), wrongOpt(f, true)],
      })
    }
  }
  return res
}
