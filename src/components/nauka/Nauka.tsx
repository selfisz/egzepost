import { Check, Lock, Play, RotateCcw } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '../../lib/cn'
import { learnEngine, type StageInfo } from '../../lib/learn-adapter'
import { isDue } from '../../lib/srs'
import type { ActId, Library } from '../../lib/structure'
import { articleRange, plural } from '../../lib/structure'
import type { UserStore } from '../../types'
import { ACT_META, Emblem, actClass } from '../shell/identity'
import { href } from '../shell/router'
import { SectionLabel } from '../shell/Shell'

const FOCUS_KEY = 'regest:nauka-act'
const OFFSETS = [0, 56, 84, 56, 0, -56, -84, -56]

export function readFocusAct(fallback: ActId = 'upea'): ActId {
  const v = localStorage.getItem(FOCUS_KEY)
  return v === 'upea' || v === 'kpa' || v === 'ordynacja' ? v : fallback
}

export function writeFocusAct(id: ActId) {
  localStorage.setItem(FOCUS_KEY, id)
}

export function TrainingCard({ lib, store, focusAct }: { lib: Library; store: UserStore; focusAct: ActId }) {
  const plan = useMemo(() => learnEngine.dailyPlan(lib, store, focusAct), [lib, store, focusAct])
  const minutes = Math.max(1, Math.round(plan.cards.length * 0.5))
  if (!plan.cards.length)
    return (
      <div className="rounded-[24px] bg-hero p-5 text-hero-fg ring-1 ring-gold/15">
        <div className="text-[12px] font-semibold tracking-[0.14em] text-gold uppercase">Trening na dziś</div>
        <div className="mt-1.5 font-serif text-[22px] leading-tight font-semibold">Na dziś wszystko zrobione</div>
        <div className="mt-1 text-[13.5px] opacity-65">Kolejne powtórki pojawią się same.</div>
      </div>
    )
  const parts = [
    plan.reviews ? `${plan.reviews} ${plural(plan.reviews, 'powtórka', 'powtórki', 'powtórek')}` : '',
    plan.fresh ? `${plan.fresh} ${plural(plan.fresh, 'nowy przepis', 'nowe przepisy', 'nowych przepisów')}` : '',
  ].filter(Boolean)
  return (
    <a href={href('nauka/trening')} className="block overflow-hidden rounded-[24px] bg-hero p-5 text-hero-fg ring-1 ring-gold/15">
      <div className="text-[12px] font-semibold tracking-[0.14em] text-gold uppercase">Trening na dziś</div>
      <div className="mt-1.5 font-serif text-[24px] leading-tight font-semibold">
        {plan.cards.length} {plural(plan.cards.length, 'karta', 'karty', 'kart')} · ok. {minutes} min
      </div>
      <div className="mt-1 text-[13.5px] opacity-65">{parts.join(' + ')} · układa się sam</div>
      <div className="mt-4 flex gap-1.5" aria-hidden>
        {plan.cards.map((c) => (
          <span key={c.id} className={cn(actClass(c.article.actId), 'h-1.5 flex-1 rounded-full bg-act')} />
        ))}
      </div>
      <div className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-gold text-[15px] font-semibold text-black">
        <Play className="size-4 fill-current" /> Zacznij trening
      </div>
    </a>
  )
}

