import type { ActBundle, Article, ArticleBlock } from '../types'
import type { AppData } from './data'

export type ActId = 'upea' | 'kpa' | 'ordynacja'
export const ACT_IDS: ActId[] = ['upea', 'kpa', 'ordynacja']

export function isActId(v: unknown): v is ActId {
  return ACT_IDS.includes(v as ActId)
}

/** One rozdział (or a dział without rozdziały). Also one Nauka stage. */
export type Chapter = {
  index: number
  actId: ActId
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

export type ActStructure = {
  id: ActId
  shortName: string
  title: string
  displayAddress: string
  isapUrl?: string
  articleCount: number
  articles: Article[]
  divisions: Division[]
  chapters: Chapter[]
  byNumber: Map<string, Article>
  chapterOf: Map<string, Chapter>
}

export type Library = {
  acts: Record<ActId, ActStructure>
  list: ActStructure[]
}

function splitHeading(raw: string | undefined, prefix: string) {
  if (!raw || raw === '-') return { no: null as string | null, title: '' }
  const m = raw.match(new RegExp(`^${prefix}\\s+([^\\s—–-]+)\\s*[—–-]\\s*(.+)$`))
  if (m) return { no: m[1], title: m[2].trim() }
  return { no: null, title: raw }
}

/** PDF line breaks inside one sentence arrive as separate text blocks. */
export function mergeTextRuns(blocks: ArticleBlock[]): ArticleBlock[] {
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

export function isRepealed(a: Article): boolean {
  return a.title === 'uchylony' || /^\(uchylony\)/.test(a.text.trim())
}

function buildAct(bundle: ActBundle, isapUrl?: string): ActStructure {
  const id = bundle.id as ActId
  const articles = bundle.articles
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
        actId: id,
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
    id,
    shortName: bundle.shortName,
    title: bundle.title,
    displayAddress: bundle.displayAddress,
    isapUrl,
    articleCount: articles.length,
    articles,
    divisions,
    chapters,
    byNumber: new Map(articles.map((a) => [a.number.toLowerCase(), a])),
    chapterOf,
  }
}

const cache = new WeakMap<AppData, Library>()

export function getLibrary(data: AppData): Library {
  const hit = cache.get(data)
  if (hit) return hit
  const acts = {} as Record<ActId, ActStructure>
  for (const meta of data.acts) {
    if (!isActId(meta.id) || !data.byAct[meta.id]) continue
    acts[meta.id] = buildAct(data.byAct[meta.id], meta.isapPdf ?? meta.source.url)
  }
  const lib = { acts, list: ACT_IDS.filter((id) => acts[id]).map((id) => acts[id]) }
  cache.set(data, lib)
  return lib
}

export function chapterLabel(ch: Chapter) {
  return ch.no ? `Rozdział ${ch.no}` : `Dział ${ch.divisionNo}`
}

export function articleRange(ch: Chapter) {
  const first = ch.articles[0]
  const last = ch.articles[ch.articles.length - 1]
  return first === last ? `art. ${first.number}` : `art. ${first.number}–${last.number}`
}

export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one
  const d = n % 10
  const t = n % 100
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many
}
