import { ChevronLeft, ChevronRight, Copy, MoreHorizontal, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { ActMeta, Article, UserStore } from '../../types'
import { ArticleBody } from '../article/ArticleBody'
import { ActBadge } from '../article/CrossRefPopover'
import { citation } from '../../lib/data'
import {
  addArticleToModule,
  newTagId,
  resolveLearnModules,
  upsertTag,
} from '../../lib/storage'
import { useToast } from '../ui/Toast'
import { cn } from '../../lib/cn'

type Props = {
  article: Article
  acts: ActMeta[]
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref?: (actId: string, number: string) => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
  highlightLegal?: boolean
  onToggleHighlight?: () => void
  className?: string
  bare?: boolean
  showNav?: boolean
}

export function Reader({
  article,
  acts,
  store,
  onStoreChange,
  onXref,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  highlightLegal = false,
  onToggleHighlight,
  className,
  bare,
  showNav = true,
}: Props) {
  const toast = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [modulePicker, setModulePicker] = useState(false)

  const linked = store.tags.filter((t) => t.articleIds.includes(article.id))
  const modules = resolveLearnModules(store)

  async function copyCite() {
    const c = citation(article, acts)
    try {
      await navigator.clipboard.writeText(c)
      toast.push(`Skopiowano: ${c}`)
    } catch {
      toast.push('Nie udało się skopiować')
    }
  }

  function saveTag(labelOverride?: string) {
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

  function handleXref(raw: string) {
    const art = raw.match(/art(?:ykuł|\.)?\s*(\d+[a-z]?)/i)
    if (art) onXref?.(article.actId, art[1])
  }

  return (
    <article
      id={`reader-${article.id}`}
      data-article-id={article.id}
      className={cn(
        !bare &&
          'rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80',
        bare && 'scroll-mt-24 border-b border-slate-200/70 py-6 dark:border-zinc-800',
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <ActBadge actId={article.actId} acts={acts} />
            <h2 className="font-mono text-xl font-bold tracking-tight">{article.label}</h2>
          </div>
          {article.title && (
            <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">{article.title}</p>
          )}
          {(article.chapter || article.section) && (
            <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-500">
              {[article.chapter, article.section].filter(Boolean).join(' › ')}
            </p>
          )}
          {linked.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {linked.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  #{t.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex items-center gap-1">
          <IconBtn title="Kopiuj podstawę" onClick={copyCite}>
            <Copy className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="+ Tag" onClick={() => setTagOpen((v) => !v)}>
            <Plus className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="Więcej" onClick={() => setMenuOpen((v) => !v)}>
            <MoreHorizontal className="h-4 w-4" />
          </IconBtn>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-10 min-w-[220px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-zinc-800"
                onClick={() => {
                  onToggleHighlight?.()
                  setMenuOpen(false)
                }}
              >
                {highlightLegal ? 'Wyłącz podświetlenie prawa' : 'Podświetl prawo'}
              </button>
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-zinc-800"
                onClick={() => {
                  setModulePicker(true)
                  setMenuOpen(false)
                }}
              >
                Dodaj do modułu nauki…
              </button>
            </div>
          )}
        </div>
      </header>

      {modulePicker && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-stone-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
          <p className="mb-2 text-xs font-semibold text-slate-500">Wybierz moduł</p>
          <div className="max-h-40 space-y-1 overflow-auto">
            {modules.map((m) => (
              <button
                key={m.id}
                type="button"
                className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white dark:hover:bg-zinc-800"
                onClick={() => {
                  onStoreChange(addArticleToModule(store, m.id, article.id))
                  setModulePicker(false)
                  toast.push(`Dodano do „${m.name}”`)
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 text-xs text-slate-500"
            onClick={() => setModulePicker(false)}
          >
            Anuluj
          </button>
        </div>
      )}

      {tagOpen && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-stone-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
          <div className="flex gap-2">
            <input
              autoFocus
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTag()
                if (e.key === 'Escape') setTagOpen(false)
              }}
              placeholder="Tag / żargon…"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
              onClick={() => saveTag()}
            >
              Zapisz
            </button>
          </div>
        </div>
      )}

      <ArticleBody
        article={article}
        plain={!highlightLegal}
        onXref={highlightLegal ? handleXref : undefined}
      />

      {showNav && (onPrev || onNext) && (
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-zinc-800">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={onPrev}
            className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 enabled:hover:bg-slate-50 disabled:opacity-30 dark:text-zinc-300 dark:enabled:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" /> Poprzedni
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={onNext}
            className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 enabled:hover:bg-slate-50 disabled:opacity-30 dark:text-zinc-300 dark:enabled:hover:bg-zinc-800"
          >
            Następny <ChevronRight className="h-4 w-4" />
          </button>
        </div>
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  )
}