export function NaukaHome({ lib, store, actId }: { lib: Library; store: UserStore; actId: ActId }) {
  const act = lib.acts[actId]
  const allStages = useMemo(() => learnEngine.stages(act, store), [act, store])
  // Fully repealed rozdziały have nothing to learn — keep them off the path.
  const stages = allStages.filter((s) => s.total > 0)
  const done = stages.filter((s) => s.state === 'done').length
  const current = stages.find((s) => s.state === 'current')
  const currentNo = current ? stages.indexOf(current) + 1 : stages.length
  const pct = stages.length ? done / stages.length : 0
  const stats = useMemo(() => {
    const now = Date.now()
    const entries = Object.values(store.progress)
    return { seen: entries.length, due: entries.filter((p) => isDue(p, now)).length }
  }, [store.progress])

  let nodeIdx = 0
  return (
    <div className="px-5 pt-2 md:px-8 md:pt-8">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight">Nauka</h1>
        <div className="mb-1 text-right text-[12.5px] leading-tight text-muted tabular-nums">
          <div>
            <b className="font-semibold text-ink">{stats.seen}</b> poznanych
          </div>
          <div>
            <b className="font-semibold text-ink">{stats.due}</b> do powtórki
          </div>
        </div>
      </div>

      <div className="mt-4">
        <TrainingCard lib={lib} store={store} focusAct={actId} />
      </div>

      <SectionLabel className="mt-8 mb-3">Ścieżka kursu</SectionLabel>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-sunk p-1" role="tablist">
        {lib.list.map((a) => (
          <a
            key={a.id}
            role="tab"
            aria-selected={a.id === actId}
            href={href(`nauka?akt=${a.id}`)}
            className={cn(
              actClass(a.id),
              'flex items-center justify-center gap-1.5 rounded-xl py-2 text-[13.5px] font-semibold',
              a.id === actId ? 'bg-surface text-act shadow-sm' : 'text-muted',
            )}
          >
            <Emblem act={a.id} className="size-4" />
            {ACT_META[a.id].short}
          </a>
        ))}
      </div>

      <div className={cn(actClass(actId), 'mt-3 flex items-center gap-3 px-1')}>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
          <div className="h-full rounded-full bg-act" style={{ width: `${Math.max(pct * 100, 2)}%` }} />
        </div>
        <span className="text-[12.5px] font-medium text-muted tabular-nums">
          {done === 0 && !current?.seen ? 'Start od podstaw' : `Etap ${currentNo} z ${stages.length}`}{' '}
          · {Math.round(pct * 100)}%
        </span>
      </div>

      <div className={cn(actClass(actId), 'mt-6')}>
        {act.divisions.map((d, di) => {
          const divStages = d.chapters.map((c) => allStages[c.index]).filter((s) => s.total > 0)
          if (!divStages.length) return null
          const divDone = divStages.filter((s) => s.state === 'done').length
          return (
            <section key={di} className="mb-6">
              <div className="flex items-center gap-3 rounded-2xl bg-act-tint px-4 py-3 text-act-ink">
                <span className="shrink-0 font-mono text-[11.5px] font-semibold">DZIAŁ {d.no}</span>
                <h2 className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{d.title}</h2>
                <span className="text-[12px] tabular-nums opacity-70">
                  {divDone}/{d.chapters.length}
                </span>
              </div>
              <div className="flex flex-col items-center py-4">
                {divStages.map((s) => (
                  <PathNode key={s.chapter.index} actId={actId} stage={s} offset={OFFSETS[nodeIdx++ % OFFSETS.length]} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function PathNode({ actId, stage, offset }: { actId: ActId; stage: StageInfo; offset: number }) {
  const { chapter: ch, state } = stage
  const link = href(`nauka/etap/${actId}/${ch.index}`)
  const circle = cn(
    'grid size-[68px] place-items-center rounded-full border-b-[5px] transition',
    state === 'locked'
      ? 'border-line bg-sunk text-muted'
      : 'border-black/20 bg-act text-white active:translate-y-0.5 dark:text-black/80',
    state === 'current' && 'pulse',
  )
  const icon =
    state === 'done' ? (
      <Check className="size-7" strokeWidth={2.6} />
    ) : state === 'current' ? (
      <Play className="size-6 fill-current" />
    ) : (
      <Lock className="size-5" strokeWidth={2} />
    )
  return (
    <div className="flex w-full flex-col items-center py-2.5" style={{ transform: `translateX(${offset}px)` }}>
      {state === 'current' && (
        <div className="relative mb-3 rounded-xl bg-ink px-3 py-2 text-center text-paper shadow-lg">
          <div className="text-[11px] font-semibold tracking-wider text-gold uppercase">Teraz</div>
          <div className="text-[13px] font-semibold tabular-nums">
            {stage.seen} z {stage.total} przepisów
          </div>
          <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-ink" />
        </div>
      )}
      {state === 'locked' ? (
        <span className={circle} aria-label={`${ch.title} — etap zablokowany`}>
          {icon}
        </span>
      ) : (
        <a href={link} className={circle} aria-label={`${ch.title} — ${state === 'done' ? 'powtórz etap' : 'ucz się'}`}>
          {icon}
        </a>
      )}
      <div className={cn('mt-2 w-40 text-center', state === 'locked' && 'text-muted')}>
        <div className="line-clamp-2 text-[13px] leading-tight font-medium">{ch.title}</div>
        <div className="mt-0.5 text-[11px] text-muted tabular-nums">
          {articleRange(ch)} · {stage.total} {plural(stage.total, 'przepis', 'przepisy', 'przepisów')}
        </div>
        {state === 'done' && (
          <a href={link} className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-medium text-act">
            <RotateCcw className="size-3" /> Powtórz
          </a>
        )}
      </div>
    </div>
  )
}
