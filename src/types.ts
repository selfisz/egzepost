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

export type Profile = {
  /** First name for greetings on Start. Empty until the first-visit prompt. */
  name?: string
  /** True once the name prompt has been shown (even if skipped). */
  namePromptSeen?: boolean
}

/** Reading history for Statystyki — article was shown on screen at least once. */
export type ReadEntry = {
  firstAt: string
  lastAt: string
  opens: number
}

export type UserStore = {
  version: 1
  tags: UserTag[]
  progress: Record<string, CardProgress>
  learnQueue: string[]
  /** Recently opened article ids (newest first) */
  recentArticleIds?: string[]
  /** Pinned tag ids for empty-search home */
  pinnedTagIds?: string[]
  /** Recently used tag ids (newest first) */
  recentTagIds?: string[]
  /** User-created / customized learn modules (seeds merged at runtime) */
  learnModules?: LearnModule[]
  prefs?: AppPrefs
  profile?: Profile
  /** articleId → reading log (Statystyki „przeczytane”) */
  readLog?: Record<string, ReadEntry>
}
