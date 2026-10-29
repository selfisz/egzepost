import { BookOpen, Layers, Play, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/cn'
import {
  dailyCounts,
  focusActFromState,
  loadBank,
  openPath,
  planSession,
  readLearnState,
  type LearnMode,
  type QuestionBank,
} from '../../lib/learn-adapter'
import { plural, type ActId, type Library } from '../../lib/structure'
import type { UserStore } from '../../types'
import { ACT_META, Emblem, actClass } from '../shell/identity'
import { href } from '../shell/router'
import { SectionLabel } from '../shell/Shell'

const FOCUS_KEY = 'regest:nauka-act'

export function readFocusAct(fallback: ActId = 'upea'): ActId {
  const v = localStorage.getItem(FOCUS_KEY)
  return v === 'upea' || v === 'kpa' || v === 'ordynacja' ? v : fallback
}

export function writeFocusAct(id: ActId) {
  localStorage.setItem(FOCUS_KEY, id)
}

function sessionHref(mode: LearnMode, opts?: { stageId?: string; mistakes?: boolean; actId?: ActId }) {
  const q = new URLSearchParams()
  q.set('tryb', mode)
  if (opts?.actId) q.set('akt', opts.actId)
  if (opts?.stageId) q.set('etap', opts.stageId)
  if (opts?.mistakes) q.set('bledy', '1')
  return href(`nauka/sesja?${q.toString()}`)
}

export function TrainingCard({
  bank,
  focusAct,
}: {
  bank: QuestionBank | null
  focusAct: ActId
}) {
  const state = useMemo(() => readLearnState(), [bank])
  const plan = useMemo(() => {
    if (!bank) return null
    return planSession(bank, state, { mode: 'mixed', actId: focusAct })
  }, [bank, state, focusAct])

  if (!bank || !plan)
    return (
      <div className="rounded-[24px] bg-hero p-5 text-hero-fg ring-1 ring-gold/15">
        <div className="text-[12px] font-semibold tracking-[0.14em] text-gold uppercase">Trening na dziś</div>
        <div className="mt-1.5 font-serif text-[22px] leading-tight font-semibold">Ładowanie pytań…</div>
      </div>
    )

  if (!plan.items.length)
    return (
      <div className="rounded-[24px] bg-hero p-5 text-hero-fg ring-1 ring-gold/15">
        <div className="text-[12px] font-semibold tracking-[0.14em] text-gold uppercase">Trening na dziś</div>
        <div className="mt-1.5 font-serif text-[22px] leading-tight font-semibold">Na dziś wszystko zrobione</div>
        <div className="mt-1 text-[13.5px] opacity-65">Kolejne powtórki pojawią się same — albo wybierz rozdział poniżej.</div>
      </div>
    )

  const minutes = Math.max(1, Math.round(plan.items.length * 0.5))
  const parts = [
    plan.counts.retry ? `${plan.counts.retry} ${plural(plan.counts.retry, 'błąd', 'błędy', 'błędów')}` : '',
    plan.counts.review ? `${plan.counts.review} ${plural(plan.counts.review, 'powtórka', 'powtórki', 'powtórek')}` : '',
    plan.counts.new ? `${plan.counts.new} ${plural(plan.counts.new, 'nowe', 'nowe', 'nowych')}` : '',
  ].filter(Boolean)

  return (
    <div className="overflow-hidden rounded-[24px] bg-hero p-5 text-hero-fg ring-1 ring-gold/15">
      <div className="text-[12px] font-semibold tracking-[0.14em] text-gold uppercase">Trening na dziś</div>
      <div className="mt-1.5 font-serif text-[24px] leading-tight font-semibold">
        {plan.items.length} {plural(plan.items.length, 'pytanie', 'pytania', 'pytań')} · ok. {minutes} min
      </div>
      <div className="mt-1 text-[13.5px] opacity-65">
        {parts.join(' · ')}
        {plan.stage ? ` · nowe z: ${plan.stage.label}` : ''}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={sessionHref('test', { actId: focusAct })}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gold text-[15px] font-semibold text-black"
        >
          <Play className="size-4 fill-current" /> Test
        </a>
        <a
          href={sessionHref('flashcards', { actId: focusAct })}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 text-[15px] font-semibold ring-1 ring-white/20"
        >
          <Layers className="size-4" /> Fiszki
        </a>
      </div>
    </div>
  )
}

export function NaukaHome({ lib, store, actId }: { lib: Library; store: UserStore; actId: ActId }) {
  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sheetStageId, setSheetStageId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBank()
      .then((b) => !cancelled && setBank(b))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Brak banku pytań'))
    return () => {
      cancelled = true
    }
  }, [])

  const state = useMemo(() => readLearnState(), [bank, store.learnQueue])
  const path = useMemo(() => (bank ? openPath(bank, state, actId, lib) : []), [bank, state, actId, lib])
  const counts = useMemo(() => (bank ? dailyCounts(bank, state, actId) : null), [bank, state, actId])
  const sheet = path.find((p) => p.stage.id === sheetStageId)

  return (
    <div className="px-5 pt-2 md:px-8 md:pt-8">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight">Nauka</h1>
        {counts && (
          <div className="mb-1 text-right text-[12.5px] leading-tight text-muted tabular-nums">
            <div>
              <b className="font-semibold text-ink">{counts.mastered}</b> / {counts.total} opanowanych
            </div>
            <div>
              <b className="font-semibold text-ink">{counts.due}</b> do powtórki ·{' '}
              <b className="font-semibold text-ink">{counts.wrong}</b> błędów
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <TrainingCard bank={bank} focusAct={actId} />
      </div>

      {error && (
        <p className="mt-3 rounded-2xl border border-dashed border-red-300 p-3 text-[13px] text-red-800 dark:border-red-900 dark:text-red-200">
          {error}
        </p>
      )}

      <SectionLabel className="mt-8 mb-3">Zakres</SectionLabel>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-sunk p-1" role="tablist">
        {lib.list.map((a) => (
          <a
            key={a.id}
            role="tab"
            aria-selected={a.id === actId}
            href={href(`nauka?akt=${a.id}`)}
            onClick={() => writeFocusAct(a.id)}
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
      <p className="mt-2 text-[12.5px] text-muted">
        {ACT_META[actId].short} · wszystkie rozdziały otwarte
        {counts?.suggested ? (
          <>
            {' '}
            · proponujemy: <span className="font-medium text-ink-2">{counts.suggested.label}</span>
          </>
        ) : null}
      </p>

      {counts && counts.wrong > 0 && (
        <a
          href={sessionHref('mixed', { actId, mistakes: true })}
          className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3"
        >
          <span className="text-[14px] font-semibold">Moje błędy</span>
          <span className="text-[13px] text-muted tabular-nums">{counts.wrong} do poprawy →</span>
        </a>
      )}

      <SectionLabel className="mt-8 mb-3">Rozdziały</SectionLabel>
      {!bank && <p className="text-[14px] text-muted">Ładowanie…</p>}
      {bank &&
        lib.acts[actId].divisions.map((d) => {
          const rows = path.filter((p) => p.chapter?.divisionNo === d.no || (!p.chapter && p.stage.chapter.includes(d.title)))
          // Fallback: match by chapter belonging to division
          const byDiv = path.filter((p) => p.chapter && d.chapters.some((c) => c.index === p.chapter!.index))
          const list = byDiv.length ? byDiv : rows
          if (!list.length) return null
          return (
            <section key={d.no + d.title} className="mb-5">
              <div className={cn(actClass(actId), 'mb-2 flex items-center gap-3 rounded-2xl bg-act-tint px-4 py-2.5 text-act-ink')}>
                <span className="shrink-0 font-mono text-[11.5px] font-semibold">DZIAŁ {d.no}</span>
                <h2 className="min-w-0 flex-1 truncate text-[14px] font-semibold">{d.title}</h2>
              </div>
              <ul className="space-y-1.5">
                {list.map(({ stage, progress, suggested }) => {
                  const empty = progress.total === 0
                  const pct = progress.total ? progress.mastered / progress.total : 0
                  return (
                    <li key={stage.id}>
                      <button
                        type="button"
                        onClick={() => setSheetStageId(stage.id)}
                        className={cn(
                          actClass(actId),
                          'flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 text-left',
                          empty && 'opacity-70',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[14.5px] font-semibold">{stage.label}</span>
                            {suggested && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold-tint px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">
                                <Sparkles className="size-3" /> Proponujemy
                              </span>
                            )}
                            {progress.status === 'completed' && (
                              <span className="shrink-0 text-[11px] font-semibold text-act">✓</span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[12px] text-muted tabular-nums">
                            {empty
                              ? 'brak pytań — tylko do czytania'
                              : `${progress.mastered}/${progress.total} opanowanych${
                                  progress.mistakes ? ` · ${progress.mistakes} błędów` : ''
                                }`}
                          </div>
                          {!empty && (
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-sunk">
                              <div className="h-full rounded-full bg-act" style={{ width: `${Math.max(pct * 100, 2)}%` }} />
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}

      {sheet && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 pb-[max(env(safe-area-inset-bottom),16px)] md:items-center"
          role="dialog"
          aria-modal
          onClick={() => setSheetStageId(null)}
        >
          <div
            className={cn(actClass(actId), 'w-full max-w-md rounded-[24px] bg-paper p-5 shadow-xl')}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[12px] font-semibold tracking-wider text-muted uppercase">Rozdział</div>
            <h2 className="mt-1 font-serif text-[22px] leading-tight font-semibold">{sheet.stage.label}</h2>
            <p className="mt-1 text-[13.5px] text-muted">
              {sheet.progress.total
                ? `${sheet.progress.mastered}/${sheet.progress.total} opanowanych`
                : 'Brak pytań w banku — możesz przeczytać przepisy.'}
              {sheet.suggested ? ' · Proponujemy ten rozdział' : ''}
            </p>
            <div className="mt-5 grid gap-2">
              {sheet.progress.total > 0 && (
                <>
                  <a
                    href={sessionHref('test', { actId, stageId: sheet.stage.id })}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-paper"
                  >
                    <Play className="size-4 fill-current" /> Test
                  </a>
                  <a
                    href={sessionHref('flashcards', { actId, stageId: sheet.stage.id })}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-[15px] font-semibold"
                  >
                    <Layers className="size-4" /> Fiszki
                  </a>
                </>
              )}
              {sheet.chapter && (
                <a
                  href={href(`akt/${actId}/r/${sheet.chapter.index}`)}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-ink-2"
                >
                  <BookOpen className="size-4" /> Zobacz rozdział
                </a>
              )}
              <button type="button" onClick={() => setSheetStageId(null)} className="h-11 text-[14px] text-muted">
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Used by Home before bank is loaded locally — resolves focus from learn state if present. */
export function resolveFocusAct(): ActId {
  try {
    return focusActFromState(readLearnState(), readFocusAct())
  } catch {
    return readFocusAct()
  }
}
