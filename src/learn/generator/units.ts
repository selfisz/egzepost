import type { ActBundle, Article, ArticleBlock } from '../../types'
import type { SourceRef } from '../model'
import { clean, isRepealed } from '../text'

export type ActInfo = { id: string; shortName: string; order: number }

/** One editorial unit (art. / § / ust. / pkt / lit.) with its resolved path. */
export type Unit = {
  act: ActInfo
  article: Article
  /** `§ 2 pkt 3 lit. a`; '' for a top-level text block. */
  path: string
  kind: ArticleBlock['type']
  /** Own text of the unit, whitespace-normalized. */
  text: string
  /** Own text + all descendants, newline-joined. */
  fullText: string
  children: Unit[]
  parent?: Unit
}

export type Corpus = {
  acts: ActInfo[]
  articles: Article[]
  articleById: Map<string, Article>
  /** Units per article, depth-first in document order. */
  unitsByArticle: Map<string, Unit[]>
  units: Unit[]
}

function markerPath(block: ArticleBlock): string {
  if (block.type === 'text') return ''
  const m = clean(block.marker)
  if (block.type === 'para') {
    const n = m.replace(/^§\s*/, '').replace(/^ust\.\s*/, '').replace(/\.$/, '')
    return m.startsWith('ust') ? `ust. ${n}` : `§ ${n}`
  }
  const n = m.replace(/[).]$/, '')
  return block.type === 'point' ? `pkt ${n}` : `lit. ${n}`
}

/** pdftotext splits unnumbered paragraphs into one `text` block per line — rejoin them. */
function mergeTextRuns(blocks: ArticleBlock[]): ArticleBlock[] {
  const out: ArticleBlock[] = []
  for (const b of blocks) {
    const prev = out[out.length - 1]
    if (b.type === 'text' && prev?.type === 'text') out[out.length - 1] = { type: 'text', text: `${prev.text} ${b.text}` }
    else out.push(b)
  }
  return out
}

function walk(act: ActInfo, article: Article, blocks: ArticleBlock[], prefix: string, parent: Unit | undefined, out: Unit[]): Unit[] {
  const level: Unit[] = []
  for (const b of mergeTextRuns(blocks)) {
    const own = markerPath(b)
    const path = [prefix, own].filter(Boolean).join(' ')
    const unit: Unit = { act, article, path, kind: b.type, text: clean(b.text), fullText: '', children: [], parent }
    out.push(unit)
    level.push(unit)
    if ('children' in b && b.children?.length) {
      unit.children = walk(act, article, b.children, path, unit, out)
    }
    unit.fullText = [unit.text, ...unit.children.map((c) => c.fullText)].join('\n')
  }
  return level
}

export function buildCorpus(bundles: ActBundle[]): Corpus {
  const acts: ActInfo[] = bundles.map((b, i) => ({ id: b.id, shortName: b.shortName, order: i }))
  const articles: Article[] = []
  const unitsByArticle = new Map<string, Unit[]>()
  const units: Unit[] = []
  bundles.forEach((b, i) => {
    for (const a of b.articles) {
      articles.push(a)
      const list: Unit[] = []
      walk(acts[i], a, a.blocks?.length ? a.blocks : [{ type: 'text', text: a.text }], '', undefined, list)
      unitsByArticle.set(a.id, list)
      units.push(...list)
    }
  })
  return { acts, articles, articleById: new Map(articles.map((a) => [a.id, a])), unitsByArticle, units }
}

export function isLiveArticle(a: Article): boolean {
  return !isRepealed(a.text) && a.title !== 'uchylony'
}

export function citation(unit: Pick<Unit, 'act' | 'article' | 'path'>): string {
  return `art. ${unit.article.number}${unit.path ? ` ${unit.path}` : ''} ${unit.act.shortName}`
}

export function sourceOf(unit: Unit, quote = unit.fullText): SourceRef {
  return {
    actId: unit.act.id,
    articleId: unit.article.id,
    articleNumber: unit.article.number,
    unit: unit.path,
    citation: citation(unit),
    quote: clean(quote),
  }
}

export function findUnit(corpus: Corpus, articleId: string, path: string): Unit | undefined {
  return corpus.unitsByArticle.get(articleId)?.find((u) => u.path === path)
}

/** Capitalized citation for prompts: `Art. 33 § 2 u.p.e.a.` */
export function Citation(unit: Pick<Unit, 'act' | 'article' | 'path'>): string {
  const c = citation(unit)
  return c.charAt(0).toUpperCase() + c.slice(1)
}
