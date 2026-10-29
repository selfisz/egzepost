/**
 * Statystyki — pure helpers over reading history + learn engine state.
 * Definitions match docs/statystyki-concept.md.
 */
import { isMastered, type LearnState, type Question, type QuestionBank, TYPE_LABELS } from '../learn'
import type { ReadEntry, UserStore } from '../types'
import { countableArticles } from './learn-adapter'
import type { ActId, ActStructure, Chapter, Library } from './structure'
import { isActId, isRepealed } from './structure'

export type Ratio = { have: number; total: number }

export type ActStats = {
  actId: ActId
  shortName: string
  read: Ratio
  knownWell: Ratio
  questions: Ratio
  mistakes: number
  due: number
  /** Articles with no questions in the bank (cannot be „znam dobrze”). */
  withoutQuestions: number
}

export type ChapterStats = {
  chapter: Chapter
  stageId?: string
  read: Ratio
  knownWell: Ratio
  questions: Ratio
  mistakes: number
  due: number
  onlyReading: boolean
}

export type TypeStats = {
  type: string
  label: string
  questions: Ratio
  accuracy: number | null
  mistakes: number
}

function ratio(have: number, total: number): Ratio {
  return { have, total }
}

function questionsByArticle(bank: QuestionBank): Map<string, Question[]> {
  const m = new Map<string, Question[]>()
  for (const q of bank.questions) {
    const list = m.get(q.articleId) ?? []
    list.push(q)
    m.set(q.articleId, list)
  }
  return m
}

/** „Znam dobrze”: every question seen, ≥80% mastered, none currently wrong. */
export function articleKnownWell(
  articleId: string,
  byArticle: Map<string, Question[]>,
  state: LearnState,
): boolean {
  const qs = byArticle.get(articleId)
  if (!qs?.length) return false
  let mastered = 0
  for (const q of qs) {
    const p = state.questions[q.id]
    if (!p) return false
    if (!p.lastCorrect) return false
    if (isMastered(p)) mastered++
  }
  return mastered / qs.length >= 0.8
}

export function isRead(readLog: Record<string, ReadEntry> | undefined, articleId: string): boolean {
  return Boolean(readLog?.[articleId])
}

export function actStats(lib: Library, bank: QuestionBank, store: UserStore, state: LearnState, now = Date.now()): ActStats[] {
  const byArticle = questionsByArticle(bank)
  return lib.list.map((act) => singleActStats(act, byArticle, store, state, now))
}

function singleActStats(
  act: ActStructure,
  byArticle: Map<string, Question[]>,
  store: UserStore,
  state: LearnState,
  now: number,
): ActStats {
  const arts = countableArticles(act)
  let read = 0
  let known = 0
  let withQ = 0
  for (const a of arts) {
    if (isRead(store.readLog, a.id)) read++
    const qs = byArticle.get(a.id)
    if (qs?.length) {
      withQ++
      if (articleKnownWell(a.id, byArticle, state)) known++
    }
  }
  const actQs: Question[] = []
  for (const [id, qs] of byArticle) {
    if (id.startsWith(`${act.id}:`)) actQs.push(...qs)
  }
  let masteredQ = 0
  let mistakes = 0
  let due = 0
  for (const q of actQs) {
    const p = state.questions[q.id]
    if (!p) continue
    if (isMastered(p)) masteredQ++
    if (!p.lastCorrect) mistakes++
    else if (p.dueAt <= now) due++
  }
  return {
    actId: act.id,
    shortName: act.shortName,
    read: ratio(read, arts.length),
    knownWell: ratio(known, withQ),
    questions: ratio(masteredQ, actQs.length),
    mistakes,
    due,
    withoutQuestions: arts.length - withQ,
  }
}

