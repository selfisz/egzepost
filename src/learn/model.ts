/** Public data model of the learning engine (question bank + learner state). */

export type QuestionType =
  | 'definition'
  | 'deadline'
  | 'conditions'
  | 'enumeration'
  | 'exception'
  | 'duty-right'
  | 'which-article'
  | 'comparison'
  | 'order'

export type QuestionFormat = 'single' | 'multiple' | 'flashcard'

/** 1 = podstawowy, 2 = średni, 3 = zaawansowany */
export type Difficulty = 1 | 2 | 3

/** Legal basis: one editorial unit of an act, with the official text of that unit. */
export type SourceRef = {
  actId: string
  articleId: string
  articleNumber: string
  /** Unit path inside the article, e.g. `§ 2 pkt 3 lit. a`; empty = whole article. */
  unit: string
  /** Human citation, e.g. `art. 33 § 2 pkt 3 u.p.e.a.` */
  citation: string
  /** Official text of the unit (whitespace-normalized). */
  quote: string
}

export type QuestionOption = {
  id: string
  text: string
  correct: boolean
  /** Why this option is right/wrong, with its own basis when it comes from another provision. */
  note?: string
}

export type Question = {
  id: string
  type: QuestionType
  /** Sub-kind inside a type, e.g. `meaning` / `term` for definitions. */
  variant: string
  format: QuestionFormat
  difficulty: Difficulty
  actId: string
  articleId: string
  stageId: string
  prompt: string
  /** Fragment shown with the prompt; `▢` marks the gap being asked about. */
  context?: string
  options?: QuestionOption[]
  /** Canonical short answer — back of the flashcard and feedback line. */
  answer: string
  /** sources[0] is the primary legal basis. */
  sources: SourceRef[]
}

/** One learning stage = one rozdział (or a dział without rozdziały). */
export type Stage = {
  id: string
  actId: string
  /** Position in the act's guided path (0-based). */
  order: number
  chapter: string
  section?: string
  label: string
  articleIds: string[]
  /** Ordered for teaching: article order, then difficulty. */
  questionIds: string[]
}

export type BankStats = {
  total: number
  byType: Record<string, number>
  byAct: Record<string, number>
  byFormat: Record<string, number>
  byDifficulty: Record<string, number>
  rejected: number
  rejectedByReason: Record<string, number>
}

export type QuestionBank = {
  version: 1
  /** `generatedAt` of `public/data/index.json` the bank was built from. */
  dataGeneratedAt: string
  acts: { id: string; shortName: string }[]
  stages: Stage[]
  questions: Question[]
  stats: BankStats
}

/** Anki-style buttons over SM-2. Tests map wrong → `again`, right → `good`. */
export type Grade = 'again' | 'hard' | 'good' | 'easy'

export type QuestionProgress = {
  ease: number
  /** Days */
  interval: number
  reps: number
  lapses: number
  /** Epoch ms */
  dueAt: number
  lastAnsweredAt: number
  lastCorrect: boolean
  seen: number
  correctCount: number
}

export type AnswerLogEntry = {
  qid: string
  at: number
  correct: boolean
  grade: Grade
  selected?: string[]
}

export type LearnState = {
  version: 1
  questions: Record<string, QuestionProgress>
  /** Newest last, capped. */
  log: AnswerLogEntry[]
  /** Act of the guided path the learner last worked on. */
  activeActId?: string
}
