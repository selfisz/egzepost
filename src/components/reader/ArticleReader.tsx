import { ArrowUpRight, BookmarkCheck, BookmarkPlus, Copy, Quote, Tag } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { citation } from '../../lib/data'
import { cn } from '../../lib/cn'
import { addToLearnQueue, getPrefs, markArticleRead, newTagId, pushRecentArticle, upsertTag } from '../../lib/storage'
import type { Library } from '../../lib/structure'
import { chapterLabel, isActId } from '../../lib/structure'
import type { ActMeta, Article, UserStore } from '../../types'
import { LawText } from '../article/LawText'
import { Emblem, actClass } from '../shell/identity'
import { href } from '../shell/router'
import { useToast } from '../ui/Toast'

type Props = {
  lib: Library
  acts: ActMeta[]
  article: Article
  chapterMode: boolean
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
}

export function ArticleReader({ lib, acts, article, chapterMode, store, onStoreChange, onXref }: Props) {
  const toast = useToast()
  const highlight = getPrefs(store).highlightLegal
  const act = isActId(article.actId) ? lib.acts[article.actId] : undefined

  const ch = act?.chapterOf.get(article.id)
  const list = act && ch && chapterMode ? ch.articles : [article]

  useEffect(() => {
    let next = store
    if ((store.recentArticleIds ?? [])[0] !== article.id) next = pushRecentArticle(next, article.id)
    next = markArticleRead(next, article.id)
    if (next !== store) onStoreChange(next)
    // Only on article change; store updates from this effect must not retrigger it.
  }, [article.id])

  useEffect(() => {
    if (!chapterMode || !act) return
    const nodes = list
      .map((a) => document.getElementById(`a-${a.id}`))
      .filter((n): n is HTMLElement => !!n)
    if (!nodes.length) return
    const seen = new Set<string>()
    const io = new IntersectionObserver(
      (entries) => {
        let nextStore = store
        let changed = false
        for (const e of entries) {
          if (!e.isIntersecting || e.intersectionRatio < 0.5) continue
          const id = e.target.id.replace(/^a-/, '')
          if (seen.has(id) || store.readLog?.[id]) continue
          seen.add(id)
          nextStore = markArticleRead(nextStore, id)
          changed = true
        }
        if (changed) onStoreChange(nextStore)
      },
      { threshold: 0.5 },
    )
    for (const n of nodes) io.observe(n)
    return () => io.disconnect()
  }, [chapterMode, article.id, act?.id])

  if (!act || !ch) return <div className="p-8 text-muted">Brak w bazie: {article.id}</div>
  const i = act.articles.indexOf(article)
  const prev = act.articles[i - 1]
  const next = act.articles[i + 1]

  const handleXref = (fromActId: string) => (raw: string) => {
    const m = raw.match(/art(?:ykuł|\.)?\s*(\d+[a-z]*)/i)
    if (m) onXref(fromActId, m[1])
    else toast.push('Odesłanie do § w tym artykule')
  }

  return (
    <div className={cn(actClass(act.id), 'px-5 md:px-8')}>
      <a href={href(`akt/${act.id}/r/${ch.index}`)} className="flex items-center gap-1.5 text-[12.5px] text-muted">
        <Emblem act={act.id} className="size-3.5 shrink-0 text-act" />
        <span className="font-semibold text-act">{act.shortName}</span>
        <span>·</span>
        <span className="truncate">
          {chapterLabel(ch)} · {ch.title}
        </span>
      </a>

      <div className="mt-4 inline-flex rounded-full bg-sunk p-1 text-[13px] font-medium" role="tablist">
        <a
          role="tab"
          aria-selected={!chapterMode}
          href={href(`art/${article.id}`)}
          className={cn('rounded-full px-3.5 py-1.5', !chapterMode ? 'bg-surface shadow-sm' : 'text-muted')}
        >
          Artykuł
        </a>
        <a
          role="tab"
          aria-selected={chapterMode}
          href={href(`art/${article.id}?tryb=rozdzial`)}
          className={cn('rounded-full px-3.5 py-1.5', chapterMode ? 'bg-surface shadow-sm' : 'text-muted')}
        >
          Cały rozdział
        </a>
      </div>

      {list.map((art) => (
        <article
          key={art.id}
          id={`a-${art.id}`}
          className="mx-auto max-w-2xl border-b border-line py-7 last:border-b-0"
        >
          <h1 className="font-serif text-[34px] leading-none font-semibold tracking-tight">
            {chapterMode ? <a href={href(`art/${art.id}`)}>{art.label}</a> : art.label}
          </h1>
          {art.title && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-[17px] font-semibold text-ink-2">{art.title}</span>
              <span
                title="Tytuł redakcyjny z Legalis — nie jest częścią tekstu ustawy"
                className="rounded-md border border-line px-1.5 py-0.5 text-[10.5px] font-medium text-muted"
              >
                tytuł red.
              </span>
            </div>
          )}
          <LinkedTags store={store} articleId={art.id} />
          <LawText article={art} className="mt-6" onXref={handleXref(art.actId)} highlight={highlight} />
        </article>
      ))}

      {!chapterMode && (
        <>
          <Actions lib={lib} acts={acts} article={article} store={store} onStoreChange={onStoreChange} />
          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 pb-4">
            {prev ? (
              <a href={href(`art/${prev.id}`)} className="rounded-2xl border border-line p-3.5">
                <div className="text-[11.5px] text-muted">← Poprzedni</div>
                <div className="mt-1 text-[14px] font-semibold">{prev.label}</div>
                <div className="truncate text-[12.5px] text-muted">{prev.title}</div>
              </a>
            ) : (
              <span />
            )}
            {next && (
              <a href={href(`art/${next.id}`)} className="rounded-2xl border border-line p-3.5 text-right">
                <div className="text-[11.5px] text-muted">Następny →</div>
                <div className="mt-1 text-[14px] font-semibold">{next.label}</div>
                <div className="truncate text-[12.5px] text-muted">{next.title}</div>
              </a>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function LinkedTags({ store, articleId }: { store: UserStore; articleId: string }) {
  const tags = store.tags.filter((t) => t.articleIds.includes(articleId))
  if (!tags.length) return null
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <a
          key={t.id}
          href={href(`szukaj?q=${encodeURIComponent(t.label)}`)}
          className="rounded-full bg-gold-tint px-2.5 py-0.5 text-[12.5px] font-medium text-ink-2"
        >
          #{t.label}
        </a>
      ))}
    </div>
  )
}

function Actions({
  lib,
  acts,
  article,
  store,
  onStoreChange,
}: {
  lib: Library
  acts: ActMeta[]
  article: Article
  store: UserStore
  onStoreChange: (next: UserStore) => void
}) {
  const toast = useToast()
  const [tagOpen, setTagOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const queued = store.learnQueue.includes(article.id)
  const isap = isActId(article.actId) ? lib.acts[article.actId].isapUrl : undefined

  async function copy(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.push(msg)
    } catch {
      toast.push('Nie udało się skopiować')
    }
  }

  function saveTag(labelOverride?: string) {
    const label = (labelOverride ?? tagInput).trim()
    if (!label) return
    const now = new Date().toISOString()
    const existing = store.tags.find((t) => t.label.toLocaleLowerCase('pl') === label.toLocaleLowerCase('pl'))
    if (existing) {
      const articleIds = existing.articleIds.includes(article.id)
        ? existing.articleIds
        : [...existing.articleIds, article.id]
      onStoreChange(upsertTag(store, { ...existing, articleIds, updatedAt: now }))
    } else {
      onStoreChange(
        upsertTag(store, { id: newTagId(), label, aliases: [], articleIds: [article.id], createdAt: now, updatedAt: now }),
      )
    }
    setTagInput('')
    setTagOpen(false)
    toast.push(`Tag „${label}” przypisany`)
  }

  const q = tagInput.trim().toLocaleLowerCase('pl')
  const suggestions = store.tags.filter((t) => !q || t.label.toLocaleLowerCase('pl').includes(q)).slice(0, 6)
  const cite = citation(article, acts)

  return (
    <div className="mx-auto mt-2 max-w-2xl">
      <div className="grid grid-cols-4 gap-2">
        <ActionBtn icon={<Quote className="size-4" />} label="Cytat" onClick={() => copy(`${article.text}\n(${cite})`, 'Skopiowano cytat')} />
        <ActionBtn icon={<Copy className="size-4" />} label="Podstawa" onClick={() => copy(cite, `Skopiowano: ${cite}`)} />
        <ActionBtn icon={<Tag className="size-4" />} label="Tag" active={tagOpen} onClick={() => setTagOpen((v) => !v)} />
        <ActionBtn
          icon={queued ? <BookmarkCheck className="size-4" /> : <BookmarkPlus className="size-4" />}
          label={queued ? 'W nauce' : 'Do nauki'}
          active={queued}
          onClick={() => {
            if (queued) return
            onStoreChange(addToLearnQueue(store, article.id))
            toast.push('Dodano do treningu — pojawi się w „Trening na dziś”')
          }}
        />
      </div>
      {tagOpen && (
        <div className="mt-3 rounded-2xl border border-line bg-surface p-3">
          <label className="mb-1.5 block text-[12px] font-semibold text-muted" htmlFor="tag-input">
            Nowy lub istniejący tag
          </label>
          <div className="flex gap-2">
            <input
              id="tag-input"
              autoFocus
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTag()
                if (e.key === 'Escape') setTagOpen(false)
              }}
              placeholder="np. zarzut, zbieg, bezskuteczność"
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 text-[15px] outline-none focus:border-ink/40"
            />
            <button
              type="button"
              onClick={() => saveTag()}
              className="rounded-xl bg-ink px-4 text-[14px] font-semibold text-paper"
            >
              Zapisz
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => saveTag(t.label)}
                  className="rounded-full border border-line px-2.5 py-0.5 text-[12.5px]"
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {isap && (
        <a
          href={isap}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-muted"
        >
          Tekst jednolity w ISAP (PDF) <ArrowUpRight className="size-3.5" />
        </a>
      )}
    </div>
  )
}

function ActionBtn({
  icon,
  label,
  onClick,
  active,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-[12.5px] font-medium',
        active ? 'border-ink/30 bg-sunk' : 'border-line bg-surface',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
