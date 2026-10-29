import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildSession,
  currentStage,
  emptyLearnState,
  flashcardOutcome,
  gradeAnswer,
  guidedPath,
  loadLearnState,
  mistakes,
  progressBy,
  recordAnswer,
  saveLearnState,
  stageProgress,
  type LearnState,
} from '..'
import { DAY_MS, RELEARN_MS, schedule } from '../srs'
import { real } from './fixtures'

const T0 = Date.UTC(2026, 9, 29, 12)

test('SM-2: good → 1, 6, 15 dni; again → 10 min i lapse; ease ≥ 1,3', () => {
  let p = schedule(undefined, 'good', T0)
  assert.equal(p.interval, 1)
  p = schedule(p, 'good', T0)
  assert.equal(p.interval, 6)
  p = schedule(p, 'good', T0)
  assert.equal(p.interval, 15)
  assert.equal(p.dueAt, T0 + 15 * DAY_MS)
  const lapse = schedule(p, 'again', T0)
  assert.equal(lapse.reps, 0)
  assert.equal(lapse.lapses, 1)
  assert.equal(lapse.dueAt, T0 + RELEARN_MS)
  let worst = p
  for (let i = 0; i < 20; i++) worst = schedule(worst, 'again', T0)
  assert.equal(worst.ease, 1.3)
  assert.ok(schedule(undefined, 'easy', T0).interval > schedule(undefined, 'good', T0).interval)
})

test('gradeAnswer: jednokrotny i wielokrotny wybór', () => {
  const { bank } = real()
  const single = bank.questions.find((q) => q.format === 'single')!
  const ok = single.options!.find((o) => o.correct)!.id
  const bad = single.options!.find((o) => !o.correct)!.id
  assert.equal(gradeAnswer(single, [ok]).correct, true)
  assert.equal(gradeAnswer(single, [bad]).correct, false)
  const multi = bank.questions.find((q) => q.format === 'multiple')!
  const all = multi.options!.filter((o) => o.correct).map((o) => o.id)
  assert.equal(gradeAnswer(multi, all).correct, true)
  const partial = gradeAnswer(multi, all.slice(1))
  assert.equal(partial.correct, false)
  assert.deepEqual(partial.missed, [all[0]])
})

test('„Ucz się teraz” bez filtrów: pierwszy rozdział pierwszego aktu, same nowe pytania w kolejności ustawy', () => {
  const { bank } = real()
  const plan = buildSession(bank, emptyLearnState(), { now: T0 })
  const first = guidedPath(bank, emptyLearnState(), bank.acts[0].id).find((x) => x.progress.status !== 'empty')!.stage
  assert.equal(plan.stage?.id, first.id)
  assert.ok(plan.items.length > 0 && plan.items.length <= 12)
  assert.ok(plan.items.every((i) => i.reason === 'new' && i.question.stageId === first.id))
  const order = plan.items.map((i) => first.questionIds.indexOf(i.question.id))
  assert.deepEqual(order, [...order].sort((a, b) => a - b))
})

function answerAll(state: LearnState, ids: string[], correct: boolean, now: number): LearnState {
  const { bank } = real()
  for (const id of ids) state = recordAnswer(state, bank.questions.find((q) => q.id === id)!, { correct }, now)
  return state
}

test('ścieżka rozdział po rozdziale: ukończenie rozdziału przenosi do następnego', () => {
  const { bank } = real()
  const s0 = currentStage(bank, emptyLearnState())!
  const state = answerAll(emptyLearnState(), s0.questionIds, true, T0)
  assert.equal(stageProgress(s0, state).status, 'completed')
  const s1 = currentStage(bank, state)!
  assert.notEqual(s1.id, s0.id)
  assert.ok(s1.order > s0.order)
  const plan = buildSession(bank, state, { now: T0 + 60_000 })
  assert.equal(plan.stage?.id, s1.id)
  assert.ok(plan.items.every((i) => i.reason === 'new'))
})

