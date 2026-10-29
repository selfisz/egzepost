/**
 * Public API of the learning engine. UI code should import only from `src/learn`.
 * The generator (`src/learn/generator`) runs at build time and is not part of this API.
 */
export type {
  AnswerLogEntry,
  BankStats,
  Difficulty,
  Grade,
  LearnState,
  Question,
  QuestionBank,
  QuestionFormat,
  QuestionOption,
  QuestionProgress,
  QuestionType,
  SourceRef,
  Stage,
} from './model'

export { loadQuestionBank } from './bank'

export {
  buildSession,
  currentStage,
  guidedPath,
  type LearnMode,
  type SessionFilter,
  type SessionItem,
  type SessionOptions,
  type SessionPlan,
} from './session'

export { gradeAnswer, flashcardOutcome, type GradeResult } from './grading'

export {
  emptyLearnState,
  recordAnswer,
  mistakes,
  progressBy,
  stageProgress,
  summarize,
  TYPE_LABELS,
  type AnswerInput,
  type ProgressGroup,
  type ProgressSummary,
  type StageStatus,
} from './progress'

export { isDue, isMastered } from './srs'

export { loadLearnState, saveLearnState, parseLearnState, LEARN_STORAGE_KEY } from './storage'
