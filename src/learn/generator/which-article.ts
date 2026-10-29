import { emptyResult, type ExtractResult } from './draft'
import { quoteCtx, sentences } from './common'
import { isLiveArticle, sourceOf, type Corpus, type Unit } from './units'
import type { Article } from '../../types'
import { clean, hasArtifacts, norm, shuffle } from '../text'

const WEAK_TITLES = /^(odesłanie|uchylony|rozwinięcie|pojęcie|upoważnienie)$/iu
const REFERRAL = /stosuje się odpowiednio|stosuje się przepisy|przepisy .{0,40} stosuje się/iu

export function articleOptionLabel(a: Article): string {
  return a.title ? `${a.label} · ${a.title}` : a.label
}

/** First self-contained sentence of the article that does not occur in any other article of the act. */
function probe(corpus: Corpus, a: Article, peersText: string[]): { unit: Unit; text: string } | null {
  for (const u of corpus.unitsByArticle.get(a.id) ?? []) {
    if (u.text.endsWith(':') || hasArtifacts(u.text)) continue
    const body = u.text.replace(/^§\s*\d+\w*\.\s*/, '')
    for (const s of sentences(body)) {
      const t = clean(body.slice(s.start, s.end))
      if (t.length < 60 || t.length > 280 || REFERRAL.test(t)) continue
      const n = norm(t)
      if (peersText.some((p) => p.includes(n))) continue
      return { unit: u, text: t }
    }
  }
  return null
}

export function extractWhichArticle(corpus: Corpus, stageOf: (a: Article) => string): ExtractResult {
  const res = emptyResult()
  const byStage = new Map<string, Article[]>()
  for (const a of corpus.articles) {
    if (!isLiveArticle(a)) continue
    const k = stageOf(a)
    byStage.set(k, [...(byStage.get(k) ?? []), a])
  }
  const actText = new Map<string, Map<string, string>>()
  for (const a of corpus.articles) {
    if (!actText.has(a.actId)) actText.set(a.actId, new Map())
    actText.get(a.actId)!.set(a.id, norm(a.text))
  }

  for (const [stageId, list] of byStage) {
    for (const a of list) {
      if (a.title && WEAK_TITLES.test(a.title)) {
        res.rejected.push({ type: 'which-article', reason: 'artykuł odsyłający / bez treści merytorycznej', articleId: a.id })
        continue
      }
      let peers = list.filter((x) => x.id !== a.id && !(x.title && WEAK_TITLES.test(x.title)))
      if (peers.length < 3) {
        res.rejected.push({ type: 'which-article', reason: 'rozdział ma < 4 artykuły', articleId: a.id, detail: stageId })
        continue
      }
      const others = [...actText.get(a.actId)!].filter(([id]) => id !== a.id).map(([, t]) => t)
      const p = probe(corpus, a, others)
      if (!p) {
        res.rejected.push({ type: 'which-article', reason: 'brak jednoznacznego zdania', articleId: a.id })
        continue
      }
      const labels = new Set([articleOptionLabel(a)])
      peers = shuffle(peers, a.id).filter((x) => {
        const l = articleOptionLabel(x)
        if (labels.has(l)) return false
        labels.add(l)
        return true
      })
      const picks = peers.slice(0, 3)
      const ctx = p.unit.path.startsWith('§') ? `${p.unit.path.split(' ').slice(0, 2).join(' ')}. ${p.text}` : p.text
      res.drafts.push({
        id: `which-article:${a.id}`,
        type: 'which-article',
        variant: 'probe',
        format: 'single',
        difficulty: 2,
        actId: a.actId,
        articleId: a.id,
        prompt: `Który artykuł ${p.unit.act.shortName} (${a.section ?? a.chapter}) zawiera ten przepis?`,
        context: quoteCtx(ctx),
        answer: articleOptionLabel(a),
        hidden: [a.label],
        sources: [sourceOf(p.unit)],
        options: [
          { text: articleOptionLabel(a), correct: true, present: [{ text: p.text }] },
          ...picks.map((x) => ({
            text: articleOptionLabel(x),
            correct: false,
            absent: [{ text: p.text }],
            absentInArticle: x.id,
          })),
        ],
      })
    }
  }
  return res
}
