import type { Article, UserTag } from '../types'

export type ActFilter = 'all' | 'upea' | 'kpa' | 'ordynacja' | 'tags'

export type SearchHit = {
  kind: 'article' | 'tag'
  score: number
  article: Article
  matchedVia: string
  tag?: UserTag
  query: string
}

function fold(s: string): string {
  return s
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function tokens(q: string): string[] {
  return fold(q)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2)
}

/** Strict search: only imported article text + user tags. */
export function searchArticles(
  query: string,
  articles: Article[],
  tags: UserTag[],
  actFilter: ActFilter,
): SearchHit[] {
  const q = query.trim()
  if (!q) return []

  const qFold = fold(q)
  const toks = tokens(q)
  const byId = new Map(articles.map((a) => [a.id, a]))
  const hits = new Map<string, SearchHit>()

  const allowed = (article: Article) => {
    if (actFilter === 'all' || actFilter === 'tags') return true
    return article.actId === actFilter
  }

  const consider = (
    article: Article,
    score: number,
    matchedVia: string,
    tag?: UserTag,
  ) => {
    if (!allowed(article)) return
    if (actFilter === 'tags' && !tag) return
    const prev = hits.get(article.id)
    if (!prev || score > prev.score) {
      hits.set(article.id, {
        kind: tag ? 'tag' : 'article',
        score,
        article,
        matchedVia,
        tag,
        query: q,
      })
    }
  }

  // Tag matches — highest priority
  for (const tag of tags) {
    const label = fold(tag.label)
    const aliases = tag.aliases.map(fold)
    const note = tag.note ? fold(tag.note) : ''
    const hay = [label, ...aliases, note].join(' ')
    let score = 0
    if (label === qFold || aliases.includes(qFold)) score = 120
    else if (hay.includes(qFold)) score = 100
    else if (toks.length && toks.every((t) => hay.includes(t))) score = 85
    else if (toks.some((t) => hay.includes(t))) score = 70
    if (score === 0) continue
    for (const aid of tag.articleIds) {
      const art = byId.get(aid)
      if (art) consider(art, score, `tag: ${tag.label}`, tag)
    }
  }

  if (actFilter === 'tags') {
    return [...hits.values()].sort((a, b) => b.score - a.score)
  }

  const artNum = qFold.match(/^(?:art\.?\s*)?(\d+[a-z]?)$/)
  if (artNum) {
    for (const a of articles) {
      if (fold(a.number) === artNum[1]) consider(a, 95, 'numer artykułu')
    }
  }

  for (const a of articles) {
    const hay = fold([a.label, a.chapter ?? '', a.section ?? '', a.text].join('\n'))
    let score = 0
    if (hay.includes(qFold) && qFold.length >= 3) score = 50
    else if (toks.length >= 2 && toks.every((t) => hay.includes(t))) score = 45
    else if (toks.filter((t) => hay.includes(t)).length >= Math.ceil(toks.length * 0.6)) {
      score = 30 + toks.filter((t) => hay.includes(t)).length
    } else if (toks.some((t) => t.length >= 4 && hay.includes(t))) {
      score = 20
    }
    if (score > 0) consider(a, score, 'tekst ustawy')
  }

  return [...hits.values()].sort(
    (a, b) =>
      b.score - a.score ||
      a.article.number.localeCompare(b.article.number, 'pl', { numeric: true }),
  )
}
