import type { Grade, LearnState, Question, QuestionBank, QuestionType, Stage } from './model'
import { isMastered, schedule } from './srs'
import { indexBank } from './bank-index'

export const LOG_LIMIT = 2000

export function emptyLearnState(): LearnState {
  return { version: 1, questions: {}, log: [] }
}

export type AnswerInput = {
  correct: boolean
  /** Self-grade for flashcards / optional upgrade after a correct test answer. Default: again/good. */
  grade?: Grade
  selected?: string[]
}

/** Pure: returns the next state after answering `question`. */
export function recordAnswer(state: LearnState, question: Pick<Question, 'id' | 'actId'>, input: AnswerInput, now = Date.now()): LearnState {
  const grade: Grade = input.correct ? (input.grade && input.grade !== 'again' ? input.grade : 'good') : 'again'
  const next = schedule(state.questions[question.id], grade, now)
  const log = [...state.log, { qid: question.id, at: now, correct: input.correct, grade, ...(input.selected ? { selected: input.selected } : {}) }]
  return {
    ...state,
    activeActId: question.actId,
    questions: { ...state.questions, [question.id]: next },
    log: log.length > LOG_LIMIT ? log.slice(log.length - LOG_LIMIT) : log,
  }
}

export type ProgressSummary = {
  total: number
  /** Answered at least once. */
  seen: number
  /** Last answer correct. */
  correct: number
  mastered: number
  /** Last answer wrong — waiting for a retry. */
  mistakes: number
  /** mastered / total, 0–100. */
  pct: number
}

export function summarize(questionIds: readonly string[], state: LearnState): ProgressSummary {
  let seen = 0
  let correct = 0
  let mastered = 0
  let mistakes = 0
  for (const id of questionIds) {
    const p = state.questions[id]
    if (!p) continue
    seen++
    if (p.lastCorrect) correct++
    else mistakes++
    if (isMastered(p)) mastered++
  }
  const total = questionIds.length
  return { total, seen, correct, mastered, mistakes, pct: total ? Math.round((mastered / total) * 100) : 0 }
}

export type ProgressGroup = ProgressSummary & { key: string; label: string }

/** Mastery per act / dział / stage (rozdział) / question type. */
export function progressBy(bank: QuestionBank, state: LearnState, by: 'act' | 'chapter' | 'stage' | 'type'): ProgressGroup[] {
  const { stageById } = indexBank(bank)
  const groups = new Map<string, { label: string; ids: string[] }>()
  const add = (key: string, label: string, id: string) => {
    const g = groups.get(key) ?? { label, ids: [] }
    g.ids.push(id)
    groups.set(key, g)
  }
  for (const q of bank.questions) {
    const st = stageById.get(q.stageId)
    if (by === 'act') add(q.actId, bank.acts.find((a) => a.id === q.actId)?.shortName ?? q.actId, q.id)
    else if (by === 'chapter') add(`${q.actId}|${st?.chapter ?? ''}`, st?.chapter ?? '', q.id)
    else if (by === 'stage') add(q.stageId, st?.label ?? q.stageId, q.id)
    else add(q.type, TYPE_LABELS[q.type], q.id)
  }
  return [...groups].map(([key, g]) => ({ key, label: g.label, ...summarize(g.ids, state) }))
}

/** Questions whose last answer was wrong, most recent first (for „Powtórz błędy”). */
export function mistakes(bank: QuestionBank, state: LearnState): Question[] {
  const { byId } = indexBank(bank)
  return Object.entries(state.questions)
    .filter(([id, p]) => !p.lastCorrect && byId.has(id))
    .sort((a, b) => b[1].lastAnsweredAt - a[1].lastAnsweredAt)
    .map(([id]) => byId.get(id)!)
}

export type StageStatus = 'empty' | 'new' | 'in-progress' | 'completed'

/** A stage is completed when every question was answered and ≥ 80 % of last answers are correct. */
export const STAGE_PASS = 0.8

export function stageProgress(stage: Stage, state: LearnState): ProgressSummary & { status: StageStatus } {
  const s = summarize(stage.questionIds, state)
  const status: StageStatus =
    s.total === 0 ? 'empty' : s.seen === 0 ? 'new' : s.seen === s.total && s.correct >= STAGE_PASS * s.total ? 'completed' : 'in-progress'
  return { ...s, status }
}

export const TYPE_LABELS: Record<QuestionType, string> = {
  definition: 'Definicje legalne',
  deadline: 'Terminy',
  conditions: 'Przesłanki',
  enumeration: 'Wyliczenia',
  exception: 'Wyjątki i wyłączenia',
  'duty-right': 'Obowiązki i uprawnienia',
  'which-article': 'Który artykuł?',
  comparison: 'Porównania',
  order: 'Kolejność czynności',
}
