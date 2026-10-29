/**
 * Nauka v4 adapter — UI talks only to this module.
 * Backed by the rule-based engine in `src/learn/` (PR #10).
 * Legacy per-article SRS (`store.progress`) is left untouched.
 */
import {
  buildSession,
  currentStage,
  flashcardOutcome,
  gradeAnswer,
  guidedPath,
  isDue,
  isMastered,
  loadLearnState,
  loadQuestionBank,
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
  type QuestionFormat,
  type QuestionType,
  type SessionItem,
  type SessionOptions,
  type SessionPlan,
  type Stage,
} from '../learn'
import type { UserStore } from '../types'
import { removeFromLearnQueue } from './storage'
import type { ActId, ActStructure, Chapter, Library } from './structure'
import { isActId } from './structure'

export type { Grade, LearnMode, Question, QuestionBank, QuestionFormat, QuestionType, Stage }
export { TYPE_LABELS, isDue, isMastered, mistakes, progressBy, stageProgress, summarize }

const SESSION_SIZE = 12
/** Cap share of „Który artykuł?” so it doesn't dominate (≈57% of the bank). */
const WHICH_ARTICLE_SHARE = 1 / 3
const BANK_KEY = 'regest:question-bank'

let bankPromise: Promise<QuestionBank> | null = null
let cachedBank: QuestionBank | null = null

export function getCachedBank(): QuestionBank | null {
  return cachedBank
}

