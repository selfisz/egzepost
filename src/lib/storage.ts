import type {
  AppPrefs,
  CardProgress,
  LearnModule,
  LearnSet,
  ReadEntry,
  UserProfile,
  UserStore,
  UserTag,
} from '../types'
import { SEED_MODULES } from '../data/learn-seeds'
import type { LearnState } from '../learn'
import { emptyLearnState, LEARN_STORAGE_KEY, parseLearnState, saveLearnState } from '../learn'

const KEY = 'egzepost:user:v1'
const MAX_RECENT_ARTICLES = 12
const MAX_RECENT_TAGS = 12

export const defaultPrefs: AppPrefs = { highlightLegal: false }

const emptyLearnSet = (): LearnSet => ({ stageIds: [], articleIds: [] })

const empty: UserStore = {
  version: 1,
  tags: [],
  progress: {},
  learnQueue: [],
  learnSet: emptyLearnSet(),
  recentArticleIds: [],
  pinnedTagIds: [],
  recentTagIds: [],
  learnModules: [],
  prefs: { ...defaultPrefs },
  profile: {},
  readLog: {},
}

function seedReadLogFromRecent(store: UserStore): Record<string, ReadEntry> {
  const existing = store.readLog ?? {}
  if (Object.keys(existing).length > 0) return existing
  const now = new Date().toISOString()
  const readLog: Record<string, ReadEntry> = {}
  for (const id of store.recentArticleIds ?? []) {
    readLog[id] = { firstAt: now, lastAt: now, opens: 1 }
  }
  return readLog
}

/** Merge legacy `learnQueue` into `learnSet.articleIds` and keep both in sync. */
export function getLearnSet(store: UserStore): LearnSet {
  const set = store.learnSet ?? emptyLearnSet()
  const articleIds = [...new Set([...set.articleIds, ...(store.learnQueue ?? [])])]
  const stageIds = [...new Set(set.stageIds)]
  return { stageIds, articleIds }
}

function withSyncedLearnSet(store: UserStore, set: LearnSet): UserStore {
  const stageIds = [...new Set(set.stageIds)]
  const articleIds = [...new Set(set.articleIds)]
  return {
    ...store,
    learnSet: { stageIds, articleIds },
    learnQueue: articleIds,
  }
}

function normalizeStore(parsed: UserStore): UserStore {
  const learnQueue = parsed.learnQueue ?? []
  const rawSet = parsed.learnSet ?? emptyLearnSet()
  const learnSet: LearnSet = {
    stageIds: [...new Set(rawSet.stageIds ?? [])],
    articleIds: [...new Set([...(rawSet.articleIds ?? []), ...learnQueue])],
  }
  const base: UserStore = {
    version: 1,
    tags: parsed.tags,
    progress: parsed.progress ?? {},
    learnQueue: learnSet.articleIds,
    learnSet,
    recentArticleIds: parsed.recentArticleIds ?? [],
    pinnedTagIds: parsed.pinnedTagIds ?? [],
    recentTagIds: parsed.recentTagIds ?? [],
    learnModules: parsed.learnModules ?? [],
    prefs: { ...defaultPrefs, ...parsed.prefs },
    profile: parsed.profile ?? {},
    readLog: parsed.readLog ?? {},
  }
  return { ...base, readLog: seedReadLogFromRecent(base) }
}

export function loadUserStore(): UserStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(empty)
    const parsed = JSON.parse(raw) as UserStore
    if (parsed?.version !== 1 || !Array.isArray(parsed.tags)) return structuredClone(empty)
    return normalizeStore(parsed)
  } catch {
    return structuredClone(empty)
  }
}

export function getPrefs(store: UserStore): AppPrefs {
  return { ...defaultPrefs, ...store.prefs }
}

export function setPrefs(store: UserStore, patch: Partial<AppPrefs>): UserStore {
  return { ...store, prefs: { ...getPrefs(store), ...patch } }
}

export function getProfile(store: UserStore): UserProfile {
  return { ...(store.profile ?? {}) }
}