export function chapterStats(
  act: ActStructure,
  bank: QuestionBank,
  store: UserStore,
  state: LearnState,
  now = Date.now(),
): ChapterStats[] {
  const byArticle = questionsByArticle(bank)
  const stages = bank.stages.filter((s) => s.actId === act.id)
  return act.chapters.map((ch) => {
    const arts = ch.articles.filter((a) => !isRepealed(a))
    let read = 0
    let known = 0
    let withQ = 0
    for (const a of arts) {
      if (isRead(store.readLog, a.id)) read++
      if (byArticle.get(a.id)?.length) {
        withQ++
        if (articleKnownWell(a.id, byArticle, state)) known++
      }
    }
    const artSet = new Set(ch.articles.map((a) => a.id))
    let stage = stages.find((s) => s.articleIds.some((id) => artSet.has(id)) && s.articleIds.every((id) => artSet.has(id) || true))
    // Best overlap
    let best = 0
    for (const s of stages) {
      let n = 0
      for (const id of s.articleIds) if (artSet.has(id)) n++
      if (n > best) {
        best = n
        stage = s
      }
    }
    const qids = stage?.questionIds ?? []
    let masteredQ = 0
    let mistakes = 0
    let due = 0
    for (const id of qids) {
      const p = state.questions[id]
      if (!p) continue
      if (isMastered(p)) masteredQ++
      if (!p.lastCorrect) mistakes++
      else if (p.dueAt <= now) due++
    }
    return {
      chapter: ch,
      stageId: stage?.id,
      read: ratio(read, arts.length || ch.articles.length),
      knownWell: ratio(known, withQ),
      questions: ratio(masteredQ, qids.length),
      mistakes,
      due,
      onlyReading: qids.length === 0,
    }
  })
}

export function typeStats(bank: QuestionBank, state: LearnState): TypeStats[] {
  const groups = new Map<string, { label: string; ids: string[] }>()
  for (const q of bank.questions) {
    const g = groups.get(q.type) ?? { label: TYPE_LABELS[q.type] ?? q.type, ids: [] }
    g.ids.push(q.id)
    groups.set(q.type, g)
  }
  const logByType = new Map<string, { ok: number; n: number }>()
  for (const e of state.log) {
    const q = bank.questions.find((x) => x.id === e.qid)
    if (!q) continue
    const s = logByType.get(q.type) ?? { ok: 0, n: 0 }
    s.n++
    if (e.correct) s.ok++
    logByType.set(q.type, s)
  }
  return [...groups.entries()]
    .map(([type, g]) => {
      let mastered = 0
      let mistakes = 0
      for (const id of g.ids) {
        const p = state.questions[id]
        if (!p) continue
        if (isMastered(p)) mastered++
        if (!p.lastCorrect) mistakes++
      }
      const log = logByType.get(type)
      return {
        type,
        label: g.label,
        questions: ratio(mastered, g.ids.length),
        accuracy: log && log.n ? Math.round((log.ok / log.n) * 100) : null,
        mistakes,
      }
    })
    .sort((a, b) => b.mistakes - a.mistakes || a.questions.have / Math.max(1, a.questions.total) - b.questions.have / Math.max(1, b.questions.total))
}

export function overallAccuracy(state: LearnState): number | null {
  if (!state.log.length) return null
  const ok = state.log.filter((e) => e.correct).length
  return Math.round((ok / state.log.length) * 100)
}

export function activityDays(state: LearnState, days = 28): boolean[] {
  const out = Array.from({ length: days }, () => false)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (const e of state.log) {
    const d = new Date(e.at)
    d.setHours(0, 0, 0, 0)
    const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000)
    if (diff >= 0 && diff < days) out[days - 1 - diff] = true
  }
  // Also count reading days
  return out
}

export function activityDaysWithReading(state: LearnState, store: UserStore, days = 28): boolean[] {
  const out = activityDays(state, days)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (const e of Object.values(store.readLog ?? {})) {
    for (const iso of [e.firstAt, e.lastAt]) {
      const d = new Date(iso)
      d.setHours(0, 0, 0, 0)
      const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000)
      if (diff >= 0 && diff < days) out[days - 1 - diff] = true
    }
  }
  return out
}

export function weakChapters(
  lib: Library,
  bank: QuestionBank,
  store: UserStore,
  state: LearnState,
  limit = 3,
): ChapterStats[] {
  const all: ChapterStats[] = []
  for (const act of lib.list) all.push(...chapterStats(act, bank, store, state))
  return all
    .filter((c) => c.mistakes > 0)
    .sort((a, b) => b.mistakes - a.mistakes)
    .slice(0, limit)
}

export function sumActs(stats: ActStats[]): { read: Ratio; knownWell: Ratio } {
  return {
    read: ratio(
      stats.reduce((s, a) => s + a.read.have, 0),
      stats.reduce((s, a) => s + a.read.total, 0),
    ),
    knownWell: ratio(
      stats.reduce((s, a) => s + a.knownWell.have, 0),
      stats.reduce((s, a) => s + a.knownWell.total, 0),
    ),
  }
}

export function answersToday(state: LearnState, now = Date.now()): number {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  return state.log.filter((e) => e.at >= start.getTime()).length
}

export function isActStatsId(v: string | undefined): v is ActId {
  return isActId(v)
}
