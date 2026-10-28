import type { ActBundle, ActMeta, Article, ArticleBlock, DataIndex } from '../types'

export type AppData = {
  index: DataIndex
  acts: ActMeta[]
  articles: Article[]
  byAct: Record<string, ActBundle>
  byId: Map<string, Article>
}

function ensureBlocks(a: Article): Article {
  if (a.blocks?.length) return a
  return { ...a, blocks: [{ type: 'text', text: a.text } satisfies ArticleBlock] }
}

export async function loadAppData(): Promise<AppData> {
  const indexRes = await fetch('/data/index.json')
  if (!indexRes.ok) {
    throw new Error('Brak indeksu aktów (/data/index.json). Uruchom: npm run import:acts')
  }
  const index = (await indexRes.json()) as DataIndex
  const byAct: Record<string, ActBundle> = {}
  const articles: Article[] = []

  for (const meta of index.acts) {
    const res = await fetch(`/data/${meta.id}.json`)
    if (!res.ok) throw new Error(`Brak pliku aktu: /data/${meta.id}.json`)
    const bundle = (await res.json()) as ActBundle
    bundle.articles = bundle.articles.map(ensureBlocks)
    byAct[meta.id] = bundle
    articles.push(...bundle.articles)
  }

  return {
    index,
    acts: index.acts,
    articles,
    byAct,
    byId: new Map(articles.map((a) => [a.id, a])),
  }
}

export function actShort(acts: ActMeta[], actId: string): string {
  return acts.find((a) => a.id === actId)?.shortName ?? actId
}

export function citation(article: Article, acts: ActMeta[], para?: string): string {
  const short = actShort(acts, article.actId)
  return para ? `${article.label.toLowerCase()} ${para} ${short}` : `${article.label.toLowerCase()} ${short}`
}
