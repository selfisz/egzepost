import { emptyResult, type Draft, type DraftOption, type ExtractResult } from './draft'
import { durationSpellings, formatDuration, parseDeadlines, LADDER, type Duration } from './deadline-parse'
import { findUnit, sourceOf, type Corpus, type Unit } from './units'
import { shuffle } from '../text'

/**
 * Hand-picked pairings. Only the *pairing* is curated — every value is extracted from
 * the current text and the question is dropped if the text no longer supports it.
 */
export type ComparisonSpec = {
  id: string
  institution: string
  sides: { articleId: string; unit: string; expect: Duration }[]
}

export const COMPARISONS: ComparisonSpec[] = [
  {
    id: 'odwolanie-termin',
    institution: 'termin do wniesienia odwołania od decyzji',
    sides: [
      { articleId: 'kpa:129', unit: '§ 2', expect: { n: 14, unit: 'dzień' } },
      { articleId: 'ordynacja:223', unit: '§ 2', expect: { n: 14, unit: 'dzień' } },
    ],
  },
  {
    id: 'zazalenie-termin',
    institution: 'termin do wniesienia zażalenia na postanowienie',
    sides: [
      { articleId: 'kpa:141', unit: '§ 2', expect: { n: 7, unit: 'dzień' } },
      { articleId: 'ordynacja:236', unit: '§ 2', expect: { n: 7, unit: 'dzień' } },
    ],
  },
  {
    id: 'zazalenie-termin-upea',
    institution: 'termin do wniesienia zażalenia na postanowienie (egzekucja vs Kpa)',
    sides: [
      { articleId: 'upea:17', unit: '§ 1', expect: { n: 7, unit: 'dzień' } },
      { articleId: 'kpa:141', unit: '§ 2', expect: { n: 7, unit: 'dzień' } },
    ],
  },
  {
    id: 'przywrocenie-terminu',
    institution: 'termin na prośbę / podanie o przywrócenie terminu',
    sides: [
      { articleId: 'kpa:58', unit: '§ 2', expect: { n: 7, unit: 'dzień' } },
      { articleId: 'ordynacja:162', unit: '§ 2', expect: { n: 7, unit: 'dzień' } },
    ],
  },
]

export type OrderSpec = {
  id: string
  title: string
  steps: string[]
  /** Quotes (exact official text) that establish the order; each must exist in its unit. */
  relations: { articleId: string; unit: string; quote: string }[]
}

export const ORDERS: OrderSpec[] = [
  {
    id: 'upea-wszczecie',
    title: 'Wszczęcie egzekucji należności (u.p.e.a.)',
    steps: [
      'Doręczenie zobowiązanemu upomnienia',
      'Upływ 7 dni od doręczenia upomnienia',
      'Wszczęcie postępowania egzekucyjnego na wniosek wierzyciela i na podstawie tytułu wykonawczego',
    ],
    relations: [
      { articleId: 'upea:15', unit: '§ 1', quote: 'Postępowanie egzekucyjne może być wszczęte dopiero po upływie 7 dni od dnia doręczenia tego upomnienia' },
      { articleId: 'upea:26', unit: '§ 1', quote: 'Postępowanie egzekucyjne wszczyna się na wniosek wierzyciela o wszczęcie egzekucji administracyjnej i na podstawie wystawionego przez niego tytułu wykonawczego' },
    ],
  },
  {
    id: 'kpa-odwolanie',
    title: 'Odwołanie od decyzji (Kpa)',
    steps: [
      'Doręczenie decyzji stronie',
      'Wniesienie odwołania za pośrednictwem organu, który wydał decyzję',
      'Przesłanie odwołania wraz z aktami sprawy organowi odwoławczemu',
    ],
    relations: [
      { articleId: 'kpa:129', unit: '§ 1', quote: 'Odwołanie wnosi się do właściwego organu odwoławczego za pośrednictwem organu, który wydał decyzję' },
      { articleId: 'kpa:129', unit: '§ 2', quote: 'Odwołanie wnosi się w terminie czternastu dni od dnia doręczenia decyzji stronie' },
      { articleId: 'kpa:133', unit: '', quote: 'obowiązany jest przesłać odwołanie wraz z aktami sprawy organowi odwoławczemu w terminie siedmiu dni od dnia, w którym otrzymał odwołanie' },
    ],
  },
  {
    id: 'op-kontrola',
    title: 'Kontrola podatkowa (Op)',
    steps: [
      'Zawiadomienie kontrolowanego o zamiarze wszczęcia kontroli',
      'Wszczęcie kontroli (co do zasady nie wcześniej niż po 7 dniach od doręczenia zawiadomienia)',
      'Doręczenie protokołu kontroli',
      'Zastrzeżenia lub wyjaśnienia kontrolowanego do protokołu',
    ],
    relations: [
      { articleId: 'ordynacja:282b', unit: '§ 1', quote: 'Organy podatkowe zawiadamiają kontrolowanego o zamiarze wszczęcia kontroli podatkowej' },
      { articleId: 'ordynacja:282b', unit: '§ 2', quote: 'Kontrolę wszczyna się niewcześniej niż po upływie 7 dni i niepóźniej niż przed upływem 30 dni od dnia doręczenia zawiadomienia o zamiarze wszczęcia kontroli' },
      { articleId: 'ordynacja:290', unit: '§ 1', quote: 'Przebieg kontroli kontrolujący dokumentuje w protokole' },
      { articleId: 'ordynacja:291', unit: '§ 1', quote: 'Kontrolowany, który nie zgadza się z ustaleniami protokołu, może w terminie 14 dni od dnia jego doręczenia przedstawić zastrzeżenia lub wyjaśnienia' },
    ],
  },
]

