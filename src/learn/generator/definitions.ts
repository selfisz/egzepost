import { emptyResult, type Draft, type ExtractResult } from './draft'
import { Citation, sourceOf, type Corpus, type Unit } from './units'
import { hasArtifacts, isRepealed, norm, shuffle, tooSimilar, trimItem } from '../text'

/** `biegłym skarbowym – rozumie się przez to rzeczoznawcę …` */
const DEF_RE = /^(.{2,80}?)\s+[–—-]\s+rozumie się przez to\s+(.+)$/su

export type Definition = { unit: Unit; term: string; meaning: string; glossary: Unit | undefined; glossaryKey: string }

export function findDefinitions(corpus: Corpus): Definition[] {
  const out: Definition[] = []
  for (const u of corpus.units) {
    if (isRepealed(u.text)) continue
    const m = u.text.match(DEF_RE)
    if (!m) continue
    out.push({
      unit: u,
      term: m[1].trim(),
      meaning: trimItem(m[2]),
      glossary: u.parent,
      glossaryKey: `${u.article.id}|${u.parent?.path ?? ''}`,
    })
  }
  return out
}

const MAX_MEANING = 240

function usable(d: Definition): string | null {
  if (hasArtifacts(d.unit.text)) return 'artefakt importu'
  if (/[:]/.test(d.meaning) || d.unit.children.length) return 'definicja z wyliczeniem'
  if (/^(również|także|też)(?=\s|$)/u.test(d.meaning)) return 'definicja rozszerzająca („również”)'
  if (/o któr\w+ mowa w/u.test(d.meaning) && d.meaning.length < 140) return 'definicja przez samo odesłanie'
  if (/^\S+(\s+\S+){0,3}\s+w rozumieniu\b/u.test(d.meaning) || /Dz\. ?U\./u.test(d.meaning)) return 'definicja przez odesłanie do innej ustawy'
  if (d.meaning.length > MAX_MEANING) return 'definicja za długa na opcję'
  if (d.meaning.split(' ').length < 3) return 'definicja za krótka'
  return null
}

/** Term stems that would give the term away inside the meaning. */
function leaks(term: string, meaning: string): boolean {
  const m = norm(meaning)
  return norm(term)
    .split(/\s+/)
    .filter((w) => w.length >= 5)
    .some((w) => m.includes(w.slice(0, 5)))
}

export function extractDefinitions(corpus: Corpus): ExtractResult {
  const res = emptyResult()
  const all = findDefinitions(corpus)
  const ok: Definition[] = []
  for (const d of all) {
    const why = usable(d)
    if (why) res.rejected.push({ type: 'definition', reason: why, articleId: d.unit.article.id, detail: d.unit.path })
    else ok.push(d)
  }

  for (const d of ok) {
    const sameGlossary = ok.filter((x) => x !== d && x.glossaryKey === d.glossaryKey)
    const sameAct = ok.filter((x) => x !== d && x.unit.act.id === d.unit.act.id && x.glossaryKey !== d.glossaryKey)
    const pool = [...shuffle(sameGlossary, d.unit.path), ...shuffle(sameAct, d.unit.path)].filter(
      (x) => !tooSimilar(x.meaning, d.meaning) && norm(x.term) !== norm(d.term),
    )
    const src = sourceOf(d.unit)
    const short = d.unit.act.shortName
    const glossaryCite = d.glossary ? Citation(d.glossary) : Citation(d.unit)
    const base = {
      type: 'definition' as const,
      actId: d.unit.act.id,
      articleId: d.unit.article.id,
      sources: [src],
    }

    const picks = pool.slice(0, 3)
    if (picks.length < 3) {
      res.rejected.push({ type: 'definition', reason: 'za mało weryfikowalnych dystraktorów', articleId: d.unit.article.id, detail: d.unit.path })
      continue
    }
    const meaningQ: Draft = {
      ...base,
      id: `definition:meaning:${d.unit.article.id}:${d.unit.path}`,
      variant: 'meaning',
      format: 'single',
      difficulty: 2,
      prompt: `Ilekroć w ${short} jest mowa o „${d.term}”, rozumie się przez to:`,
      answer: d.meaning,
      hidden: [d.meaning],
      options: [
        { text: d.meaning, correct: true, present: [{ text: d.meaning }] },
        ...picks.map((p) => ({
          text: p.meaning,
          correct: false,
          note: `To definicja pojęcia „${p.term}” (${Citation(p.unit)}).`,
          absent: [{ text: p.meaning }],
        })),
      ],
    }
    res.drafts.push(meaningQ)

    if (leaks(d.term, d.meaning)) {
      res.rejected.push({ type: 'definition', reason: 'definicja zdradza pojęcie (wariant odwrotny)', articleId: d.unit.article.id, detail: d.unit.path })
      continue
    }
    const termPool = pool.filter((p) => !leaks(p.term, d.meaning)).slice(0, 3)
    if (termPool.length < 3) continue
    res.drafts.push({
      ...base,
      id: `definition:term:${d.unit.article.id}:${d.unit.path}`,
      variant: 'term',
      format: 'single',
      difficulty: 1,
      prompt: `Które pojęcie ze słowniczka (${glossaryCite}) oznacza: „${d.meaning}”?`,
      answer: d.term,
      hidden: [d.term],
      options: [
        { text: d.term, correct: true, present: [{ text: `${d.term} – rozumie się przez to` }] },
        ...termPool.map((p) => ({
          text: p.term,
          correct: false,
          note: `„${p.term}” zdefiniowano inaczej (${Citation(p.unit)}).`,
          absent: [{ text: `${p.term} – rozumie się przez to` }],
        })),
      ],
    })
  }
  return res
}
