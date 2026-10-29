import type { ActBundle, ActMeta, Article, ArticleBlock, DataIndex } from '../types'
import { mergeTextRuns } from './structure'

export type AppData = {
  index: DataIndex
  acts: ActMeta[]
  articles: Article[]
  byAct: Record<string, ActBundle>
  byId: Map<string, Article>
}

function ensureBlocks(a: Article): Article {
  if (a.blocks?.length) return { ...a, blocks: mergeTextRuns(a.blocks) }
  return { ...a, blocks: [{ type: 'text', text: a.text } satisfies ArticleBlock] }
}

/** Respect Vite `base` (e.g. `/egzepost/` on GitHub Pages). */
const dataBase = `${import.meta.env.BASE_URL.replace(/\/?$/, '/') }data/`

export async function loadAppData(): Promise<AppData> {
  const indexRes = await fetch(`${dataBase}index.json`)
  if (!indexRes.ok) {
    throw new Error(`Brak indeksu aktów (${dataBase}index.json). Uruchom: npm run import:acts`)
  }
  const index = (await indexRes.json()) as DataIndex
  const byAct: Record<string, ActBundle> = {}
  const articles: Article[] = []

  for (const meta of index.acts) {
    const res = await fetch(`${dataBase}${meta.id}.json`)
    if (!res.ok) throw new Error(`Brak pliku aktu: ${dataBase}${meta.id}.json`)
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

/** TOC / list heading: `Art. 1 · Zakres regulacji` when Legalis title exists. */
export function articleHeading(article: Article): string {
  return article.title ? `${article.label} · ${article.title}` : article.label
}

export function citation(article: Article, acts: ActMeta[], para?: string): string {
  const short = actShort(acts, article.actId)
  return para ? `${article.label.toLowerCase()} ${para} ${short}` : `${article.label.toLowerCase()} ${short}`
}
