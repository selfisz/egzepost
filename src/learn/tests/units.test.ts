import assert from 'node:assert/strict'
import { test } from 'node:test'
import { citation, findUnit } from '../generator/units'
import { real } from './fixtures'

test('jednostka redakcyjna ma pełną ścieżkę i cytat (art. 33 § 2 pkt 6 lit. a u.p.e.a.)', () => {
  const { corpus } = real()
  const u = findUnit(corpus, 'upea:33', '§ 2 pkt 6 lit. a')
  assert.ok(u)
  assert.equal(u.text, 'odroczenia terminu wykonania obowiązku,')
  assert.equal(citation(u), 'art. 33 § 2 pkt 6 lit. a u.p.e.a.')
  assert.equal(u.parent?.path, '§ 2 pkt 6')
})

test('akapit bez § rozbity przez pdftotext na linie jest jedną jednostką (art. 133 Kpa)', () => {
  const units = real().corpus.unitsByArticle.get('kpa:133')!
  assert.equal(units.length, 1)
  assert.match(units[0].text, /obowiązany jest przesłać odwołanie wraz z aktami sprawy organowi odwoławczemu w terminie siedmiu dni/)
})

test('punkty słowniczka bez § mają ścieżkę „pkt N” (art. 1a pkt 4 u.p.e.a.)', () => {
  const u = findUnit(real().corpus, 'upea:1a', 'pkt 4')
  assert.ok(u)
  assert.match(u.text, /^egzekutorze – rozumie się przez to/)
})

test('doklejony przez import następny paragraf („<§ 3.”) nie należy do jednostki (art. 67a § 2 Op)', () => {
  const u = findUnit(real().corpus, 'ordynacja:67a', '§ 2')
  assert.ok(u)
  assert.doesNotMatch(u.fullText, /<\s*§|W przypadku wniosku o umorzenie/u)
  for (const q of real().bank.questions) {
    for (const s of q.sources) assert.doesNotMatch(s.quote, /<\s*(§|Art\.)/u, q.id)
  }
})

test('pytania nie powstają z przepisów uchylonych', () => {
  for (const q of real().bank.questions) {
    for (const s of q.sources) assert.doesNotMatch(s.quote, /^\(?(uchylon|pominięt)/iu, q.id)
  }
})
