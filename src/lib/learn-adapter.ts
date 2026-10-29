/**
 * Thin learning adapter for the Nauka screens.
 *
 * The UI only talks to `learnEngine`. Today it is backed by the existing
 * per-article SRS progress (`store.progress`, `store.learnQueue`) and the
 * imported statute text. A future engine (e.g. the rule-based question engine
 * in `src/learn/`) can replace `legacyEngine` by implementing `LearnEngine`
 * without touching the screens.
 */
import type { Article, UserStore } from '../types'
import { isDue, review, type Grade } from './srs'
import { setProgress } from './storage'
import type { ActId, ActStructure, Chapter, Library } from './structure'
import { isRepealed } from './structure'

export type { Grade }

export type CardKind = 'poznaj' | 'przypomnij' | 'ktory'

export type LearnCard = {
  id: string
  kind: CardKind
  article: Article
  chapter: Chapter
  isReview: boolean
  /** User tag linked to the article — their own wording, shown as a hint. */
  tagLabel?: string
  /** For `ktory`: verbatim fragment shown as the question. */
  fragment?: string
  /** For `ktory`: candidate articles (exactly one correct). */
  options?: { article: Article; correct: boolean }[]
}

export type StageState = 'done' | 'current' | 'locked'

export type StageInfo = {
  chapter: Chapter
  state: StageState
  seen: number
  total: number
}

export type DailyPlan = {
  cards: LearnCard[]
  reviews: number
  fresh: number
  focusStage?: Chapter
}

export interface LearnEngine {
  readonly id: string
  stages(act: ActStructure, store: UserStore): StageInfo[]
  dailyPlan(lib: Library, store: UserStore, focusAct: ActId): DailyPlan
  stageSession(act: ActStructure, chapterIndex: number, store: UserStore): LearnCard[]
  grade(store: UserStore, card: LearnCard, grade: Grade): UserStore
  /** Days until the card returns for a given grade (0 = still today). */
  nextIntervalDays(store: UserStore, card: LearnCard, grade: Grade): number
}

const SESSION_MAX = 12
const REVIEW_MAX = 8
const FRESH_MIN = 4
const FRESH_MAX = 8
const QUEUE_MAX = 2

