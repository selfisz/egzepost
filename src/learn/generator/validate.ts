import type { Draft, Rejection } from './draft'
import type { Corpus } from './units'
import { GAP, clean, contains, hasArtifacts, norm, similarity } from '../text'

/** QA rules from the spec (§5). */
export type Rule =
  | 'struktura'
  | 'podstawa prawna'
  | 'zgodność z tekstem'
  | 'jednoznaczność'
  | 'duplikat'
  | 'liczba odpowiedzi'
  | 'sensowność dydaktyczna'

export type Problem = { rule: Rule; detail: string }

const LIMITS = { prompt: 320, context: 720, option: 300, answer: 1200 }

function checkStructure(d: Draft, out: Problem[]) {
  if (!d.id || !d.type || !d.variant) out.push({ rule: 'struktura', detail: 'brak id / typu / wariantu' })
  if (!clean(d.prompt)) out.push({ rule: 'struktura', detail: 'puste pytanie' })
  if (!clean(d.answer)) out.push({ rule: 'struktura', detail: 'pusta odpowiedź' })
  if (![1, 2, 3].includes(d.difficulty)) out.push({ rule: 'struktura', detail: 'zły poziom trudności' })
  if (!d.sources.length) out.push({ rule: 'podstawa prawna', detail: 'brak podstawy prawnej' })
  if (d.sources[0] && d.sources[0].articleId !== d.articleId) out.push({ rule: 'struktura', detail: 'articleId ≠ podstawa główna' })
}

function checkCount(d: Draft, out: Problem[]) {
  const opts = d.options ?? []
  const correct = opts.filter((o) => o.correct).length
  if (d.format === 'flashcard') {
    if (opts.length) out.push({ rule: 'liczba odpowiedzi', detail: 'fiszka z opcjami' })
    return
  }
  if (d.format === 'single') {
    if (opts.length < 2 || opts.length > 5) out.push({ rule: 'liczba odpowiedzi', detail: `jednokrotny wybór: ${opts.length} opcji` })
    if (correct !== 1) out.push({ rule: 'liczba odpowiedzi', detail: `jednokrotny wybór: ${correct} poprawnych` })
    if (opts.length === 2 && d.type !== 'duty-right') out.push({ rule: 'liczba odpowiedzi', detail: '2 opcje dopuszczalne tylko dla obowiązek/uprawnienie' })
  }
  if (d.format === 'multiple') {
    if (opts.length < 4 || opts.length > 6) out.push({ rule: 'liczba odpowiedzi', detail: `wielokrotny wybór: ${opts.length} opcji` })
    if (correct < 2 || correct === opts.length) out.push({ rule: 'liczba odpowiedzi', detail: `wielokrotny wybór: ${correct}/${opts.length} poprawnych` })
  }
}

function checkSources(d: Draft, corpus: Corpus, out: Problem[]) {
  for (const s of d.sources) {
    const art = corpus.articleById.get(s.articleId)
    if (!art) {
      out.push({ rule: 'podstawa prawna', detail: `brak artykułu ${s.articleId}` })
      continue
    }
    const units = (corpus.unitsByArticle.get(s.articleId) ?? []).filter((u) => u.path === s.unit)
    if (!units.length) out.push({ rule: 'podstawa prawna', detail: `brak jednostki ${s.citation}` })
    else if (!units.some((u) => norm(u.fullText) === norm(s.quote))) out.push({ rule: 'podstawa prawna', detail: `cytat ≠ tekst ${s.citation}` })
    if (/^\(?(uchylon|pominięt)/iu.test(s.quote)) out.push({ rule: 'podstawa prawna', detail: 'przepis uchylony' })
  }
}

function inSource(d: Draft, text: string, source?: number): boolean {
  const list = source === undefined ? d.sources : [d.sources[source]].filter(Boolean)
  return list.some((s) => contains(s.quote, text))
}

function checkEvidence(d: Draft, corpus: Corpus, out: Problem[]) {
  if (d.type === 'order') return checkOrder(d, out)
  for (const o of d.options ?? []) {
    const backedTrue = Boolean(o.present?.length)
    const backedFalse = Boolean(o.absent?.length)
    const shouldBeTrue = d.negated ? !o.correct : o.correct
    if (shouldBeTrue && !backedTrue) out.push({ rule: 'zgodność z tekstem', detail: `opcja bez podstawy w tekście: ${o.text}` })
    if (!shouldBeTrue && !backedFalse) out.push({ rule: 'zgodność z tekstem', detail: `dystraktor bez dowodu błędności: ${o.text}` })
    for (const c of o.present ?? []) {
      if (!inSource(d, c.text, c.source)) out.push({ rule: 'zgodność z tekstem', detail: `nie ma w źródle: „${c.text}”` })
    }
    for (const c of o.absent ?? []) {
      if (o.absentInArticle) {
        const a = corpus.articleById.get(o.absentInArticle)
        if (!a) out.push({ rule: 'podstawa prawna', detail: `brak artykułu ${o.absentInArticle}` })
        else if (contains(a.text, c.text)) out.push({ rule: 'zgodność z tekstem', detail: `dystraktor ${a.label} też zawiera ten tekst` })
      } else if (inSource(d, c.text, c.source ?? 0)) {
        out.push({ rule: 'zgodność z tekstem', detail: `dystraktor występuje w przepisie: „${c.text}”` })
      }
    }
  }
  if (d.format === 'flashcard' && d.type !== 'comparison') {
    const lines = d.answer.split('\n').map((l) => l.replace(/^\d+\)\s*/, ''))
    for (const l of lines) if (!inSource(d, l)) out.push({ rule: 'zgodność z tekstem', detail: `odpowiedź spoza cytatu: ${l}` })
  }
}

