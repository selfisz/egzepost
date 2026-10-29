export type ArticleBlock =
  | { type: 'text'; text: string }
  | { type: 'para'; marker: string; text: string; children?: ArticleBlock[] }
  | { type: 'point'; marker: string; text: string; children?: ArticleBlock[] }
  | { type: 'letter'; marker: string; text: string }

export type Article = {
  id: string
  actId: string
  number: string
  label: string
  /**
   * Editorial short title from Legalis (`Art. N [Tytuł]`).
   * Navigation aid only — not official ISAP text.
   */
  title?: string
  text: string
  excerpt: string
  blocks: ArticleBlock[]
  chapter?: string
  section?: string
}

export type ActSource = {
  kind: 'isap-pdf' | 'eli-html' | 'eli-pdf' | 'local-html' | 'local-txt'
  eli?: string
  url?: string
  fetchedAt: string
  note: string
}

export type ActBundle = {
  id: string
  shortName: string
  title: string
  displayAddress: string
  source: ActSource
  articleCount: number
  articles: Article[]
}

export type ActMeta = {
  id: string
  shortName: string
  title: string
  displayAddress: string
  articleCount: number
  source: ActSource
  isapPdf?: string
}

export type DataIndex = {
  generatedAt: string
  acts: ActMeta[]
}

export type TagCategory =
  | 'Zajęcia'
  | 'Koszty'
  | 'Terminy'
  | 'Doręczenia'
  | 'Zarzuty'
  | 'Inne'

export type UserTag = {
  id: string
  label: string
  aliases: string[]
  articleIds: string[]
  note?: string
  category?: TagCategory
  createdAt: string
  updatedAt: string
}

export type CardProgress = {
  articleId: string
  ease: number
  intervalDays: number
  repetitions: number
  dueAt: string
  lastResult?: 'again' | 'hard' | 'good' | 'easy'
}

export type LearnModule = {
  id: string
  name: string
  purpose: string
  actId?: 'upea' | 'kpa' | 'ordynacja' | 'both'
  articleIds: string[]
  seeded?: boolean
  createdAt: string
  updatedAt?: string
}

export type AppPrefs = {
  /** Default legal syntax highlight in Reader (off = calm) */
  highlightLegal: boolean
}

/**
 * Personal learning set („Mój zestaw”): chapters from any act + individual articles
 * (e.g. from „Do nauki”). Sessions from the set never silently pull outside this scope.
 */
export type LearnSet = {
  /** Stage ids (`Stage.id` from the question bank). */
  stageIds: string[]
  /** Article ids (`actId:number`). */
  articleIds: string[]
}

/** First-visit name + greeting; editable in Moje. */
export type UserProfile = {
  /** Display name used in „Dzień dobry, {imię}.” */
  name?: string
  /** True once the first-visit prompt was answered or skipped. */
  greeted?: boolean
}

/** Per-article reading history for Statystyki „przeczytane”. */
export type ReadEntry = {
  firstAt: string
  lastAt: string
  opens: number
}

export type UserStore = {
  version: 1
  tags: UserTag[]
  progress: Record<string, CardProgress>
  /**
   * Legacy pin-queue for „Do nauki”. Kept in sync with `learnSet.articleIds`
   * so older code and exports stay compatible.
   */
  learnQueue: string[]
  /** Personal learning set — chapters + articles across acts. */
  learnSet?: LearnSet
  /** Recently opened article ids (newest first) */
  recentArticleIds?: string[]
  /** Pinned tag ids for empty-search home */
  pinnedTagIds?: string[]
  /** Recently used tag ids (newest first) */
  recentTagIds?: string[]
  /** User-created / customized learn modules (seeds merged at runtime) */
  learnModules?: LearnModule[]
  prefs?: AppPrefs
  profile?: UserProfile
  /** articleId → read history (search / xref popovers do not write here) */
  readLog?: Record<string, ReadEntry>
}
