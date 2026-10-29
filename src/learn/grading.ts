import type { Grade, Question } from './model'

export type GradeResult = {
  correct: boolean
  correctIds: string[]
  /** Correct options the learner did not select. */
  missed: string[]
  /** Selected options that are wrong. */
  wrong: string[]
}

/** Single choice: exactly the right option. Multiple choice: exactly the set of right options. */
export function gradeAnswer(question: Question, selectedIds: readonly string[]): GradeResult {
  const options = question.options ?? []
  const correctIds = options.filter((o) => o.correct).map((o) => o.id)
  const selected = new Set(selectedIds)
  const missed = correctIds.filter((id) => !selected.has(id))
  const wrong = [...selected].filter((id) => !correctIds.includes(id))
  return { correct: options.length > 0 && missed.length === 0 && wrong.length === 0, correctIds, missed, wrong }
}

/** Flashcards are self-graded: „Nie wiem” = again, anything else counts as recalled. */
export function flashcardOutcome(grade: Grade): { correct: boolean; grade: Grade } {
  return { correct: grade !== 'again', grade }
}