function checkOrder(d: Draft, out: Problem[]) {
  const o = d.order
  if (!o) return out.push({ rule: 'struktura', detail: 'pytanie o kolejność bez relacji' })
  for (const r of o.relations) {
    if (!inSource(d, r.text, r.source)) out.push({ rule: 'zgodność z tekstem', detail: `relacja kolejności bez podstawy: „${r.text}”` })
  }
  const canonical = o.render(o.canonical.map((_, i) => i))
  const correct = (d.options ?? []).filter((x) => x.correct)
  if (correct.length !== 1 || correct[0].text !== canonical) out.push({ rule: 'zgodność z tekstem', detail: 'poprawna opcja ≠ kolejność z przepisów' })
}

function checkAmbiguity(d: Draft, out: Problem[]) {
  const shown = `${d.prompt}\n${d.context ?? ''}`
  for (const h of d.hidden ?? []) {
    if (contains(shown, h)) out.push({ rule: 'jednoznaczność', detail: `pytanie zdradza odpowiedź: „${h}”` })
  }
  const opts = d.options ?? []
  for (let i = 0; i < opts.length; i++) {
    for (let j = i + 1; j < opts.length; j++) {
      const a = norm(opts[i].text)
      const b = norm(opts[j].text)
      if (a === b) out.push({ rule: 'jednoznaczność', detail: `powtórzona opcja: ${opts[i].text}` })
      else if (
        d.type !== 'which-article' && d.type !== 'order' && d.type !== 'comparison' &&
        Math.min(a.split(' ').length, b.split(' ').length) >= 3 && similarity(a, b) >= 0.85
      )
        out.push({ rule: 'jednoznaczność', detail: `prawie identyczne opcje: ${opts[i].text} / ${opts[j].text}` })
    }
  }
  if (d.context && d.context.split(GAP).length > 2)
    out.push({ rule: 'jednoznaczność', detail: 'kilka luk w kontekście' })
}

function checkDidactic(d: Draft, out: Problem[]) {
  if (d.prompt.length > LIMITS.prompt) out.push({ rule: 'sensowność dydaktyczna', detail: 'pytanie za długie' })
  if ((d.context ?? '').length > LIMITS.context) out.push({ rule: 'sensowność dydaktyczna', detail: 'kontekst za długi' })
  if (d.answer.length > LIMITS.answer) out.push({ rule: 'sensowność dydaktyczna', detail: 'odpowiedź za długa' })
  for (const o of d.options ?? []) {
    if (o.text.length > LIMITS.option) out.push({ rule: 'sensowność dydaktyczna', detail: 'opcja za długa' })
    if (hasArtifacts(o.text)) out.push({ rule: 'sensowność dydaktyczna', detail: `opcja z artefaktem importu: ${o.text}` })
  }
  if (d.context && hasArtifacts(d.context.replace(/[„”]/g, ''))) out.push({ rule: 'sensowność dydaktyczna', detail: 'kontekst z artefaktem importu' })
}

export function validateDraft(d: Draft, corpus: Corpus): Problem[] {
  const out: Problem[] = []
  checkStructure(d, out)
  checkCount(d, out)
  checkSources(d, corpus, out)
  checkEvidence(d, corpus, out)
  checkAmbiguity(d, out)
  checkDidactic(d, out)
  return out
}

function fingerprint(d: Draft): string {
  const correct = (d.options ?? []).filter((o) => o.correct).map((o) => norm(o.text)).sort()
  return [d.type, norm(d.prompt), norm(d.context ?? ''), ...correct].join('|')
}

/** Validate all drafts; drops failing ones and corpus-wide duplicates (first wins). */
export function validateAll(drafts: Draft[], corpus: Corpus): { valid: Draft[]; rejected: (Rejection & { problems: Problem[] })[] } {
  const valid: Draft[] = []
  const rejected: (Rejection & { problems: Problem[] })[] = []
  const ids = new Set<string>()
  const prints = new Set<string>()
  for (const d of drafts) {
    const problems = validateDraft(d, corpus)
    if (ids.has(d.id)) problems.push({ rule: 'duplikat', detail: `powtórzone id ${d.id}` })
    const fp = fingerprint(d)
    if (prints.has(fp)) problems.push({ rule: 'duplikat', detail: 'identyczne pytanie już istnieje' })
    if (problems.length) {
      rejected.push({ type: d.type, reason: `walidacja: ${problems[0].rule}`, articleId: d.articleId, detail: problems.map((p) => p.detail).join('; '), problems })
      continue
    }
    ids.add(d.id)
    prints.add(fp)
    valid.push(d)
  }
  return { valid, rejected }
}