export function loadBank(): Promise<QuestionBank> {
  if (cachedBank) return Promise.resolve(cachedBank)
  if (!bankPromise) {
    const base = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}data/`
    bankPromise = loadQuestionBank(base)
      .then((b) => {
        cachedBank = b
        try {
          sessionStorage.setItem(BANK_KEY, '1')
        } catch {
          /* ignore */
        }
        return b
      })
      .catch((e) => {
        bankPromise = null
        throw e
      })
  }
  return bankPromise
}

export function readLearnState(): LearnState {
  return loadLearnState()
}

export function writeLearnState(state: LearnState): void {
  saveLearnState(state)
}

export function focusActFromState(state: LearnState, fallback: ActId = 'upea'): ActId {
  return isActId(state.activeActId) ? state.activeActId : fallback
}

/** Map engine stage → library chapter by overlapping article ids. */
export function chapterForStage(lib: Library, stage: Stage): Chapter | undefined {
  const act = isActId(stage.actId) ? lib.acts[stage.actId] : undefined
  if (!act) return undefined
  let best: Chapter | undefined
  let bestOverlap = 0
  for (const ch of act.chapters) {
    const set = new Set(ch.articles.map((a) => a.id))
    let n = 0
    for (const id of stage.articleIds) if (set.has(id)) n++
    if (n > bestOverlap) {
      bestOverlap = n
      best = ch
    }
  }
  return best
}

export function stageIdForChapter(bank: QuestionBank, actId: ActId, chapter: Chapter): string | undefined {
  const stages = bank.stages.filter((s) => s.actId === actId)
  const arts = new Set(chapter.articles.map((a) => a.id))
  let best: Stage | undefined
  let bestOverlap = 0
  for (const s of stages) {
    let n = 0
    for (const id of s.articleIds) if (arts.has(id)) n++
    if (n > bestOverlap) {
      bestOverlap = n
      best = s
    }
  }
  return best?.id
}

export type OpenStage = {
  stage: Stage
  chapter: Chapter | undefined
  progress: ReturnType<typeof stageProgress>
  suggested: boolean
}

/** All stages of an act — no locks. Empty-question stages stay listed for reading. */
export function openPath(bank: QuestionBank, state: LearnState, actId: ActId, lib: Library): OpenStage[] {
  const path = guidedPath(bank, state, actId)
  const suggestedId = currentStage(bank, state, { filter: { actId } })?.id
  return path.map(({ stage, progress }) => ({
    stage,
    chapter: chapterForStage(lib, stage),
    progress,
    suggested: stage.id === suggestedId,
  }))
}

export type PlannedSession = SessionPlan & {
  mode: LearnMode
  title: string
}

/**
 * Build a session with the which-article cap.
 * Optional `stageId` / `actId` / `mistakesOnly` narrow the pool; nothing is locked.
 */
export function planSession(
  bank: QuestionBank,
  state: LearnState,
  opts: {
    mode: LearnMode
    actId?: ActId
    stageId?: string
    size?: number
    mistakesOnly?: boolean
    /** Prefer questions for these article ids (from „Do nauki”). */
    preferArticleIds?: string[]
  },
): PlannedSession {
  const size = opts.size ?? SESSION_SIZE
  const mode = opts.mode
  const filter = {
    ...(opts.actId ? { actId: opts.actId } : {}),
    ...(opts.stageId ? { stageId: opts.stageId } : {}),
  }
  const baseOpts: SessionOptions = { mode, size: size * 2, filter, newLimit: Math.ceil(size * 0.6) }

  if (opts.mistakesOnly) {
    const list = mistakes(bank, state).filter((q) => {
      if (opts.actId && q.actId !== opts.actId) return false
      if (opts.stageId && q.stageId !== opts.stageId) return false
      if (mode === 'test' && q.format === 'flashcard') return false
      return true
    })
    const items: SessionItem[] = list.slice(0, size).map((question) => ({
      question,
      reason: 'retry' as const,
      presentAs: mode === 'flashcards' ? ('flashcard' as const) : question.format,
    }))
    return {
      actId: opts.actId ?? state.activeActId ?? null,
      stage: opts.stageId ? (bank.stages.find((s) => s.id === opts.stageId) ?? null) : null,
      items,
      counts: { retry: items.length, review: 0, new: 0 },
      mode,
      title: 'Moje błędy',
    }
  }

  const raw = buildSession(bank, state, baseOpts)
  const whichCap = Math.max(1, Math.ceil(size * WHICH_ARTICLE_SHARE))
  const kept: SessionItem[] = []
  let which = 0
  const tryPush = (it: SessionItem, allowWhichOverflow: boolean) => {
    if (kept.length >= size) return
    if (kept.some((k) => k.question.id === it.question.id)) return
    if (it.question.type === 'which-article') {
      if (which >= whichCap && !allowWhichOverflow) return
      which++
    }
    kept.push({
      ...it,
      presentAs: mode === 'flashcards' ? 'flashcard' : it.presentAs,
    })
  }
  for (const it of raw.items) tryPush(it, false)

  // Prefer queued articles at the front (from reader „Do nauki”).
  if (opts.preferArticleIds?.length) {
    const prefer = new Set(opts.preferArticleIds)
    const preferred = bank.questions.filter(
      (q) =>
        prefer.has(q.articleId) &&
        (!opts.actId || q.actId === opts.actId) &&
        !(mode === 'test' && q.format === 'flashcard'),
    )
    const front: SessionItem[] = []
    for (const q of preferred) {
      if (front.length >= Math.min(4, size)) break
      if (kept.some((k) => k.question.id === q.id) || front.some((k) => k.question.id === q.id)) continue
      front.push({
        question: q,
        reason: 'new',
        presentAs: mode === 'flashcards' ? 'flashcard' : q.format,
      })
    }
    if (front.length) {
      const rest = kept.filter((k) => !front.some((f) => f.question.id === k.question.id))
      kept.length = 0
      kept.push(...front, ...rest)
      while (kept.length > size) kept.pop()
    }
  }

  // Top up if the cap left us short.
  if (kept.length < size) {
    for (const it of raw.items) tryPush(it, true)
  }

  const counts = { retry: 0, review: 0, new: 0 }
  for (const it of kept) counts[it.reason]++
  const stage = raw.stage
  const title =
    stage?.label ??
    (opts.actId ? bank.acts.find((a) => a.id === opts.actId)?.shortName ?? 'Sesja' : 'Trening na dziś')

  return {
    actId: raw.actId,
    stage,
    items: kept,
    counts,
    mode,
    title,
  }
}

/** Grade a test answer and persist learn state. Returns the new state. */
export function answerTest(
  state: LearnState,
  question: Question,
  selectedIds: string[],
): { state: LearnState; correct: boolean; result: ReturnType<typeof gradeAnswer> } {
  const result = gradeAnswer(question, selectedIds)
  const next = recordAnswer(state, question, {
    correct: result.correct,
    grade: result.correct ? 'good' : 'again',
    selected: selectedIds,
  })
  saveLearnState(next)
  return { state: next, correct: result.correct, result }
}

/** Grade a flashcard self-assessment and persist. */
export function answerFlashcard(
  state: LearnState,
  question: Question,
  grade: Grade,
): LearnState {
  const { correct, grade: g } = flashcardOutcome(grade)
  const next = recordAnswer(state, question, { correct, grade: g })
  saveLearnState(next)
  return next
}

/** Preview next SM-2 interval in days for flashcard buttons. */
export function previewIntervalDays(state: LearnState, questionId: string, grade: Grade): number {
  const prev = state.questions[questionId]
  // Mirror src/learn/srs.ts schedule() enough for the hint labels.
  if (grade === 'again') return 0
  if (!prev || prev.reps === 0) return grade === 'easy' ? 4 : grade === 'hard' ? 1 : 1
  if (prev.reps === 1) return grade === 'easy' ? 7 : grade === 'hard' ? 3 : 6
  const ease = Math.max(1.3, (prev.ease ?? 2.5) + (grade === 'easy' ? 0.15 : grade === 'hard' ? -0.15 : 0))
  const mult = grade === 'easy' ? ease * 1.3 : grade === 'hard' ? Math.max(1.2, ease - 0.2) : ease
  return Math.max(1, Math.round(prev.interval * mult))
}

/** Consume learnQueue articles that contributed questions to a session. */
export function consumeLearnQueue(store: UserStore, articleIds: string[]): UserStore {
  let next = store
  for (const id of articleIds) next = removeFromLearnQueue(next, id)
  return next
}

export function dailyCounts(bank: QuestionBank, state: LearnState, actId: ActId) {
  const now = Date.now()
  const qs = bank.questions.filter((q) => q.actId === actId)
  let due = 0
  let wrong = 0
  let mastered = 0
  for (const q of qs) {
    const p = state.questions[q.id]
    if (!p) continue
    if (!p.lastCorrect) wrong++
    else if (p.dueAt <= now) due++
    if (isMastered(p)) mastered++
  }
  const suggested = currentStage(bank, state, { filter: { actId } })
  return {
    due,
    wrong,
    mastered,
    total: qs.length,
    suggested,
  }
}

export function actShort(bank: QuestionBank, actId: string) {
  return bank.acts.find((a) => a.id === actId)?.shortName ?? actId
}

/** Chapters of an act that still have articles — used by Statystyki reading denom. */
export function countableArticles(act: ActStructure) {
  return act.articles.filter((a) => a.title !== 'uchylony' && !/^\(uchylony\)/.test(a.text.trim()))
}
