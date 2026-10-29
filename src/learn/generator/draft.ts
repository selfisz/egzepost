import type { Difficulty, QuestionFormat, QuestionType, SourceRef } from '../model'

/**
 * A text that must (present) or must not (absent) occur in a source quote.
 * `source` = index into `Draft.sources`; default: any source for present, primary (0) for absent.
 */
export type Check = { text: string; source?: number }

/**
 * Every option carries the textual evidence for its truth value. The validator
 * refuses options whose correctness is not backed by the cited text.
 */
export type DraftOption = {
  text: string
  correct: boolean
  note?: string
  present?: Check[]
  absent?: Check[]
  /** Option is wrong because `absent` texts do not occur in this article (which-article). */
  absentInArticle?: string
}

/** Curated procedural order: each relation quote must occur in the sources. */
export type OrderCheck = {
  /** Step labels in the order established by `relations`. */
  canonical: string[]
  relations: Check[]
  /** Option text for a permutation of step indices. */
  render: (perm: number[]) => string
}

export type Draft = {
  id: string
  type: QuestionType
  variant: string
  format: QuestionFormat
  difficulty: Difficulty
  actId: string
  articleId: string
  prompt: string
  context?: string
  options?: DraftOption[]
  answer: string
  sources: SourceRef[]
  /** Correct = the option NOT backed by the text (e.g. „którego elementu nie wymienia”). */
  negated?: boolean
  /** Texts that must not leak into prompt/context (would give the answer away). */
  hidden?: string[]
  order?: OrderCheck
}

export type Rejection = { type: QuestionType | 'unit'; reason: string; articleId: string; detail?: string }

export type ExtractResult = { drafts: Draft[]; rejected: Rejection[] }

export function emptyResult(): ExtractResult {
  return { drafts: [], rejected: [] }
}