function learnable(ch: Chapter): Article[] {
  return ch.articles.filter((a) => !isRepealed(a) && a.text.trim().length > 20)
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function seededShuffle<T>(list: T[], seed: string): T[] {
  const out = [...list]
  let h = hash(seed)
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
    const j = h % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function firstFragment(a: Article): string {
  const b = a.blocks.find((x) => x.text.trim().length > 30) ?? a.blocks[0]
  const text = (b?.text ?? a.text).trim()
  return text.length > 320 ? `${text.slice(0, 300).replace(/\s+\S*$/, '')} …` : text
}

function tagFor(store: UserStore, a: Article): string | undefined {
  return store.tags.find((t) => t.articleIds.includes(a.id))?.label
}

function makeCard(store: UserStore, a: Article, ch: Chapter, isReview: boolean): LearnCard {
  const tagLabel = tagFor(store, a)
  if (!isReview) return { id: `poznaj:${a.id}`, kind: 'poznaj', article: a, chapter: ch, isReview, tagLabel }
  const reps = store.progress[a.id]?.repetitions ?? 0
  const peers = learnable(ch).filter((p) => p.id !== a.id)
  const canQuiz = peers.length >= 3
  const canRecall = !!(a.title || tagLabel)
  const wantQuiz = canQuiz && (!canRecall || (hash(a.id) + reps) % 2 === 0)
  if (!wantQuiz) return { id: `przypomnij:${a.id}`, kind: 'przypomnij', article: a, chapter: ch, isReview, tagLabel }
  const distractors = seededShuffle(peers, `${a.id}:${reps}`).slice(0, 3)
  const options = seededShuffle(
    [{ article: a, correct: true }, ...distractors.map((d) => ({ article: d, correct: false }))],
    `${a.id}:opts:${reps}`,
  )
  return {
    id: `ktory:${a.id}`,
    kind: 'ktory',
    article: a,
    chapter: ch,
    isReview,
    tagLabel,
    fragment: firstFragment(a),
    options,
  }
}

function stagesOf(act: ActStructure, store: UserStore): StageInfo[] {
  let currentAssigned = false
  return act.chapters.map((chapter) => {
    const items = learnable(chapter)
    const seen = items.filter((a) => store.progress[a.id]).length
    const complete = seen >= items.length
    let state: StageState
    if (complete && !currentAssigned) state = 'done'
    else if (!currentAssigned) {
      state = 'current'
      currentAssigned = true
    } else state = complete ? 'done' : 'locked'
    return { chapter, state, seen, total: items.length }
  })
}

export const legacyEngine: LearnEngine = {
  id: 'legacy-srs',

  stages: stagesOf,

  dailyPlan(lib, store, focusAct) {
    const now = Date.now()
    const due: { a: Article; ch: Chapter; dueAt: string }[] = []
    for (const act of lib.list) {
      for (const ch of act.chapters) {
        for (const a of learnable(ch)) {
          const p = store.progress[a.id]
          if (p && isDue(p, now)) due.push({ a, ch, dueAt: p.dueAt })
        }
      }
    }
    due.sort((x, y) => x.dueAt.localeCompare(y.dueAt))
    const reviews = due.slice(0, REVIEW_MAX).map((d) => makeCard(store, d.a, d.ch, true))

    const fresh: LearnCard[] = []
    const taken = new Set(reviews.map((c) => c.article.id))
    for (const id of store.learnQueue) {
      if (fresh.length >= QUEUE_MAX) break
      const act = lib.list.find((x) => id.startsWith(`${x.id}:`))
      const ch = act?.chapterOf.get(id)
      const a = act?.articles.find((x) => x.id === id)
      if (!a || !ch || store.progress[id] || taken.has(id)) continue
      fresh.push(makeCard(store, a, ch, false))
      taken.add(id)
    }

    const act = lib.acts[focusAct] ?? lib.list[0]
    const current = stagesOf(act, store).find((s) => s.state === 'current')
    const freshTarget = Math.min(FRESH_MAX, Math.max(FRESH_MIN, SESSION_MAX - reviews.length))
    if (current) {
      for (const a of learnable(current.chapter)) {
        if (fresh.length >= freshTarget) break
        if (store.progress[a.id] || taken.has(a.id)) continue
        fresh.push(makeCard(store, a, current.chapter, false))
        taken.add(a.id)
      }
    }

    const cards = [...fresh.slice(0, 2), ...reviews, ...fresh.slice(2)].slice(0, SESSION_MAX)
    return {
      cards,
      reviews: cards.filter((c) => c.isReview).length,
      fresh: cards.filter((c) => !c.isReview).length,
      focusStage: current?.chapter,
    }
  },

  stageSession(act, chapterIndex, store) {
    const ch = act.chapters[chapterIndex]
    if (!ch) return []
    const items = learnable(ch)
    const unseen = items.filter((a) => !store.progress[a.id]).slice(0, 8)
    const now = Date.now()
    const seen = items.filter((a) => store.progress[a.id])
    const dueSeen = seen.filter((a) => isDue(store.progress[a.id], now))
    const reviewPool = unseen.length ? dueSeen : dueSeen.length ? dueSeen : seededShuffle(seen, `${ch.index}:${now}`)
    const cards = [
      ...unseen.map((a) => makeCard(store, a, ch, false)),
      ...reviewPool.map((a) => makeCard(store, a, ch, true)),
    ]
    return cards.slice(0, SESSION_MAX)
  },

  grade(store, card, grade) {
    return setProgress(store, review(store.progress[card.article.id], card.article.id, grade))
  },

  nextIntervalDays(store, card, grade) {
    return review(store.progress[card.article.id], card.article.id, grade).intervalDays
  },
}

export const learnEngine: LearnEngine = legacyEngine