export function setProfile(store: UserStore, patch: Partial<UserProfile>): UserStore {
  return { ...store, profile: { ...getProfile(store), ...patch } }
}

/** Seeds + user modules; user overrides seed with same id. */
export function resolveLearnModules(store: UserStore): LearnModule[] {
  const user = store.learnModules ?? []
  const byId = new Map<string, LearnModule>()
  for (const m of SEED_MODULES) byId.set(m.id, m)
  for (const m of user) byId.set(m.id, m)
  return [...byId.values()]
}

export function upsertLearnModule(store: UserStore, mod: LearnModule): UserStore {
  const list = [...(store.learnModules ?? [])]
  const idx = list.findIndex((m) => m.id === mod.id)
  if (idx >= 0) list[idx] = mod
  else list.push(mod)
  return { ...store, learnModules: list }
}

export function addArticleToModule(store: UserStore, moduleId: string, articleId: string): UserStore {
  const modules = resolveLearnModules(store)
  const mod = modules.find((m) => m.id === moduleId)
  if (!mod) return store
  if (mod.articleIds.includes(articleId)) return store
  const next: LearnModule = {
    ...mod,
    seeded: false,
    articleIds: [...mod.articleIds, articleId],
    updatedAt: new Date().toISOString(),
  }
  return upsertLearnModule(store, next)
}

export function moduleProgress(
  store: UserStore,
  articleIds: string[],
): { mastered: number; total: number; pct: number } {
  const total = articleIds.length
  let mastered = 0
  for (const id of articleIds) {
    const p = store.progress[id]
    if (p && (p.lastResult === 'easy' || p.repetitions >= 2)) mastered += 1
  }
  return { mastered, total, pct: total ? Math.round((mastered / total) * 100) : 0 }
}

