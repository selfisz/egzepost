/**
 * UI adapter over `src/learn` (Nauka v4).
 *
 * Caps „Który artykuł?” share here (not in the engine). Legacy per-article SRS
 * in `egzepost:user:v1` stays untouched; new progress lives in `regest:learn:v1`.
 */
import {
  buildSession,
  currentStage,
  flashcardOutcome,
  gradeAnswer,
  guidedPath,
  loadQuestionBank,
  loadLearnState,
  mistakes,
  progressBy,
  recordAnswer,
  saveLearnState,
  stageProgress,
  summarize,
  TYPE_LABELS,
  type Grade,
  type LearnMode,
  type LearnState,
  type Question,
  type QuestionBank,
  type QuestionType,
  type SessionItem,
  type SessionOptions,
  type SessionPlan,
  type Stage,
} from '../learn'
import type { ActId, Chapter, Library } from './structure'

export type { Grade, LearnMode, LearnState, Question, QuestionBank, QuestionType, SessionItem, SessionPlan, Stage }
export { TYPE_LABELS, flashcardOutcome, gradeAnswer, guidedPath, mistakes, progressBy, summarize }

const SESSION_SIZE = 12
/** Cap „Który artykuł?” to ~1/3 of a session — it is 57% of the bank. */
const WHICH_ARTICLE_SHARE = 1 / 3

let bankPromise: Promise<QuestionBank> | null = null

export function ensureBank(): Promise<QuestionBank> {
  if (!bankPromise) {
    bankPromise = loadQuestionBank(`${import.meta.env.BASE_URL}data/`)
  }
  return bankPromise
}

export function getLearnState(): LearnState {
  return loadLearnState()
}

export function persistLearnState(state: LearnState): LearnState {
  saveLearnState(state)
  return state
}

export function sessionHref(opts: {
  mode: LearnMode
  actId?: ActId
  stageId?: string
  mistakesOnly?: boolean
  articleId?: string
}): string {
  const q = new URLSearchParams()
  q.set('m', opts.mode)
  if (opts.actId) q.set('akt', opts.actId)
  if (opts.stageId) q.set('etap', opts.stageId)
  if (opts.mistakesOnly) q.set('bledy', '1')
  if (opts.articleId) q.set('art', opts.articleId)
  return `nauka/sesja?${q.toString()}`
}

export type ChapterRow = {
  stage: Stage
  /** Matching structure chapter, when articleIds overlap. */
  chapter: Chapter | null
  seen: number
  total: number
  correct: number
  mistakes: number
  status: ReturnType<typeof stageProgress>['status']
  proposed: boolean
}

export type NaukaSnapshot = {
  actId: ActId
  proposed: Stage | null
  mastered: number
  total: number
  seen: number
  mistakes: number
  dueToday: number
  chapters: ChapterRow[]
  /** Composition line under Test/Fiszki. */
  lineup: { retry: number; review: number; new: number; proposedLabel?: string }
}

function matchChapter(lib: Library, stage: Stage): Chapter | null {
  const act = lib.acts[stage.actId as ActId]
  if (!act) return null
  const ids = new Set(stage.articleIds)
  let best: Chapter | null = null
  let bestN = 0
  for (const ch of act.chapters) {
    const n = ch.articles.filter((a) => ids.has(a.id)).length
    if (n > bestN) {
      bestN = n
      best = ch
    }
  }
  return bestN > 0 ? best : null
}

