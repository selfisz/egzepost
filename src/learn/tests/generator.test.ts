import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseDeadlines } from '../generator/deadline-parse'
import { findDeadlines } from '../generator/deadlines'
import { COMPARISONS, ORDERS } from '../generator/curated'
import { findUnit } from '../generator/units'
import { contains } from '../text'
import { question, real } from './fixtures'

const correct = (id: string) => question(id).options!.filter((o) => o.correct).map((o) => o.text)
const wrong = (id: string) => question(id).options!.filter((o) => !o.correct).map((o) => o.text)

test('definicje: „egzekutor” (art. 1a pkt 4 u.p.e.a.) — odpowiedź = definicja z przepisu', () => {
  const id = 'definition:meaning:upea:1a:pkt 4'
  const q = question(id)
  assert.match(q.prompt, /„egzekutorze”/)
  assert.deepEqual(correct(id), ['pracownika obsługującego organ egzekucyjny, uprawnionego do dokonywania czynności egzekucyjnych'])
  assert.equal(q.sources[0].citation, 'art. 1a pkt 4 u.p.e.a.')
  for (const w of wrong(id)) assert.ok(!contains(q.sources[0].quote, w))
  for (const o of q.options!.filter((x) => !x.correct)) assert.match(o.note!, /u\.p\.e\.a\./, 'dystraktor z tego samego aktu')
})

test('definicje: dystraktory pochodzą z tego samego aktu (nie mieszamy słowniczków)', () => {
  for (const q of real().bank.questions.filter((x) => x.type === 'definition')) {
    const short = real().bank.acts.find((a) => a.id === q.actId)!.shortName
    for (const o of q.options!.filter((x) => !x.correct)) assert.ok(o.note!.endsWith(`${short}).`), `${q.id}: ${o.note}`)
  }
})

test('terminy: art. 141 § 2 Kpa — 7 dni od doręczenia postanowienia', () => {
  const [hit] = parseDeadlines(findUnit(real().corpus, 'kpa:141', '§ 2')!.text)
  assert.deepEqual(hit.duration, { n: 7, unit: 'dzień' })
  assert.equal(hit.start, 'od dnia doręczenia postanowienia stronie')
  assert.deepEqual(correct('deadline:value:kpa:141:§ 2'), ['7 dni'])
  assert.match(question('deadline:value:kpa:141:§ 2').context!, /w terminie ▢ od dnia doręczenia/)
  assert.deepEqual(correct('deadline:start:kpa:141:§ 2'), ['od dnia doręczenia postanowienia stronie'])
})

test('terminy: art. 129 § 2 Kpa — 14 dni; dystraktory to inne wartości, nieobecne w przepisie', () => {
  const id = 'deadline:value:kpa:129:§ 2'
  assert.deepEqual(correct(id), ['14 dni'])
  const quote = question(id).sources[0].quote
  for (const w of wrong(id)) {
    assert.notEqual(w, '14 dni')
    assert.ok(!contains(quote, w))
  }
})

test('terminy: „w terminie miesiąca” (art. 241 § 2 pkt 1 Op) = 1 miesiąc', () => {
  assert.deepEqual(correct('deadline:value:ordynacja:241:§ 2 pkt 1'), ['1 miesiąc'])
})

test('terminy: jednostka z kilkoma terminami nie daje pytania o termin', () => {
  const { ambiguous } = findDeadlines(real().corpus)
  assert.ok(ambiguous.length > 0)
  const ids = new Set(real().bank.questions.map((q) => q.id))
  for (const u of ambiguous) assert.ok(!ids.has(`deadline:value:${u.article.id}:${u.path}`), `${u.article.id} ${u.path}`)
})

test('przesłanki: art. 33 § 2 u.p.e.a. (podstawy zarzutu) — wielokrotny wybór z listy zamkniętej', () => {
  const id = 'conditions:multiple:upea:33:§ 2'
  const q = question(id)
  assert.equal(q.format, 'multiple')
  const list = q.sources[0].quote
  for (const c of correct(id)) assert.ok(contains(list, c), c)
  for (const w of wrong(id)) assert.ok(!contains(list, w), w)
  assert.ok(correct(id).length >= 2 && wrong(id).length >= 2)
})