export function saveUserStore(store: UserStore): void {
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function upsertTag(store: UserStore, tag: UserTag): UserStore {
  const idx = store.tags.findIndex((t) => t.id === tag.id)
  const tags = [...store.tags]
  if (idx >= 0) tags[idx] = tag
  else tags.push(tag)
  return { ...store, tags }
}

export function deleteTag(store: UserStore, id: string): UserStore {
  return {
    ...store,
    tags: store.tags.filter((t) => t.id !== id),
    pinnedTagIds: (store.pinnedTagIds ?? []).filter((x) => x !== id),
    recentTagIds: (store.recentTagIds ?? []).filter((x) => x !== id),
  }
}

export function setProgress(store: UserStore, progress: CardProgress): UserStore {
  return {
    ...store,
    progress: { ...store.progress, [progress.articleId]: progress },
  }
}

export function addToLearnQueue(store: UserStore, articleId: string): UserStore {
  return addArticleToLearnSet(store, articleId)
}

export function clearLearnQueueArticle(store: UserStore, articleId: string): UserStore {
  return removeArticleFromLearnSet(store, articleId)
}

export function addArticleToLearnSet(store: UserStore, articleId: string): UserStore {
  const set = getLearnSet(store)
  if (set.articleIds.includes(articleId)) return withSyncedLearnSet(store, set)
  return withSyncedLearnSet(store, { ...set, articleIds: [...set.articleIds, articleId] })
}

export function removeArticleFromLearnSet(store: UserStore, articleId: string): UserStore {
  const set = getLearnSet(store)
  return withSyncedLearnSet(store, { ...set, articleIds: set.articleIds.filter((id) => id !== articleId) })
}

export function addStageToLearnSet(store: UserStore, stageId: string): UserStore {
  const set = getLearnSet(store)
  if (set.stageIds.includes(stageId)) return withSyncedLearnSet(store, set)
  return withSyncedLearnSet(store, { ...set, stageIds: [...set.stageIds, stageId] })
}

export function removeStageFromLearnSet(store: UserStore, stageId: string): UserStore {
  const set = getLearnSet(store)
  return withSyncedLearnSet(store, { ...set, stageIds: set.stageIds.filter((id) => id !== stageId) })
}

export function toggleStageInLearnSet(store: UserStore, stageId: string): UserStore {
  const set = getLearnSet(store)
  return set.stageIds.includes(stageId) ? removeStageFromLearnSet(store, stageId) : addStageToLearnSet(store, stageId)
}

/** Add all articles linked to a tag into Mój zestaw. */
export function addTagArticlesToLearnSet(store: UserStore, tagId: string): UserStore {
  const tag = store.tags.find((t) => t.id === tagId)
  if (!tag) return store
  let next = store
  for (const id of tag.articleIds) next = addArticleToLearnSet(next, id)
  return next
}

export function learnSetSize(store: UserStore): number {
  const set = getLearnSet(store)
  return set.stageIds.length + set.articleIds.length
}

export function pushRecentArticle(store: UserStore, articleId: string): UserStore {
  const next = [articleId, ...(store.recentArticleIds ?? []).filter((id) => id !== articleId)]
  return markArticleRead({ ...store, recentArticleIds: next.slice(0, MAX_RECENT_ARTICLES) }, articleId)
}

/** Record a genuine article read (reader / chapter scroll / „zobacz przepis”). */
export function markArticleRead(store: UserStore, articleId: string, at = new Date().toISOString()): UserStore {
  const prev = store.readLog?.[articleId]
  const entry: ReadEntry = prev
    ? { firstAt: prev.firstAt, lastAt: at, opens: prev.opens + 1 }
    : { firstAt: at, lastAt: at, opens: 1 }
  return { ...store, readLog: { ...(store.readLog ?? {}), [articleId]: entry } }
}

export function pushRecentTag(store: UserStore, tagId: string): UserStore {
  const next = [tagId, ...(store.recentTagIds ?? []).filter((id) => id !== tagId)]
  return { ...store, recentTagIds: next.slice(0, MAX_RECENT_TAGS) }
}

export function togglePinnedTag(store: UserStore, tagId: string): UserStore {
  const pinned = store.pinnedTagIds ?? []
  const pinnedTagIds = pinned.includes(tagId)
    ? pinned.filter((id) => id !== tagId)
    : [...pinned, tagId]
  return { ...store, pinnedTagIds }
}

export function newTagId(): string {
  return `tag_${crypto.randomUUID().slice(0, 8)}`
}

export type ExportBundle = {
  version: 2
  exportedAt: string
  user: UserStore
  learn: LearnState
}

/** Combined export: user store + Nauka v4 progress (`regest:learn:v1`). */
export function exportStoreJson(store: UserStore, learn: LearnState = parseLearnState(localStorage.getItem(LEARN_STORAGE_KEY))): string {
  const bundle: ExportBundle = {
    version: 2,
    exportedAt: new Date().toISOString(),
    user: store,
    learn,
  }
  return JSON.stringify(bundle, null, 2)
}

export function importStoreJson(raw: string): { user: UserStore; learn: LearnState } {
  const parsed = JSON.parse(raw) as ExportBundle | UserStore
  if (parsed && typeof parsed === 'object' && 'version' in parsed && (parsed as ExportBundle).version === 2) {
    const b = parsed as ExportBundle
    if (!b.user || !Array.isArray(b.user.tags)) throw new Error('Nieprawidłowy plik bazy (brak user.tags)')
    return { user: normalizeStore(b.user), learn: b.learn?.version === 1 ? parseLearnState(JSON.stringify(b.learn)) : emptyLearnState() }
  }
  const legacy = parsed as UserStore
  if (legacy?.version !== 1 || !Array.isArray(legacy.tags)) {
    throw new Error('Nieprawidłowy plik bazy (oczekiwano version: 1 + tags lub version: 2)')
  }
  return { user: normalizeStore(legacy), learn: emptyLearnState() }
}

/** Apply an import: writes learn state to localStorage and returns the user store. */
export function applyImport(raw: string): UserStore {
  const { user, learn } = importStoreJson(raw)
  saveLearnState(learn)
  return user
}