export function naukaSnapshot(bank: QuestionBank, state: LearnState, lib: Library, actId: ActId, now = Date.now()): NaukaSnapshot {
  const actQs = bank.questions.filter((q) => q.actId === actId)
  const summary = summarize(
    actQs.map((q) => q.id),
    state,
  )
  const proposed = currentStage(bank, state, { filter: { actId } })
  const path = guidedPath(bank, state, actId)
  const chapters: ChapterRow[] = path.map(({ stage, progress }) => ({
    stage,
    chapter: matchChapter(lib, stage),
    seen: progress.seen,
    total: progress.total,
    correct: progress.correct,
    mistakes: progress.mistakes,
    status: progress.status,
    proposed: proposed?.id === stage.id,
  }))

  let dueToday = 0
  for (const q of actQs) {
    const p = state.questions[q.id]
    if (p && p.dueAt <= now) dueToday++
  }

  const preview = buildCappedSession(bank, state, { mode: 'mixed', size: SESSION_SIZE, filter: { actId } })
  return {
    actId,
    proposed,
    mastered: summary.mastered,
    total: summary.total,
    seen: summary.seen,
    mistakes: summary.mistakes,
    dueToday,
    chapters,
    lineup: {
      retry: preview.counts.retry,
      review: preview.counts.review,
      new: preview.counts.new,
      proposedLabel: proposed?.label,
    },
  }
}

function eligibleExtras(bank: QuestionBank, _state: LearnState, opts: SessionOptions, used: Set<string>): Question[] {
  void _state
  const f = opts.filter ?? {}
  const maxD = opts.maxDifficulty ?? 3
  return bank.questions.filter((q) => {
    if (used.has(q.id)) return false
    if (q.type === 'which-article') return false
    if (q.difficulty > maxD) return false
    if (opts.mode === 'test' && q.format === 'flashcard') return false
    if (f.actId && q.actId !== f.actId) return false
    if (f.stageId && q.stageId !== f.stageId) return false
    if (f.types?.length && !f.types.includes(q.type)) return false
    return true
  })
}

/**
 * Prefer non-which-article fillers so the capped type does not dominate.
 * Order: unseen in proposed/filter stage, then other unseen, then seen.
 */
function fillNonWhich(
  bank: QuestionBank,
  state: LearnState,
  opts: SessionOptions,
  plan: SessionPlan,
  need: number,
): SessionItem[] {
  if (need <= 0) return []
  const used = new Set(plan.items.map((i) => i.question.id))
  const presentAs = (q: Question) => (opts.mode === 'flashcards' ? 'flashcard' : q.format)
  const pool = eligibleExtras(bank, state, opts, used)
  const stageIds = new Set(plan.stage ? plan.stage.questionIds : [])
  const ranked = [
    ...pool.filter((q) => !state.questions[q.id] && stageIds.has(q.id)),
    ...pool.filter((q) => !state.questions[q.id] && !stageIds.has(q.id)),
    ...pool.filter((q) => state.questions[q.id]),
  ]
  const out: SessionItem[] = []
  for (const q of ranked) {
    if (out.length >= need) break
    if (used.has(q.id)) continue
    used.add(q.id)
    out.push({ question: q, reason: state.questions[q.id] ? 'review' : 'new', presentAs: presentAs(q) as SessionItem['presentAs'] })
  }
  return out
}

/** Post-process engine plan: keep „Który artykuł?” ≤ ~1/3 of items. */
export function capWhichArticle(bank: QuestionBank, state: LearnState, plan: SessionPlan, opts: SessionOptions): SessionPlan {
  const size = Math.max(plan.items.length, opts.size ?? SESSION_SIZE)
  const maxWhich = Math.max(0, Math.floor(size * WHICH_ARTICLE_SHARE))
  const which = plan.items.filter((i) => i.question.type === 'which-article')
  const other = plan.items.filter((i) => i.question.type !== 'which-article')
  if (which.length <= maxWhich) return plan

  const keptWhich = which.slice(0, maxWhich)
  let items = [...other, ...keptWhich]
  const need = size - items.length
  items = [...items, ...fillNonWhich(bank, state, opts, { ...plan, items }, need)].slice(0, size)

  const counts = { retry: 0, review: 0, new: 0 }
  for (const it of items) counts[it.reason]++
  return { ...plan, items, counts }
}

