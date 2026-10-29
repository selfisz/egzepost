import type { Difficulty, LearnState, Question, QuestionBank, QuestionFormat, QuestionType, Stage } from './model'
import { indexBank } from './bank-index'
import { stageProgress } from './progress'
import { isMastered } from './srs'

export type LearnMode = 'flashcards' | 'test' | 'mixed'

/** Optional narrowing of „Ucz się teraz”. Nothing set = the app leads. */
export type SessionFilter = {
  actId?: string
  /** Dział label (`Stage.chapter`). */
  chapter?: string
  stageId?: string
  types?: QuestionType[]
}

export type SessionOptions = {
  mode?: LearnMode
  /** 1 = only basic, 2 = up to medium, 3 = all (default). */
  maxDifficulty?: Difficulty
  size?: number
  /** Max new questions per session (default 60 % of size). */
  newLimit?: number
  now?: number
  filter?: SessionFilter
}

export type SessionItem = {
  question: Question
  reason: 'retry' | 'review' | 'new'
  /** How the UI should render it; flashcards mode shows every question as a flashcard. */
  presentAs: QuestionFormat
}

export type SessionPlan = {
  /** Act whose guided path supplied new questions. */
  actId: string | null
  /** Stage (rozdział) the learner is currently on, if any. */
  stage: Stage | null
  items: SessionItem[]
  counts: { retry: number; review: number; new: number }
}

function eligibleFn(bank: QuestionBank, opts: SessionOptions): (q: Question) => boolean {
  const { stageById } = indexBank(bank)
  const f = opts.filter ?? {}
  const maxD = opts.maxDifficulty ?? 3
  return (q) => {
    if (q.difficulty > maxD) return false
    if (opts.mode === 'test' && q.format === 'flashcard') return false
    if (f.actId && q.actId !== f.actId) return false
    if (f.stageId && q.stageId !== f.stageId) return false
    if (f.chapter && stageById.get(q.stageId)?.chapter !== f.chapter) return false
    if (f.types?.length && !f.types.includes(q.type)) return false
    return true
  }
}

function resolveActId(bank: QuestionBank, state: LearnState, filter: SessionFilter | undefined): string | null {
  const { stageById } = indexBank(bank)
  if (filter?.stageId) return stageById.get(filter.stageId)?.actId ?? null
  if (filter?.actId) return filter.actId
  if (state.activeActId && bank.acts.some((a) => a.id === state.activeActId)) return state.activeActId
  return bank.acts[0]?.id ?? null
}

/**
 * Guided path: first stage (rozdział) of the act, in statute order, that is not completed and still
 * has eligible questions to learn. No placement test, no skipping — chapter after chapter.
 */
export function currentStage(bank: QuestionBank, state: LearnState, opts: SessionOptions = {}): Stage | null {
  const { byId, stagesByAct, stageById } = indexBank(bank)
  const f = opts.filter ?? {}
  if (f.stageId) return stageById.get(f.stageId) ?? null
  const actId = resolveActId(bank, state, f)
  if (!actId) return null
  const eligible = eligibleFn(bank, opts)
  for (const s of stagesByAct.get(actId) ?? []) {
    if (f.chapter && s.chapter !== f.chapter) continue
    if (stageProgress(s, state).status === 'completed') continue
    const open = s.questionIds.some((id) => {
      const q = byId.get(id)!
      const p = state.questions[id]
      return eligible(q) && (!p || !p.lastCorrect)
    })
    if (open) return s
  }
  return null
}

/** Stages of one act in order with their status — the „ścieżka” view. */
export function guidedPath(bank: QuestionBank, state: LearnState, actId: string) {
  return (indexBank(bank).stagesByAct.get(actId) ?? []).map((stage) => ({ stage, progress: stageProgress(stage, state) }))
}

/**
 * „Ucz się teraz”: wrong answers first, then due reviews, then new questions from the current
 * stage of the guided path. Deterministic for a given state and `now`.
 */
export function buildSession(bank: QuestionBank, state: LearnState, opts: SessionOptions = {}): SessionPlan {
  const { byId } = indexBank(bank)
  const now = opts.now ?? Date.now()
  const size = Math.max(1, opts.size ?? 12)
  const newLimit = opts.newLimit ?? Math.ceil(size * 0.6)
  const eligible = eligibleFn(bank, opts)
  const presentAs = (q: Question): QuestionFormat => (opts.mode === 'flashcards' ? 'flashcard' : q.format)

  const seen = Object.entries(state.questions)
    .map(([id, p]) => ({ q: byId.get(id), p }))
    .filter((x): x is { q: Question; p: (typeof x)['p'] } => Boolean(x.q && eligible(x.q)))

  const retry = seen.filter((x) => !x.p.lastCorrect).sort((a, b) => a.p.lastAnsweredAt - b.p.lastAnsweredAt)
  const due = seen.filter((x) => x.p.lastCorrect && x.p.dueAt <= now).sort((a, b) => a.p.dueAt - b.p.dueAt)

  const stage = currentStage(bank, state, opts)
  const fresh = (stage?.questionIds ?? []).map((id) => byId.get(id)!).filter((q) => eligible(q) && !state.questions[q.id])
  const practice = (stage?.questionIds ?? [])
    .map((id) => ({ q: byId.get(id)!, p: state.questions[id] }))
    .filter((x) => x.p && x.p.lastCorrect && !isMastered(x.p) && x.p.dueAt > now && eligible(x.q))

  const items: SessionItem[] = []
  const used = new Set<string>()
  const push = (q: Question, reason: SessionItem['reason']) => {
    if (items.length >= size || used.has(q.id)) return
    used.add(q.id)
    items.push({ question: q, reason, presentAs: presentAs(q) })
  }

  for (const x of retry.slice(0, Math.ceil(size / 2))) push(x.q, 'retry')
  const newSlots = Math.min(newLimit, fresh.length, size - items.length)
  for (const x of due.slice(0, Math.max(0, size - items.length - newSlots))) push(x.q, 'review')
  for (const q of fresh.slice(0, newSlots)) push(q, 'new')
  for (const x of due) push(x.q, 'review')
  for (const x of retry) push(x.q, 'retry')
  for (const x of practice) push(x.q, 'review')

  const counts = { retry: 0, review: 0, new: 0 }
  for (const it of items) counts[it.reason]++
  return { actId: stage?.actId ?? resolveActId(bank, state, opts.filter), stage, items, counts }
}
