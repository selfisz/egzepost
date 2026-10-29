import { BookmarkPlus, Copy, Plus, Quote } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { ActMeta, Article, UserStore, UserTag } from '../../types'
import { ArticleBody } from './ArticleBody'
import { ActBadge } from './CrossRefPopover'
import { citation } from '../../lib/data'
import { addToLearnQueue, newTagId, upsertTag } from '../../lib/storage'
import { useToast } from '../ui/Toast'
import { cn } from '../../lib/cn'

type Props = {
  article: Article
  acts: ActMeta[]
  tags: UserTag[]
  store: UserStore
  onStoreChange: (next: UserStore) => void
  query?: string
  highlightTag?: UserTag
  compact?: boolean
  className?: string
  onXref?: (actId: string, number: string) => void
}

export function ArticleCard({
  article,
  acts,
  tags,
  store,
  onStoreChange,
  query,
  highlightTag,
  compact,
  className,
  onXref,
}: Props) {
  const toast = useToast()
  const [tagOpen, setTagOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const linkedTags = tags.filter((t) => t.articleIds.includes(article.id))

  async function copy(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.push(msg)
    } catch {
      toast.push('Nie udało się skopiować')
    }
  }

  function handleXref(raw: string) {
    const art = raw.match(/art(?:ykuł|\.)?\s*(\d+[a-z]?)/i)
    if (!art) {
      toast.push('Odesłanie do § w tym artykule')
      return
    }
    onXref?.(article.actId, art[1])
  }

  function saveInlineTag(labelOverride?: string) {
    const label = (labelOverride ?? tagInput).trim()
    if (!label) return
    const existing = store.tags.find(
      (t) => t.label.toLocaleLowerCase('pl') === label.toLocaleLowerCase('pl'),
    )
    const now = new Date().toISOString()
    if (existing) {
      const articleIds = existing.articleIds.includes(article.id)
        ? existing.articleIds
        : [...existing.articleIds, article.id]
      onStoreChange(upsertTag(store, { ...existing, articleIds, updatedAt: now }))
    } else {
      onStoreChange(
        upsertTag(store, {
          id: newTagId(),
          label,
          aliases: [],
          articleIds: [article.id],
          createdAt: now,
          updatedAt: now,
        }),
      )
    }
    setTagInput('')
    setTagOpen(false)
    toast.push(`Tag „${label}” przypisany`)
  }

  const suggestions = tagInput.trim()
    ? store.tags
        .filter((t) =>
          t.label.toLocaleLowerCase('pl').includes(tagInput.toLocaleLowerCase('pl')),
        )
        .slice(0, 6)
    : store.tags.slice(0, 6)

  return (
    <article
      data-article-id={article.id}
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900',
        className,
      )}
    >
      {highlightTag && (
        <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200">
          Trafienie po tagu: <strong>{highlightTag.label}</strong>
          {highlightTag.note ? ` — ${highlightTag.note}` : ''}
        </div>
      )}

      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ActBadge actId={article.actId} acts={acts} />
            <h2 className="font-mono text-xl font-bold tracking-tight">{article.label}</h2>
          </div>
          {article.title && (
            <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">{article.title}</p>
          )}
          {(article.chapter || linkedTags.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {linkedTags.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  #{t.label}
                </span>
              ))}
              {article.chapter && (
                <span className="text-xs text-slate-500 dark:text-zinc-500">{article.chapter}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          <IconBtn title="Kopiuj cytat" onClick={() => copy(article.text, 'Skopiowano cytat')}>
            <Quote className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            title="Kopiuj podstawę"
            onClick={() => {
              const c = citation(article, acts)
              copy(c, `Skopiowano: ${c}`)
            }}
          >
            <Copy className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="+ Tag" onClick={() => setTagOpen((v) => !v)}>
            <Plus className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            title="Dodaj do nauki"
            onClick={() => {
              onStoreChange(addToLearnQueue(store, article.id))
              toast.push('Dodano do kolejki nauki')
            }}
          >
            <BookmarkPlus className="h-4 w-4" />
          </IconBtn>
        </div>
      </header>

      {tagOpen && (
        <div className="mb-3 rounded-xl border border-slate-200 bg-stone-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Nowy / istniejący tag
          </label>
          <div className="flex gap-2">
            <input
              autoFocus
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveInlineTag()
                if (e.key === 'Escape') setTagOpen(false)
              }}
              placeholder="np. zarzut, zbieg, bezskuteczność"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
              onClick={() => saveInlineTag()}
            >
              Zapisz
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {suggestions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="rounded-full border border-slate-200 px-2 py-0.5 font-mono text-xs hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-800"
                  onClick={() => saveInlineTag(t.label)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!compact ? (
        <ArticleBody article={article} query={query} onXref={handleXref} />
      ) : (
        <p className="max-w-2xl text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
          {article.excerpt}
        </p>
      )}
    </article>
  )
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: ReactNode
  onClick: () => void
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  )
}
