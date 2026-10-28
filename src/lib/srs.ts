import type { CardProgress } from '../types'

export type Grade = 'hard' | 'good' | 'easy'

const MS_DAY = 86_400_000

export function defaultProgress(articleId: string): CardProgress {
  return {
    articleId,
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: new Date(0).toISOString(),
  }
}

export function isDue(p: CardProgress, now = Date.now()): boolean {
  return new Date(p.dueAt).getTime() <= now
}

/** SM-2-ish: 1=hard (today), 2=good (days), 3=easy */
export function review(prev: CardProgress | undefined, articleId: string, grade: Grade): CardProgress {
  const base = prev ?? defaultProgress(articleId)
  let { ease, intervalDays, repetitions } = base

  if (grade === 'hard') {
    repetitions = 0
    intervalDays = 0
    ease = Math.max(1.3, ease - 0.2)
  } else {
    if (repetitions === 0) intervalDays = grade === 'good' ? 2 : 4
    else if (repetitions === 1) intervalDays = grade === 'good' ? 4 : 7
    else {
      const mult = grade === 'easy' ? ease + 0.15 : ease
      intervalDays = Math.max(1, Math.round(intervalDays * mult))
    }
    repetitions += 1
    if (grade === 'easy') ease += 0.15
  }

  return {
    articleId,
    ease,
    intervalDays,
    repetitions,
    dueAt: new Date(Date.now() + intervalDays * MS_DAY).toISOString(),
    lastResult: grade === 'hard' ? 'hard' : grade,
  }
}