export function buildCappedSession(bank: QuestionBank, state: LearnState, opts: SessionOptions = {}): SessionPlan {
  const withSize = { size: SESSION_SIZE, ...opts }
  const plan = buildSession(bank, state, withSize)
  return capWhichArticle(bank, state, plan, withSize)
}

export type SessionRequest = {
  mode: LearnMode
  actId?: ActId
  stageId?: string
  mistakesOnly?: boolean
  /** Prefer questions of this article (from „Do nauki”). */
  articleId?: string
  learnQueue?: string[]
}

export function planSession(bank: QuestionBank, state: LearnState, req: SessionRequest): SessionPlan {
  if (req.mistakesOnly) {
    const list = mistakes(bank, state).filter((q) => !req.actId || q.actId === req.actId)
    const presentAs = (q: Question) => (req.mode === 'flashcards' ? 'flashcard' : q.format)
    const raw: SessionItem[] = list.slice(0, SESSION_SIZE).map((question) => ({
      question,
      reason: 'retry' as const,
      presentAs: presentAs(question) as SessionItem['presentAs'],
    }))
    const base: SessionPlan = {
      actId: req.actId ?? state.activeActId ?? bank.acts[0]?.id ?? null,
      stage: null,
      items: raw,
      counts: { retry: raw.length, review: 0, new: 0 },
    }
    return capWhichArticle(bank, state, base, { mode: req.mode, size: SESSION_SIZE, filter: { actId: req.actId } })
  }

  const filter: SessionOptions['filter'] = {
    ...(req.actId ? { actId: req.actId } : {}),
    ...(req.stageId ? { stageId: req.stageId } : {}),
  }
  let plan = buildCappedSession(bank, state, { mode: req.mode, size: SESSION_SIZE, filter })

  const pinIds: string[] = []
  if (req.articleId) pinIds.push(req.articleId)
  for (const id of req.learnQueue ?? []) if (!pinIds.includes(id)) pinIds.push(id)

  if (pinIds.length) {
    const presentAs = (q: Question) => (req.mode === 'flashcards' ? 'flashcard' : q.format)
    const pinned: SessionItem[] = []
    const used = new Set<string>()
    for (const artId of pinIds) {
      for (const q of bank.questions) {
        if (q.articleId !== artId) continue
        if (req.mode === 'test' && q.format === 'flashcard') continue
        if (used.has(q.id)) continue
        used.add(q.id)
        pinned.push({ question: q, reason: state.questions[q.id] ? 'review' : 'new', presentAs: presentAs(q) as SessionItem['presentAs'] })
        if (pinned.length >= Math.ceil(SESSION_SIZE / 2)) break
      }
      if (pinned.length >= Math.ceil(SESSION_SIZE / 2)) break
    }
    const rest = plan.items.filter((i) => !used.has(i.question.id))
    const items = [...pinned, ...rest].slice(0, SESSION_SIZE)
    const counts = { retry: 0, review: 0, new: 0 }
    for (const it of items) counts[it.reason]++
    plan = { ...plan, items, counts }
    plan = capWhichArticle(bank, state, plan, { mode: req.mode, size: SESSION_SIZE, filter })
  }

  return plan
}

export function applyAnswer(
  state: LearnState,
  question: Question,
  input: { correct: boolean; grade?: Grade; selected?: string[] },
): LearnState {
  return persistLearnState(recordAnswer(state, question, input))
}

export function gradeHint(state: LearnState, question: Question, grade: Grade): string {
  const next = recordAnswer(state, question, flashcardOutcome(grade))
  const due = next.questions[question.id]?.dueAt ?? Date.now()
  const ms = due - Date.now()
  if (ms <= 15 * 60_000) return 'za 10 min'
  const days = Math.max(1, Math.round(ms / 86_400_000))
  if (days === 1) return 'za 1 dzień'
  if (days < 5) return `za ${days} dni`
  return `za ${days} dni`
}

export function typeLabel(t: QuestionType): string {
  return TYPE_LABELS[t]
}
