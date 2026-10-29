import type { LearnState } from './model'
import { emptyLearnState } from './progress'

/** Separate from the legacy `egzepost:user:v1` store, which is left untouched. */
export const LEARN_STORAGE_KEY = 'regest:learn:v1'

type KV = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): KV | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export function parseLearnState(raw: string | null): LearnState {
  if (!raw) return emptyLearnState()
  try {
    const s = JSON.parse(raw) as Partial<LearnState>
    if (s?.version !== 1 || typeof s.questions !== 'object' || !s.questions) return emptyLearnState()
    return {
      version: 1,
      questions: s.questions,
      log: Array.isArray(s.log) ? s.log : [],
      ...(s.activeActId ? { activeActId: s.activeActId } : {}),
    }
  } catch {
    return emptyLearnState()
  }
}

export function loadLearnState(storage: KV | undefined = defaultStorage()): LearnState {
  return parseLearnState(storage?.getItem(LEARN_STORAGE_KEY) ?? null)
}

export function saveLearnState(state: LearnState, storage: KV | undefined = defaultStorage()): void {
  storage?.setItem(LEARN_STORAGE_KEY, JSON.stringify(state))
}
