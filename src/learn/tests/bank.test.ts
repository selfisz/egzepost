import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { assembleBank, splitBank, type QuestionBankIndex, type QuestionBankPart } from '../bank'
import { validateDraft } from '../generator/validate'
import { renderFiles } from '../../../scripts/build-questions'
import { DATA_DIR, real } from './fixtures'

test('cały korpus: każde pytanie w banku przechodzi walidację', () => {
  const { bank, drafts, corpus } = real()
  const byId = new Map(drafts.map((d) => [d.id, d]))
  for (const q of bank.questions) assert.deepEqual(validateDraft(byId.get(q.id)!, corpus), [], q.id)
})

test('cały korpus: unikalne id, istniejące artykuły i rozdziały, każde pytanie w dokładnie jednym etapie', () => {
  const { bank, corpus } = real()
  const ids = bank.questions.map((q) => q.id)
  assert.equal(new Set(ids).size, ids.length)
  const inStage = new Map<string, number>()
  for (const s of bank.stages) for (const id of s.questionIds) inStage.set(id, (inStage.get(id) ?? 0) + 1)
  for (const q of bank.questions) {
    assert.ok(corpus.articleById.has(q.articleId), q.id)
    assert.ok(bank.stages.some((s) => s.id === q.stageId), q.id)
    assert.equal(inStage.get(q.id), 1, q.id)
  }
})

test('cały korpus: liczba opcji i poprawnych odpowiedzi zgodna z formatem', () => {
  for (const q of real().bank.questions) {
    const n = q.options?.length ?? 0
    const c = q.options?.filter((o) => o.correct).length ?? 0
    if (q.format === 'single') assert.ok(n >= 2 && n <= 5 && c === 1, q.id)
    if (q.format === 'multiple') assert.ok(n >= 4 && n <= 6 && c >= 2 && c < n, q.id)
    if (q.format === 'flashcard') assert.equal(n, 0, q.id)
    assert.deepEqual(q.options?.map((o) => o.id), q.options ? 'abcdef'.slice(0, n).split('') : undefined)
  }
})

test('etapy = rozdziały w kolejności ustawy; brak etapów-tematów', () => {
  const { bank } = real()
  const upea = bank.stages.filter((s) => s.actId === 'upea')
  assert.deepEqual(upea.map((s) => s.order), upea.map((_, i) => i))
  assert.equal(upea[0].id, 'upea:dzial-i:rozdzial-1')
  assert.ok(bank.stages.every((s) => s.section ? s.label === s.section : s.label === s.chapter))
})

test('generator jest deterministyczny', async () => {
  const a = renderFiles()
  const b = renderFiles()
  assert.deepEqual(a, b)
})

test('commitowany bank odpowiada danym (npm run build:questions)', () => {
  const files = renderFiles()
  for (const [name, body] of Object.entries(files)) {
    assert.equal(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'), body, `${name} nieaktualny — uruchom npm run build:questions`)
  }
})

test('podział na pliki per akt i złożenie z powrotem są odwracalne; pliki < 4 MiB (precache PWA)', () => {
  const { bank } = real()
  const { index, parts } = splitBank(bank)
  assert.deepEqual(assembleBank(index, parts), bank)
  for (const [name, body] of Object.entries(renderFiles())) assert.ok(Buffer.byteLength(body) < 4 * 1024 * 1024, name)
  const disk = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'questions.json'), 'utf8')) as QuestionBankIndex
  const diskParts = Object.values(disk.files).map((f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')) as QuestionBankPart)
  assert.equal(assembleBank(disk, diskParts).questions.length, bank.questions.length)
})
