import type { CardProgress, UserStore, UserTag } from '../types'

const KEY = 'egzepost:user:v1'

const empty: UserStore = { version: 1, tags: [], progress: {}, learnQueue: [] }

export function loadUserStore(): UserStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(empty)
    const parsed = JSON.parse(raw) as UserStore
    if (parsed?.version !== 1 || !Array.isArray(parsed.tags)) return structuredClone(empty)
    return {
      version: 1,
      tags: parsed.tags,
      progress: parsed.progress ?? {},
      learnQueue: parsed.learnQueue ?? [],
    }
  } catch {
    return structuredClone(empty)
  }
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
  return { ...store, tags: store.tags.filter((t) => t.id !== id) }
}

export function setProgress(store: UserStore, progress: CardProgress): UserStore {
  return {
    ...store,
    progress: { ...store.progress, [progress.articleId]: progress },
  }
}

export function addToLearnQueue(store: UserStore, articleId: string): UserStore {
  if (store.learnQueue.includes(articleId)) return store
  return { ...store, learnQueue: [...store.learnQueue, articleId] }
}

export function newTagId(): string {
  return `tag_${crypto.randomUUID().slice(0, 8)}`
}

export function exportStoreJson(store: UserStore): string {
  return JSON.stringify(store, null, 2)
}

export function importStoreJson(raw: string): UserStore {
  const parsed = JSON.parse(raw) as UserStore
  if (parsed?.version !== 1 || !Array.isArray(parsed.tags)) {
    throw new Error('Nieprawidłowy plik bazy (oczekiwano version: 1 + tags)')
  }
  return {
    version: 1,
    tags: parsed.tags,
    progress: parsed.progress ?? {},
    learnQueue: parsed.learnQueue ?? [],
  }
}