const LETTERS = 'ABCDEF'

function comparisonDraft(corpus: Corpus, spec: ComparisonSpec): Draft | string {
  const units: Unit[] = []
  const actual: Duration[] = []
  for (const s of spec.sides) {
    const u = findUnit(corpus, s.articleId, s.unit)
    if (!u) return `brak jednostki ${s.articleId} ${s.unit}`
    const hits = parseDeadlines(u.text)
    if (hits.length !== 1) return `${s.articleId} ${s.unit}: oczekiwano jednego terminu, jest ${hits.length}`
    const d = hits[0].duration
    if (d.n !== s.expect.n || d.unit !== s.expect.unit) return `${s.articleId} ${s.unit}: termin ${formatDuration(d)} ≠ oczekiwany ${formatDuration(s.expect)}`
    units.push(u)
    actual.push(d)
  }
  const shorts = units.map((u) => u.act.shortName)
  const render = (vals: Duration[]) => vals.map((v, i) => `${shorts[i]}: ${formatDuration(v)}`).join('; ')
  const alt = (d: Duration, k: number) => {
    const ladder = LADDER[d.unit].filter((n) => n !== d.n)
    return { n: ladder[k % ladder.length], unit: d.unit }
  }
  const combos: Duration[][] = [
    [actual[0], alt(actual[1], 0)],
    [alt(actual[0], 1), actual[1]],
    [alt(actual[0], 0), alt(actual[1], 1)],
  ]
  const options: DraftOption[] = [
    { text: render(actual), correct: true, present: units.map((u, i) => ({ text: parseDeadlines(u.text)[0].phrase, source: i })) },
    ...combos.map<DraftOption>((vals) => ({
      text: render(vals),
      correct: false,
      absent: vals.flatMap((v, i) =>
        v.n === actual[i].n ? [] : durationSpellings(v).map((text) => ({ text, source: i })),
      ),
    })),
  ]
  return {
    id: `comparison:${spec.id}`,
    type: 'comparison',
    variant: 'deadline',
    format: 'single',
    difficulty: 3,
    actId: units[0].act.id,
    articleId: units[0].article.id,
    prompt: `Porównaj ${spec.institution}: ${shorts.join(' i ')}.`,
    answer: `${render(actual)} (${units.map((u) => sourceOf(u).citation).join('; ')})`,
    sources: units.map((u) => sourceOf(u)),
    options,
  }
}

function orderDraft(corpus: Corpus, spec: OrderSpec): Draft | string {
  const units: Unit[] = []
  const relations: { text: string; source: number }[] = []
  for (const r of spec.relations) {
    const u = findUnit(corpus, r.articleId, r.unit)
    if (!u) return `brak jednostki ${r.articleId} ${r.unit}`
    if (!units.includes(u)) units.push(u)
    relations.push({ text: r.quote, source: units.indexOf(u) })
  }
  const n = spec.steps.length
  const shown = shuffle(spec.steps.map((_, i) => i), `order:${spec.id}`)
  if (shown.every((v, i) => v === i)) shown.reverse()
  const letterOf = (step: number) => LETTERS[shown.indexOf(step)]
  const render = (perm: number[]) => perm.map(letterOf).join(' → ')
  const canonical = spec.steps.map((_, i) => i)
  const perms: number[][] = [canonical]
  const r = shuffle(
    [
      [1, 0, ...canonical.slice(2)],
      [...canonical.slice(0, n - 2), n - 1, n - 2],
      [...canonical].reverse(),
      [n - 1, ...canonical.slice(0, n - 1)],
    ],
    spec.id,
  )
  for (const p of r) {
    if (perms.some((x) => x.join() === p.join())) continue
    perms.push(p)
    if (perms.length === 4) break
  }
  return {
    id: `order:${spec.id}`,
    type: 'order',
    variant: 'sequence',
    format: 'single',
    difficulty: 3,
    actId: units[0].act.id,
    articleId: units[0].article.id,
    prompt: `${spec.title}: w jakiej kolejności następują czynności?`,
    context: shown.map((step, i) => `${LETTERS[i]}. ${spec.steps[step]}`).join('\n'),
    answer: spec.steps.join(' → '),
    sources: units.map((u) => sourceOf(u)),
    options: perms.map((p, i) => ({ text: render(p), correct: i === 0 })),
    order: {
      canonical: spec.steps,
      relations,
      render: (perm) => render(perm),
    },
  }
}

export function extractCurated(corpus: Corpus): ExtractResult {
  const res = emptyResult()
  for (const spec of COMPARISONS) {
    const d = comparisonDraft(corpus, spec)
    if (typeof d === 'string') res.rejected.push({ type: 'comparison', reason: 'tekst nie potwierdza porównania', articleId: spec.sides[0].articleId, detail: d })
    else res.drafts.push(d)
  }
  for (const spec of ORDERS) {
    const d = orderDraft(corpus, spec)
    if (typeof d === 'string') res.rejected.push({ type: 'order', reason: 'tekst nie potwierdza kolejności', articleId: spec.relations[0].articleId, detail: d })
    else res.drafts.push(d)
  }
  return res
}
