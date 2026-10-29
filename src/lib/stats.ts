/**
 * Statystyki helpers: przeczytane / znam dobrze, derived from UserStore.readLog + LearnState.
 */
import type { LearnState, QuestionBank } from '../learn'
import { isMastered } from '../learn'
import type { ActId, Library } from './structure'
import { isRepealed } from './structure'
import type { UserStore } from '../types'

export type ActReadStats = {
  actId: ActId
  read: number
  readable: number
  knownWell: number
  withQuestions: number
  withoutQuestions: number
}

export type ArticleKnown = {
  articleId: string
  knownWell: boolean
  seenAll: boolean
  masteredShare: number
  hasMistakes: boolean
  questionCount: number
}

/** Countable articles for „przeczytane” = not fully repealed. */
export function readableArticles(lib: Library, actId: ActId) {
  return lib.acts[actId].articles.filter((a) => !isRepealed(a))
}

export function isRead(store: UserStore, articleId: string): boolean {
  return Boolean(store.readLog?.[articleId]?.opens)
}

/** Per-article „znam dobrze” per Statystyki concept. */
export function articleKnownWell(bank: QuestionBank, state: LearnState, articleId: string): ArticleKnown {
  const qs = bank.questions.filter((q) => q.articleId === articleId)
  if (!qs.length) {
    return { articleId, knownWell: false, seenAll: false, masteredShare: 0, hasMistakes: false, questionCount: 0 }
  }
  let seen = 0
  let mastered = 0
  let mistakes = 0
  for (const q of qs) {
    const p = state.questions[q.id]
    if (!p) continue
    seen++
    if (isMastered(p)) mastered++
    if (!p.lastCorrect) mistakes++
  }
  const seenAll = seen === qs.length
  const masteredShare = mastered / qs.length
  const knownWell = seenAll && masteredShare >= 0.8 && mistakes === 0
  return { articleId, knownWell, seenAll, masteredShare, hasMistakes: mistakes > 0, questionCount: qs.length }
}

export function actReadStats(
  lib: Library,
  bank: QuestionBank,
  state: LearnState,
  store: UserStore,
  actId: ActId,
): ActReadStats {
  const readable = readableArticles(lib, actId)
  const read = readable.filter((a) => isRead(store, a.id)).length
  const withQ = new Set(bank.questions.filter((q) => q.actId === actId).map((q) => q.articleId))
  let knownWell = 0
  for (const id of withQ) {
    if (articleKnownWell(bank, state, id).knownWell) knownWell++
  }
  return {
    actId,
    read,
    readable: readable.length,
    knownWell,
    withQuestions: withQ.size,
    withoutQuestions: Math.max(0, readable.length - withQ.size),
  }
}

export function overallReadStats(lib: Library, bank: QuestionBank, state: LearnState, store: UserStore) {
  const acts = lib.list.map((a) => actReadStats(lib, bank, state, store, a.id))
  return {
    acts,
    read: acts.reduce((n, a) => n + a.read, 0),
    readable: acts.reduce((n, a) => n + a.readable, 0),
    knownWell: acts.reduce((n, a) => n + a.knownWell, 0),
    withQuestions: acts.reduce((n, a) => n + a.withQuestions, 0),
  }
}

export function dueInDays(state: LearnState, bank: QuestionBank, actId: string | undefined, days: number, now = Date.now()) {
  const end = now + days * 86_400_000
  const ids = new Set(bank.questions.filter((q) => !actId || q.actId === actId).map((q) => q.id))
  let n = 0
  for (const [id, p] of Object.entries(state.questions)) {
    if (!ids.has(id)) continue
    if (p.lastCorrect && p.dueAt > now && p.dueAt <= end) n++
  }
  return n
}

export function dueToday(state: LearnState, bank: QuestionBank, actId?: string, now = Date.now()) {
  const ids = new Set(bank.questions.filter((q) => !actId || q.actId === actId).map((q) => q.id))
  let n = 0
  for (const [id, p] of Object.entries(state.questions)) {
    if (!ids.has(id)) continue
    if (p.dueAt <= now) n++
  }
  return n
}

export function answersInWindow(state: LearnState, ms: number, now = Date.now()) {
  const from = now - ms
  return state.log.filter((e) => e.at >= from)
}

export function efficacy(state: LearnState, limit = 2000): number | null {
  const log = state.log.slice(-limit)
  if (!log.length) return null
  const ok = log.filter((e) => e.correct).length
  return Math.round((ok / log.length) * 100)
}

/** Activity day keys (YYYY-MM-DD local) for the last `days` days. */
export function activityDays(state: LearnState, days = 28, now = Date.now()): { key: string; count: number }[] {
  const out: { key: string; count: number }[] = []
  const counts = new Map<string, number>()
  for (const e of state.log) {
    const d = new Date(e.at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    out.push({ key, count: counts.get(key) ?? 0 })
  }
  return out
}
