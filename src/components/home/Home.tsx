import { Search } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { LearnState } from '../../lib/learn-adapter'
import { getProfile } from '../../lib/storage'
import type { ActId, Library } from '../../lib/structure'
import { chapterLabel, isActId } from '../../lib/structure'
import type { Article, UserStore } from '../../types'
import { ActCover } from '../browse/Browse'
import { TrainingCard } from '../nauka/Nauka'
import { ACT_META, actClass } from '../shell/identity'
import { href } from '../shell/router'
import { SectionLabel } from '../shell/Shell'

const FALLBACK_SHORTCUTS = ['zarzut', 'tytuł wykonawczy', 'doręczenie zastępcze', 'przedawnienie', 'koszty upomnienia']

function greeting(d: Date, name?: string) {
  const h = d.getHours()
  const base = h < 5 || h >= 18 ? 'Dobry wieczór' : 'Dzień dobry'
  return name ? `${base}, ${name}.` : `${base}.`
}

export function Home({
  lib,
  byId,
  store,
  learn,
  focusAct,
}: {
  lib: Library
  byId: Map<string, Article>
  store: UserStore
  learn: LearnState
  focusAct: ActId
}) {
  const now = new Date()
  const date = now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
  const name = getProfile(store).name
  const recent = (store.recentArticleIds ?? []).map((id) => byId.get(id)).filter((a): a is Article => !!a)
  const last = recent[0]
  const pinned = new Set(store.pinnedTagIds ?? [])
  const tags = [...store.tags].sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id))).slice(0, 8)

  return (
    <div className="px-5 pt-2 md:px-8 md:pt-8">
      <div className="text-[13px] text-muted first-letter:uppercase">{date}</div>
      <h1 className="mt-1 font-serif text-[32px] leading-tight font-semibold tracking-tight">{greeting(now, name)}</h1>

      <a
        href={href('szukaj')}
        className="mt-5 flex h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 text-muted"
      >
        <Search className="size-5" strokeWidth={1.8} />
        <span className="text-[15px]">Słowo, zagadnienie albo „art. 33 upea”</span>
      </a>

      <div className="mt-4">
        <TrainingCard lib={lib} learn={learn} focusAct={focusAct} />
      </div>

      {last && isActId(last.actId) && (
        <>
          <SectionLabel className="mt-9 mb-3">Czytaj dalej</SectionLabel>
          <ContinueCard lib={lib} article={last} />
          {recent.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {recent.slice(1, 5).map((a) => (
                <a
                  key={a.id}
                  href={href(`art/${a.id}`)}
                  className={cn(actClass(a.actId), 'rounded-full border border-line bg-surface px-3 py-1 text-[13px]')}
                >
                  <span className="font-semibold text-act">{isActId(a.actId) ? ACT_META[a.actId].short : ''}</span>{' '}
                  {a.label}
                </a>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-9 mb-3 flex items-end justify-between">
        <SectionLabel>Akty</SectionLabel>
        <a href={href('przegladaj')} className="text-[13px] font-medium text-ink-2">
          Wszystkie
        </a>
      </div>
      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0">
        {lib.list.map((act) => (
          <ActCover key={act.id} act={act} size="sm" />
        ))}
      </div>

      <SectionLabel className="mt-9 mb-3">{tags.length ? 'Twoje tagi' : 'Na skróty'}</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {(tags.length ? tags.map((t) => t.label) : FALLBACK_SHORTCUTS).map((t) => (
          <a
            key={t}
            href={href(`szukaj?q=${encodeURIComponent(t)}`)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[13.5px]',
              tags.length ? 'bg-gold-tint font-medium text-ink-2' : 'border border-line bg-surface text-ink-2',
            )}
          >
            {tags.length ? `#${t}` : t}
          </a>
        ))}
      </div>
    </div>
  )
}

function ContinueCard({ lib, article }: { lib: Library; article: Article }) {
  const act = isActId(article.actId) ? lib.acts[article.actId] : undefined
  const ch = act?.chapterOf.get(article.id)
  return (
    <a href={href(`art/${article.id}`)} className={cn(actClass(article.actId), 'flex gap-4 rounded-2xl border border-line bg-surface p-4')}>
      <div className="w-1 shrink-0 rounded-full bg-act" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] text-muted">
          {act?.shortName}
          {ch ? ` · ${chapterLabel(ch)} · ${ch.title}` : ''}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="shrink-0 font-serif text-[19px] font-semibold">{article.label}</span>
          <span className="truncate text-[15px] text-ink-2">{article.title}</span>
        </div>
        <p className="law mt-1.5 line-clamp-2 text-[14.5px] leading-snug text-muted">{article.blocks[0]?.text}</p>
      </div>
    </a>
  )
}
