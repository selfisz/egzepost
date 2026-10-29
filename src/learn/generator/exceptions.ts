import { emptyResult, type DraftOption, type ExtractResult } from './draft'
import { focus, gap, quoteCtx } from './common'
import { Citation, sourceOf, type Corpus, type Unit } from './units'
import { hasArtifacts, isRepealed, shuffle, tooSimilar, trimItem } from '../text'

type Clause = { unit: Unit; marker: 'chyba że' | 'z wyjątkiem'; clause: string; index: number }

const GENERIC = /^(przepisy|ustawa|ustawy|odrębne przepisy|przepis)\b.{0,30}\b(stanowi|stanowią|przewiduj|wynika)/iu
/** Clause ends at `.`/`;` that is not an abbreviation (`art.`, `pkt.`, `ust.`…). */
const CLAUSE_END = /(?<!\b(?:art|pkt|ust|lit|poz|nr|r|tj|np|zm))[.;](?:\s|$)/u
const CLAUSE_END_COMMA = /(?<!\b(?:art|pkt|ust|lit|poz|nr|r|tj|np|zm))[,.;](?:\s|$)/u
const REF_ONLY = /^(art\.|§|pkt|ust\.|lit\.|przypadk\w* (określon|wymienion|o któr))/iu

/** `…, chyba że <clause>.` / `…, z wyjątkiem <clause>,` — exactly one per unit. */
export function findClauses(corpus: Corpus): { clauses: Clause[]; rejected: { unit: Unit; reason: string }[] } {
  const clauses: Clause[] = []
  const rejected: { unit: Unit; reason: string }[] = []
  for (const u of corpus.units) {
    if (isRepealed(u.text)) continue
    const hits = [...u.text.matchAll(/\b(chyba że|z wyjątkiem)\s+/giu)]
    if (!hits.length) continue
    if (hits.length > 1 || /chyba że|z wyjątkiem/iu.test(u.children.map((c) => c.fullText).join(' '))) {
      rejected.push({ unit: u, reason: 'kilka wyjątków w jednostce' })
      continue
    }
    const h = hits[0]
    const marker = h[1].toLocaleLowerCase('pl') as Clause['marker']
    const after = u.text.slice(h.index! + h[0].length)
    const raw = after.split(marker === 'chyba że' ? CLAUSE_END : CLAUSE_END_COMMA)[0]
    const clause = trimItem(raw)
    if (hasArtifacts(u.text)) rejected.push({ unit: u, reason: 'artefakt importu' })
    else if (clause.includes(':')) rejected.push({ unit: u, reason: 'wyjątek z wyliczeniem' })
    else if (GENERIC.test(clause)) rejected.push({ unit: u, reason: 'ogólna klauzula „chyba że przepisy stanowią inaczej”' })
    else if (REF_ONLY.test(clause)) rejected.push({ unit: u, reason: 'wyjątek przez samo odesłanie' })
    else if (clause.split(' ').length < 3 || clause.length > 200) rejected.push({ unit: u, reason: 'wyjątek za krótki / za długi' })
    else clauses.push({ unit: u, marker, clause, index: h.index! })
  }
  return { clauses, rejected }
}

export function extractExceptions(corpus: Corpus): ExtractResult {
  const res = emptyResult()
  const { clauses, rejected } = findClauses(corpus)
  for (const r of rejected) res.rejected.push({ type: 'exception', reason: r.reason, articleId: r.unit.article.id, detail: r.unit.path })

  for (const c of clauses) {
    const aid = c.unit.article.id
    const ctxBase = focus(c.unit.text, c.index)
    const ctx = ctxBase && gap(ctxBase, c.clause)
    if (!ctx) {
      res.rejected.push({ type: 'exception', reason: 'zdanie za długie', articleId: aid, detail: c.unit.path })
      continue
    }
    const pool = shuffle(
      clauses.filter((o) => o !== c && o.marker === c.marker && o.unit.act.id === c.unit.act.id),
      aid + c.unit.path,
    ).sort((a, b) => Number(b.unit.article.chapter === c.unit.article.chapter) - Number(a.unit.article.chapter === c.unit.article.chapter))
    const picks: Clause[] = []
    for (const o of pool) {
      if (tooSimilar(o.clause, c.clause, 0.4)) continue
      if (picks.some((p) => tooSimilar(p.clause, o.clause, 0.4))) continue
      picks.push(o)
      if (picks.length === 3) break
    }
    if (picks.length < 3) {
      res.rejected.push({ type: 'exception', reason: 'za mało dystraktorów', articleId: aid, detail: c.unit.path })
      continue
    }
    const cite = Citation(c.unit)
    res.drafts.push({
      id: `exception:clause:${aid}:${c.unit.path}`,
      type: 'exception',
      variant: 'clause',
      format: 'single',
      difficulty: 2,
      actId: c.unit.act.id,
      articleId: aid,
      prompt: `Jakie zastrzeżenie („${c.marker} …”) zawiera ${cite.replace(/^Art/, 'art')}?`,
      context: quoteCtx(ctx),
      answer: `${c.marker} ${c.clause}`,
      hidden: [c.clause],
      sources: [sourceOf(c.unit)],
      options: [
        { text: c.clause, correct: true, present: [{ text: `${c.marker} ${c.clause}` }] },
        ...picks.map<DraftOption>((p) => ({
          text: p.clause,
          correct: false,
          note: `To zastrzeżenie z ${Citation(p.unit).replace(/^Art/, 'art')}.`,
          absent: [{ text: p.clause }],
        })),
      ],
    })
  }
  return res
}