test('lista otwarta („w szczególności”) daje tylko fiszkę, nigdy test „czego nie wymienia”', () => {
  const ids = new Set(real().bank.questions.map((q) => q.id))
  assert.ok(ids.has('enumeration:recall:kpa:67:§ 2'))
  assert.ok(!ids.has('enumeration:not-listed:kpa:67:§ 2'))
  assert.ok(!ids.has('enumeration:multiple:kpa:67:§ 2'))
  for (const q of real().bank.questions) {
    if (q.variant === 'multiple' || q.variant === 'not-listed') assert.doesNotMatch(q.context ?? '', /w szczególności/iu, q.id)
  }
})

test('obowiązek/uprawnienie: „nie może” i „może być” nigdy nie są uprawnieniem', () => {
  for (const q of real().bank.questions.filter((x) => x.type === 'duty-right')) {
    assert.doesNotMatch(q.sources[0].quote, /\bnie może\b/u, q.id)
    assert.doesNotMatch(q.sources[0].quote, /\bmoże (być|zostać)\b/u, q.id)
  }
})

test('obowiązek/uprawnienie: podmiot-dystraktor nie występuje w przepisie', () => {
  const qs = real().bank.questions.filter((x) => x.type === 'duty-right' && x.variant === 'actor')
  assert.ok(qs.length > 20)
  for (const q of qs) {
    for (const o of q.options!.filter((x) => !x.correct)) {
      const quote = q.sources[0].quote.toLocaleLowerCase('pl')
      assert.ok(!quote.includes(o.text.toLocaleLowerCase('pl')), `${q.id}: ${o.text}`)
      assert.ok(!new RegExp(`(^|\\s)${o.text.split(' ').pop()!.toLocaleLowerCase('pl')}(\\s|[,.;]|$)`, 'u').test(quote), `${q.id}: ${o.text}`)
    }
  }
})

test('wyjątki: klauzula „chyba że” pochodzi z przepisu, dystraktory z innych', () => {
  const qs = real().bank.questions.filter((x) => x.type === 'exception' && x.variant === 'clause')
  assert.ok(qs.length > 20)
  for (const q of qs) {
    assert.ok(contains(q.sources[0].quote, q.answer), q.id)
    for (const o of q.options!.filter((x) => !x.correct)) assert.ok(!contains(q.sources[0].quote, o.text), q.id)
  }
})

test('który artykuł: dystraktory z tego samego rozdziału i nie zawierają cytowanego zdania', () => {
  const { bank, corpus } = real()
  for (const q of bank.questions.filter((x) => x.type === 'which-article').slice(0, 300)) {
    const stage = bank.stages.find((s) => s.id === q.stageId)!
    for (const o of q.options!) {
      const label = o.text.split(' · ')[0]
      const art = stage.articleIds.map((id) => corpus.articleById.get(id)!).find((a) => a.label === label)
      assert.ok(art, `${q.id}: ${o.text} spoza rozdziału`)
      const probe = q.context!.replace(/^„(§ \S+ )?/, '').replace(/”$/, '')
      if (!o.correct) assert.ok(!contains(art.text, probe), `${q.id}: ${o.text}`)
    }
  }
})

test('porównania i kolejność (kuratorowane): wszystkie potwierdzone aktualnym tekstem', () => {
  const ids = new Set(real().bank.questions.map((q) => q.id))
  for (const c of COMPARISONS) assert.ok(ids.has(`comparison:${c.id}`), c.id)
  for (const o of ORDERS) assert.ok(ids.has(`order:${o.id}`), o.id)
  assert.deepEqual(correct('comparison:odwolanie-termin'), ['Kpa: 14 dni; Op: 14 dni'])
})
