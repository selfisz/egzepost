import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Draft } from '../generator/draft'
import { validateAll, validateDraft, type Rule } from '../generator/validate'
import { draft, real } from './fixtures'

const base = () => structuredClone({ ...draft('deadline:value:kpa:141:§ 2'), order: undefined }) as Draft

function rules(d: Draft): Rule[] {
  return validateDraft(d, real().corpus).map((p) => p.rule)
}

test('poprawne pytanie przechodzi walidację', () => {
  assert.deepEqual(validateDraft(base(), real().corpus), [])
})

test('struktura: puste pytanie / brak podstawy', () => {
  const d = base()
  d.prompt = ' '
  assert.ok(rules(d).includes('struktura'))
  const e = base()
  e.sources = []
  assert.ok(rules(e).includes('podstawa prawna'))
})

test('podstawa prawna: nieistniejący artykuł, jednostka albo cytat niezgodny z tekstem', () => {
  const a = base()
  a.sources[0] = { ...a.sources[0], articleId: 'kpa:9999', }
  assert.ok(rules(a).includes('podstawa prawna'))
  const b = base()
  b.sources[0] = { ...b.sources[0], unit: '§ 9' }
  assert.ok(rules(b).includes('podstawa prawna'))
  const c = base()
  c.sources[0] = { ...c.sources[0], quote: c.sources[0].quote.replace('siedmiu', 'czternastu') }
  assert.ok(rules(c).includes('podstawa prawna'))
})

test('zgodność z tekstem: poprawna odpowiedź musi wynikać z cytatu', () => {
  const d = base()
  const ok = d.options!.find((o) => o.correct)!
  ok.present = [{ text: 'w terminie czternastu dni' }]
  assert.ok(rules(d).includes('zgodność z tekstem'))
})

test('zgodność z tekstem: dystraktor nie może występować w przepisie', () => {
  const d = base()
  const wrong = d.options!.find((o) => !o.correct)!
  wrong.absent = [{ text: 'siedmiu dni' }]
  assert.ok(rules(d).includes('zgodność z tekstem'))
})

test('zgodność z tekstem: dystraktor bez dowodu błędności jest odrzucany', () => {
  const d = base()
  d.options!.find((o) => !o.correct)!.absent = undefined
  assert.ok(rules(d).includes('zgodność z tekstem'))
})

test('liczba odpowiedzi: jednokrotny wybór z dwiema poprawnymi / wielokrotny z jedną', () => {
  const d = base()
  d.options![1].correct = true
  d.options![1].present = d.options![0].present
  assert.ok(rules(d).includes('liczba odpowiedzi'))
  const m = base()
  m.format = 'multiple'
  assert.ok(rules(m).includes('liczba odpowiedzi'))
  const f = base()
  f.format = 'flashcard'
  assert.ok(rules(f).includes('liczba odpowiedzi'))
})

test('jednoznaczność: luka nie może zdradzać odpowiedzi; opcje nie mogą się powtarzać', () => {
  const d = base()
  d.context = d.sources[0].quote
  assert.ok(rules(d).includes('jednoznaczność'))
  const e = base()
  e.options![2].text = e.options![1].text
  assert.ok(rules(e).includes('jednoznaczność'))
})

test('sensowność dydaktyczna: artefakt importu PDF w opcji', () => {
  const d = base()
  d.options![1].text = 'Nowe brzmienie § 1a wejdzie w życie'
  assert.ok(rules(d).includes('sensowność dydaktyczna'))
})

test('duplikaty: to samo pytanie dwa razy — zostaje pierwsze', () => {
  const { valid, rejected } = validateAll([base(), base()], real().corpus)
  assert.equal(valid.length, 1)
  assert.equal(rejected[0].problems[0].rule, 'duplikat')
})

test('kolejność: relacja bez podstawy w tekście jest odrzucana', () => {
  const orig = draft('order:kpa-odwolanie')
  const d: Draft = { ...orig, order: { ...orig.order!, relations: [{ text: 'organ odwoławczy rozpatruje odwołanie w 3 dni' }] } }
  assert.deepEqual(validateDraft(draft('order:kpa-odwolanie'), real().corpus), [])
  assert.ok(rules(d).includes('zgodność z tekstem'))
})
