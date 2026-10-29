import type { Grade, QuestionProgress } from './model'

/**
 * SM-2 (SuperMemo 2, Woźniak 1990) with Anki-style four buttons:
 * `again` = lapse (relearn in 10 min), `hard` = pass with shorter interval,
 * `good` = standard SM-2 step, `easy` = longer interval + ease bonus.
 */
export const DAY_MS = 86_400_000
export const RELEARN_MS = 10 * 60_000
export const MIN_EASE = 1.3
export const START_EASE = 2.5

export function newProgress(): QuestionProgress {
  return {
    ease: START_EASE,
    interval: 0,
    reps: 0,
    lapses: 0,
    dueAt: 0,
    lastAnsweredAt: 0,
    lastCorrect: false,
    seen: 0,
    correctCount: 0,
  }
}

export function schedule(prev: QuestionProgress | undefined, grade: Grade, now: number): QuestionProgress {
  const p = prev ?? newProgress()
  let { ease, interval, reps, lapses } = p
  const correct = grade !== 'again'

  if (!correct) {
    lapses += reps > 0 ? 1 : 0
    reps = 0
    interval = 0
    ease = Math.max(MIN_EASE, ease - 0.2)
  } else {
    if (reps === 0) interval = grade === 'easy' ? 4 : 1
    else if (reps === 1) interval = grade === 'hard' ? 3 : grade === 'easy' ? 8 : 6
    else {
      const factor = grade === 'hard' ? 1.2 : grade === 'easy' ? ease * 1.3 : ease
      interval = Math.max(interval + 1, Math.round(interval * factor))
    }
    if (grade === 'hard') ease = Math.max(MIN_EASE, ease - 0.15)
    if (grade === 'easy') ease += 0.15
    reps += 1
  }

  return {
    ease: Math.round(ease * 100) / 100,
    interval,
    reps,
    lapses,
    dueAt: correct ? now + interval * DAY_MS : now + RELEARN_MS,
    lastAnsweredAt: now,
    lastCorrect: correct,
    seen: p.seen + 1,
    correctCount: p.correctCount + (correct ? 1 : 0),
  }
}

export function isDue(p: QuestionProgress, now: number): boolean {
  return p.dueAt <= now
}

/** Answered correctly at least twice in a row (interval ≥ 6 days with `good`). */
export function isMastered(p: QuestionProgress | undefined): boolean {
  return Boolean(p && p.lastCorrect && p.reps >= 2)
}
