import type { Question, QuestionBank, Stage } from './model'

export type BankIndex = {
  byId: Map<string, Question>
  stageById: Map<string, Stage>
  /** Stages per act in guided-path order. */
  stagesByAct: Map<string, Stage[]>
}

const cache = new WeakMap<QuestionBank, BankIndex>()

export function indexBank(bank: QuestionBank): BankIndex {
  let idx = cache.get(bank)
  if (idx) return idx
  const stagesByAct = new Map<string, Stage[]>()
  for (const s of bank.stages) stagesByAct.set(s.actId, [...(stagesByAct.get(s.actId) ?? []), s])
  for (const list of stagesByAct.values()) list.sort((a, b) => a.order - b.order)
  idx = {
    byId: new Map(bank.questions.map((q) => [q.id, q])),
    stageById: new Map(bank.stages.map((s) => [s.id, s])),
    stagesByAct,
  }
  cache.set(bank, idx)
  return idx
}
