import type { ActBundle, Article, ArticleBlock } from '../types'

export type ActId = 'upea' | 'kpa' | 'ordynacja'
export const ACT_IDS: ActId[] = ['upea', 'kpa', 'ordynacja']

export type Chapter = {
  index: number
  divisionNo: string
  divisionTitle: string
  no: string | null
  title: string
  articles: Article[]
}

export type Division = {
  no: string
  title: string
  chapters: Chapter[]
  articleCount: number
}

export type Act = {
  id: ActId
  shortName: string
  title: string
  displayAddress: string
  articleCount: number
  articles: Article[]
  divisions: Division[]
  chapters: Chapter[]
  byNumber: Map<string, Article>
  chapterOf: Map<string, Chapter>
}

export type MockData = {
  acts: Record<ActId, Act>
  byId: Map<string, Article>
}

function splitHeading(raw: string | undefined, prefix: string) {
  if (!raw || raw === '-') return { no: null as string | null, title: '' }
  const m = raw.match(new RegExp(`^${prefix}\\s+([^\\s—–-]+)\\s*[—–-]\\s*(.+)$`))
  if (m) return { no: m[1], title: m[2].trim() }
  return { no: null, title: raw }
}

/** PDF line breaks inside one sentence arrive as separate text blocks. */
function mergeTextRuns(blocks: ArticleBlock[]): ArticleBlock[] {
  const out: ArticleBlock[] = []
  for (const b of blocks) {
    const prev = out[out.length - 1]
    if (b.type === 'text' && prev?.type === 'text' && !/[.:;]$/.test(prev.text.trim())) {
      out[out.length - 1] = { type: 'text', text: `${prev.text} ${b.text}` }
    } else {
      out.push(b)
    }
  }
  return out
}

function buildAct(bundle: ActBundle): Act {
  const articles = bundle.articles.map((a) => ({
    ...a,
    blocks: mergeTextRuns(a.blocks?.length ? a.blocks : [{ type: 'text', text: a.text }]),
  }))
  const divisions: Division[] = []
  const chapters: Chapter[] = []
  const chapterOf = new Map<string, Chapter>()
  let curDiv: Division | undefined
  let curCh: Chapter | undefined
  let lastDivRaw = ''
  let lastChRaw = ''
  for (const a of articles) {
    const divRaw = a.chapter ?? '-'
    const chRaw = a.section ?? '-'
    if (!curDiv || divRaw !== lastDivRaw) {
      const d = splitHeading(divRaw, 'Dział')
      curDiv = { no: d.no ?? '', title: d.title, chapters: [], articleCount: 0 }
      divisions.push(curDiv)
      lastDivRaw = divRaw
      lastChRaw = ''
      curCh = undefined
    }
    if (!curCh || chRaw !== lastChRaw) {
      const c = splitHeading(chRaw, 'Rozdział')
      curCh = {
        index: chapters.length,
        divisionNo: curDiv.no,
        divisionTitle: curDiv.title,
        no: c.no,
        title: c.no ? c.title : curDiv.title,
        articles: [],
      }
      chapters.push(curCh)
      curDiv.chapters.push(curCh)
      lastChRaw = chRaw
    }
    curCh.articles.push(a)
    curDiv.articleCount++
    chapterOf.set(a.id, curCh)
  }
  return {
    id: bundle.id as ActId,
    shortName: bundle.shortName,
    title: bundle.title,
    displayAddress: bundle.displayAddress,
    articleCount: articles.length,
    articles,
    divisions,
    chapters,
    byNumber: new Map(articles.map((a) => [a.number.toLowerCase(), a])),
    chapterOf,
  }
}

let cache: Promise<MockData> | undefined

export function loadMockData(): Promise<MockData> {
  cache ??= (async () => {
    const base = import.meta.env.BASE_URL
    const bundles = await Promise.all(
      ACT_IDS.map(async (id) => {
        const res = await fetch(`${base}data/${id}.json`)
        if (!res.ok) throw new Error(`Brak pliku aktu: data/${id}.json`)
        return (await res.json()) as ActBundle
      }),
    )
    const acts = {} as Record<ActId, Act>
    const byId = new Map<string, Article>()
    for (const b of bundles) {
      const act = buildAct(b)
      acts[act.id] = act
      for (const a of act.articles) byId.set(a.id, a)
    }
    return { acts, byId }
  })()
  return cache
}

export function chapterLabel(ch: Chapter) {
  return ch.no ? `Rozdział ${ch.no}` : `Dział ${ch.divisionNo}`
}

export function articleRange(ch: Chapter) {
  const first = ch.articles[0]
  const last = ch.articles[ch.articles.length - 1]
  return first === last ? `art. ${first.number}` : `art. ${first.number}–${last.number}`
}
