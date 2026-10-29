import type { Article } from '../types'

export type TocChapter = {
  id: string
  label: string
  sections: TocSection[]
  /** Articles directly under dział with no rozdział */
  articles: Article[]
}

export type TocSection = {
  id: string
  label: string
  articles: Article[]
}

export function buildToc(articles: Article[]): TocChapter[] {
  const chapters = new Map<string, TocChapter>()
  const order: string[] = []

  for (const a of articles) {
    const chLabel = a.chapter?.trim() || 'Bez działu'
    const secLabel = a.section?.trim()

    if (!chapters.has(chLabel)) {
      chapters.set(chLabel, { id: chLabel, label: chLabel, sections: [], articles: [] })
      order.push(chLabel)
    }
    const ch = chapters.get(chLabel)!

    if (!secLabel) {
      ch.articles.push(a)
      continue
    }
    let sec = ch.sections.find((s) => s.label === secLabel)
    if (!sec) {
      sec = { id: `${chLabel}::${secLabel}`, label: secLabel, articles: [] }
      ch.sections.push(sec)
    }
    sec.articles.push(a)
  }

  return order.map((id) => chapters.get(id)!)
}

export function articlesInSection(articles: Article[], sectionLabel: string | undefined, chapterLabel: string | undefined): Article[] {
  return articles.filter(
    (a) =>
      (chapterLabel ? a.chapter === chapterLabel : true) &&
      (sectionLabel ? a.section === sectionLabel : !a.section),
  )
}

export function siblingArticles(articles: Article[], current: Article): { prev: Article | null; next: Article | null } {
  const idx = articles.findIndex((a) => a.id === current.id)
  if (idx < 0) return { prev: null, next: null }
  return {
    prev: idx > 0 ? articles[idx - 1] : null,
    next: idx < articles.length - 1 ? articles[idx + 1] : null,
  }
}

export function chapterPeers(articles: Article[], current: Article): Article[] {
  if (current.section) {
    return articles.filter((a) => a.section === current.section && a.chapter === current.chapter)
  }
  if (current.chapter) {
    return articles.filter((a) => a.chapter === current.chapter && !a.section)
  }
  return [current]
}
