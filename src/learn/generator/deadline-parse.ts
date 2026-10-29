import { clean } from '../text'

export type TimeUnit = 'dzień' | 'tydzień' | 'miesiąc' | 'rok'
export type Duration = { n: number; unit: TimeUnit }

const WORD_NUM: Record<string, number> = {
  jednego: 1, jeden: 1, dwóch: 2, dwu: 2, dwa: 2, trzech: 3, trzy: 3, czterech: 4, cztery: 4,
  pięciu: 5, sześciu: 6, siedmiu: 7, ośmiu: 8, dziewięciu: 9, dziesięciu: 10, dwunastu: 12,
  czternastu: 14, dwudziestu: 20, trzydziestu: 30, sześćdziesięciu: 60, dziewięćdziesięciu: 90,
}

const UNIT_WORDS: Record<string, TimeUnit> = {
  dni: 'dzień', dnia: 'dzień',
  tygodni: 'tydzień', tygodnia: 'tydzień', tygodnie: 'tydzień',
  miesięcy: 'miesiąc', miesiąca: 'miesiąc', miesiące: 'miesiąc',
  lat: 'rok', roku: 'rok', lata: 'rok',
}

const NUM_RE = `\\d+|${Object.keys(WORD_NUM).join('|')}`
const UNIT_RE = Object.keys(UNIT_WORDS).sort((a, b) => b.length - a.length).join('|')

/**
 * `w terminie 7 dni od dnia doręczenia …` / `w ciągu siedmiu dni od …` / `w terminie miesiąca od …`.
 * Group 1 = whole "value" phrase (e.g. `siedmiu dni`), group 2 = number (optional), group 3 = unit word.
 */
export const DEADLINE_RE = new RegExp(
  `\\b(?:w terminie|w ciągu)\\s+((?:(${NUM_RE})\\s+)?(${UNIT_RE}))(?![\\p{L}])`,
  'giu',
)

export type DeadlineHit = {
  /** Full matched phrase, e.g. `w terminie siedmiu dni` */
  phrase: string
  /** Value phrase as written, e.g. `siedmiu dni` */
  valueText: string
  duration: Duration
  /** `od dnia doręczenia decyzji stronie` (as written), if the term has a start event. */
  start?: string
  index: number
}

export function parseDeadlines(text: string): DeadlineHit[] {
  const out: DeadlineHit[] = []
  DEADLINE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = DEADLINE_RE.exec(text))) {
    const unitWord = m[3].toLocaleLowerCase('pl')
    const unit = UNIT_WORDS[unitWord]
    const numRaw = m[2]?.toLocaleLowerCase('pl')
    let n: number
    if (!numRaw) {
      // `w terminie miesiąca` = 1 month; plural without a number is not a deadline value.
      if (!['dnia', 'tygodnia', 'miesiąca', 'roku'].includes(unitWord)) continue
      n = 1
    } else n = /^\d+$/.test(numRaw) ? Number(numRaw) : WORD_NUM[numRaw]
    if (!n) continue
    const after = text.slice(m.index + m[0].length)
    const sm = after.match(/^\s+(od\s+dnia\s+[^,;:.()–—]+)(?!:)/u)
    out.push({
      phrase: m[0],
      valueText: m[1],
      duration: { n, unit },
      start: sm ? clean(sm[1]) : undefined,
      index: m.index,
    })
  }
  return out
}

export function formatDuration(d: Duration): string {
  const { n, unit } = d
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
  switch (unit) {
    case 'dzień':
      return n === 1 ? '1 dzień' : `${n} dni`
    case 'tydzień':
      return n === 1 ? '1 tydzień' : few ? `${n} tygodnie` : `${n} tygodni`
    case 'miesiąc':
      return n === 1 ? '1 miesiąc' : few ? `${n} miesiące` : `${n} miesięcy`
    case 'rok':
      return n === 1 ? '1 rok' : few ? `${n} lata` : `${n} lat`
  }
}

/** All ways the value can be written in a statute — used to prove a distractor is absent. */
export function durationSpellings(d: Duration): string[] {
  const words = Object.entries(WORD_NUM).filter(([, v]) => v === d.n).map(([w]) => w)
  const unitWords = Object.entries(UNIT_WORDS).filter(([, u]) => u === d.unit).map(([w]) => w)
  const out = new Set<string>()
  for (const u of unitWords) {
    out.add(`${d.n} ${u}`)
    for (const w of words) out.add(`${w} ${u}`)
    if (d.n === 1) out.add(`terminie ${u}`)
  }
  return [...out]
}

/** Controlled ladders of plausible values per unit. */
export const LADDER: Record<TimeUnit, number[]> = {
  dzień: [3, 7, 14, 21, 30],
  tydzień: [1, 2, 4],
  miesiąc: [1, 2, 3, 6],
  rok: [1, 3, 5],
}

export function sameDuration(a: Duration, b: Duration): boolean {
  return a.n === b.n && a.unit === b.unit
}