test('błędne odpowiedzi wracają najpierw (retry), potem zaległe powtórki', () => {
  const { bank } = real()
  const s0 = currentStage(bank, emptyLearnState())!
  const nWrong = Math.ceil(s0.questionIds.length * 0.3)
  const wrongIds = s0.questionIds.slice(0, nWrong)
  let state = answerAll(emptyLearnState(), s0.questionIds.slice(nWrong), true, T0)
  state = answerAll(state, wrongIds, false, T0 + 1000)
  assert.deepEqual(mistakes(bank, state).map((q) => q.id).sort(), [...wrongIds].sort())
  const plan = buildSession(bank, state, { now: T0 + 2 * DAY_MS })
  const retries = plan.items.filter((i) => i.reason === 'retry')
  assert.equal(retries.length, Math.min(nWrong, 6))
  assert.deepEqual(plan.items.slice(0, retries.length).map((i) => i.reason), retries.map(() => 'retry'))
  assert.ok(plan.items.some((i) => i.reason === 'review'))
  assert.equal(plan.stage?.id, s0.id, 'rozdział z < 80 % poprawnych nie jest ukończony')
})

test('filtry opcjonalne: akt, dział, rozdział, tryb, poziom trudności', () => {
  const { bank } = real()
  const kpa = buildSession(bank, emptyLearnState(), { now: T0, filter: { actId: 'kpa' } })
  assert.equal(kpa.actId, 'kpa')
  assert.ok(kpa.items.every((i) => i.question.actId === 'kpa'))
  const target = bank.stages.find((s) => s.actId === 'ordynacja' && s.questionIds.length > 15)!
  const byStage = buildSession(bank, emptyLearnState(), { now: T0, filter: { stageId: target.id } })
  assert.equal(byStage.stage?.id, target.id)
  assert.ok(byStage.items.every((i) => i.question.stageId === target.id))
  const chapter = buildSession(bank, emptyLearnState(), { now: T0, filter: { actId: 'ordynacja', chapter: target.chapter } })
  assert.equal(chapter.stage?.chapter, target.chapter)
  const easy = buildSession(bank, emptyLearnState(), { now: T0, maxDifficulty: 1, size: 40, filter: { actId: 'upea' } })
  assert.ok(easy.items.length > 0 && easy.items.every((i) => i.question.difficulty === 1))
  const test_ = buildSession(bank, emptyLearnState(), { now: T0, mode: 'test', size: 50, filter: { actId: 'kpa' } })
  assert.ok(test_.items.every((i) => i.question.format !== 'flashcard'))
  const cards = buildSession(bank, emptyLearnState(), { now: T0, mode: 'flashcards' })
  assert.ok(cards.items.every((i) => i.presentAs === 'flashcard'))
})

test('aktywny akt = ostatnio ćwiczony', () => {
  const { bank } = real()
  const q = bank.questions.find((x) => x.actId === 'ordynacja')!
  const state = recordAnswer(emptyLearnState(), q, flashcardOutcome('good'), T0)
  assert.equal(state.activeActId, 'ordynacja')
  assert.equal(buildSession(bank, state, { now: T0 }).actId, 'ordynacja')
})

test('postęp per akt / dział / rozdział / typ', () => {
  const { bank } = real()
  const s0 = currentStage(bank, emptyLearnState())!
  let state = answerAll(emptyLearnState(), s0.questionIds, true, T0)
  state = answerAll(state, s0.questionIds, true, T0 + 7 * DAY_MS)
  const byStage = progressBy(bank, state, 'stage').find((g) => g.key === s0.id)!
  assert.equal(byStage.mastered, s0.questionIds.length)
  assert.equal(byStage.pct, 100)
  assert.ok(progressBy(bank, state, 'act').every((g) => g.total > 0))
  assert.ok(progressBy(bank, state, 'type').some((g) => g.label === 'Terminy'))
  assert.ok(progressBy(bank, state, 'chapter').length >= 20)
})

test('zapis i odczyt stanu (localStorage) + log z limitem', () => {
  const mem = new Map<string, string>()
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) }
  const { bank } = real()
  let state = emptyLearnState()
  for (let i = 0; i < 2100; i++) state = recordAnswer(state, bank.questions[i % 50], { correct: i % 3 !== 0 }, T0 + i)
  assert.equal(state.log.length, 2000)
  saveLearnState(state, storage)
  assert.deepEqual(loadLearnState(storage), state)
  mem.set('regest:learn:v1', '{zepsute')
  assert.deepEqual(loadLearnState(storage), emptyLearnState())
})
