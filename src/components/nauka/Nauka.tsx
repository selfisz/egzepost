import { BookOpen, Check, Layers, ListChecks, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/cn'
import {
  ensureBank,
  naukaSnapshot,
  sessionHref,
  type LearnState,
  type QuestionBank,
} from '../../lib/learn-adapter'
import type { ActId, Library } from '../../lib/structure'
import { articleRange, plural } from '../../lib/structure'
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

export function useQuestionBank() {
  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    ensureBank()
      .then((b) => !cancelled && setBank(b))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Brak banku pytań'))
    return () => {
      cancelled = true
    }
  }, [])
  return { bank, error }
}

export function TrainingCard({ learn, focusAct, lib }: { learn: LearnState; focusAct: ActId; lib: Library }) {
  const { bank, error } = useQuestionBank()
  const snap = useMemo(() => (bank ? naukaSnapshot(bank, learn, lib, focusAct) : null), [bank, learn, lib, focusAct])

  if (error)
    return (
      <div className="rounded-[24px] bg-hero p-5 text-hero-fg ring-1 ring-gold/15">
        <div className="text-[12px] font-semibold tracking-[0.14em] text-gold uppercase">Trening na dziś</div>
        <div className="mt-1.5 text-[13.5px] opacity-75">{error}</div>
      </div>
    )

  if (!bank || !snap)
    return (
      <div className="rounded-[24px] bg-hero p-5 text-hero-fg ring-1 ring-gold/15">
        <div className="text-[12px] font-semibold tracking-[0.14em] text-gold uppercase">Trening na dziś</div>
        <div className="mt-1.5 font-serif text-[22px] leading-tight font-semibold">Ładowanie pytań…</div>
      </div>
    )

  const parts = [
    snap.lineup.retry ? `${snap.lineup.retry} do poprawy` : '',
    snap.lineup.review ? `${snap.lineup.review} ${plural(snap.lineup.review, 'powtórka', 'powtórki', 'powtórek')}` : '',
    snap.lineup.new ? `${snap.lineup.new} nowe` : '',
  ].filter(Boolean)

  return (
    <div className="overflow-hidden rounded-[24px] bg-hero p-5 text-hero-fg ring-1 ring-gold/15">
      <div className="text-[12px] font-semibold tracking-[0.14em] text-gold uppercase">Trening na dziś</div>
      <div className="mt-1.5 font-serif text-[24px] leading-tight font-semibold">
        {ACT_META[focusAct].short} · 12 pytań
      </div>
      <div className="mt-1 text-[13.5px] opacity-65">
        {parts.join(' · ') || 'Nowe pytania z aktu'}
        {snap.lineup.proposedLabel ? ` · ${snap.lineup.proposedLabel}` : ''}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={href(sessionHref({ mode: 'test', actId: focusAct }))}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gold text-[15px] font-semibold text-black"
        >
          <ListChecks className="size-4" /> Test
        </a>
        <a
          href={href(sessionHref({ mode: 'flashcards', actId: focusAct }))}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/12 text-[15px] font-semibold ring-1 ring-white/20"
        >
          <Layers className="size-4" /> Fiszki
        </a>
      </div>
    </div>
  )
}

export function NaukaHome({
  lib,
  learn,
  actId,
}: {
  lib: Library
  store: UserStore
  learn: LearnState
  actId: ActId
}) {
  const { bank, error } = useQuestionBank()
  const snap = useMemo(() => (bank ? naukaSnapshot(bank, learn, lib, actId) : null), [bank, learn, lib, actId])
  const [sheetStage, setSheetStage] = useState<string | null>(null)

  if (error) {
    return (
      <div className="px-5 pt-8">
        <h1 className="font-serif text-[32px] font-semibold">Nauka</h1>
        <p className="mt-4 text-muted">{error}</p>
      </div>
    )
  }

  if (!bank || !snap) {
    return (
      <div className="px-5 pt-8">
        <h1 className="font-serif text-[32px] font-semibold">Nauka</h1>
        <p className="mt-4 text-muted">Ładowanie banku pytań…</p>
      </div>
    )
  }

  const sheet = sheetStage ? snap.chapters.find((c) => c.stage.id === sheetStage) : null
  const divisions = groupByDivision(snap.chapters)

  return (
    <div className="px-5 pt-2 md:px-8 md:pt-8">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight">Nauka</h1>
        <div className="mb-1 text-right text-[12.5px] leading-tight text-muted tabular-nums">
          <div>
            <b className="font-semibold text-ink">{snap.mastered}</b> / {snap.total} opanowanych
          </div>
          <div>
            <b className="font-semibold text-ink">{snap.dueToday}</b> do powtórki ·{' '}
            <b className="font-semibold text-ink">{snap.mistakes}</b> błędy
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={href(sessionHref({ mode: 'test', actId }))}
          className="flex h-14 flex-col items-center justify-center rounded-2xl bg-ink text-paper"
        >
          <span className="flex items-center gap-2 text-[16px] font-semibold">
            <ListChecks className="size-4" /> Test
          </span>
        </a>
        <a
          href={href(sessionHref({ mode: 'flashcards', actId }))}
          className="flex h-14 flex-col items-center justify-center rounded-2xl border border-line bg-surface"
        >
          <span className="flex items-center gap-2 text-[16px] font-semibold">
            <Layers className="size-4" /> Fiszki
          </span>
        </a>
      </div>
      <div className="mt-2 text-center text-[12.5px] text-muted">
        {ACT_META[actId].short} · wszystkie rozdziały
      </div>
      <div className="mt-2 text-center text-[12.5px] text-muted">
        {[
          snap.lineup.retry ? `${snap.lineup.retry} do poprawy` : '',
          snap.lineup.review ? `${snap.lineup.review} powtórek` : '',
          snap.lineup.new
            ? `reszta nowe${snap.lineup.proposedLabel ? ` z: ${snap.lineup.proposedLabel} (proponowany)` : ''}`
            : '',
        ]
          .filter(Boolean)
          .join(' · ') || 'Sesja z całego aktu'}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-1 rounded-2xl bg-sunk p-1" role="tablist">
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

      {snap.mistakes > 0 && (
        <a
          href={href(sessionHref({ mode: 'mixed', actId, mistakesOnly: true }))}
          className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3"
        >
          <span className="text-[14.5px] font-semibold">Moje błędy</span>
          <span className="text-[13px] text-muted tabular-nums">{snap.mistakes}</span>
        </a>
      )}

      <SectionLabel className="mt-8 mb-3">Rozdziały</SectionLabel>
      <div className={actClass(actId)}>
        {divisions.map((div) => (
          <section key={div.key} className="mb-5">
            <div className="flex items-center gap-3 rounded-2xl bg-act-tint px-4 py-3 text-act-ink">
              <span className="shrink-0 font-mono text-[11.5px] font-semibold">{div.heading}</span>
              <h2 className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{div.title}</h2>
            </div>
            <ul className="mt-1 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {div.rows.map((row) => {
                const empty = row.total === 0
                const pct = row.total ? row.seen / row.total : 0
                const ch = row.chapter
                return (
                  <li key={row.stage.id}>
                    <button
                      type="button"
                      disabled={empty}
                      onClick={() => !empty && setSheetStage(row.stage.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left',
                        empty ? 'cursor-default opacity-55' : 'hover:bg-sunk/60',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14.5px] font-semibold">{row.stage.label}</span>
                          {row.proposed && (
                            <span className="rounded-full bg-ink px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-paper uppercase">
                              Proponujemy
                            </span>
                          )}
                          {row.status === 'completed' && <Check className="size-4 text-act" strokeWidth={2.6} />}
                        </div>
                        <div className="mt-0.5 text-[12px] text-muted">
                          {empty
                            ? 'brak pytań — tylko do czytania'
                            : `${row.seen}/${row.total} · ${row.mistakes ? `do powtórki: ${row.mistakes}` : 'bez błędów'}${
                                ch ? ` · ${articleRange(ch)}` : ''
                              }`}
                        </div>
                        {!empty && (
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-sunk">
                            <div className="h-full rounded-full bg-act" style={{ width: `${Math.max(pct * 100, 2)}%` }} />
                          </div>
                        )}
                      </div>
                      {empty && ch ? (
                        <a
                          href={href(`akt/${actId}/r/${ch.index}`)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 text-[12.5px] font-semibold text-act"
                        >
                          Czytaj
                        </a>
                      ) : (
                        <Play className="size-4 shrink-0 text-muted" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      {sheet && (
        <ChapterSheet
          actId={actId}
          label={sheet.stage.label}
          stageId={sheet.stage.id}
          chapterIndex={sheet.chapter?.index}
          onClose={() => setSheetStage(null)}
        />
      )}
    </div>
  )
}

function groupByDivision(rows: ReturnType<typeof naukaSnapshot>['chapters']) {
  const map = new Map<string, { key: string; heading: string; title: string; rows: typeof rows }>()
  for (const row of rows) {
    const chapter = row.stage.chapter || 'Bez działu'
    const key = chapter
    const m = chapter.match(/^(Dział\s+[^\s—–-]+)\s*[—–-]\s*(.+)$/i)
    const heading = m ? m[1].toUpperCase() : 'DZIAŁ'
    const title = m ? m[2] : chapter
    const g = map.get(key) ?? { key, heading, title, rows: [] }
    g.rows.push(row)
    map.set(key, g)
  }
  return [...map.values()]
}

function ChapterSheet({
  actId,
  label,
  stageId,
  chapterIndex,
  onClose,
}: {
  actId: ActId
  label: string
  stageId: string
  chapterIndex?: number
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" role="dialog" aria-modal>
      <button type="button" className="flex-1 cursor-default" aria-label="Zamknij" onClick={onClose} />
      <div className="rounded-t-3xl bg-paper px-5 pt-4 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <h2 className="font-serif text-[22px] font-semibold">{label}</h2>
        <p className="mt-1 text-[13px] text-muted">Wybierz tryb — bez blokad, od razu.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={href(sessionHref({ mode: 'test', actId, stageId }))}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-paper"
          >
            <ListChecks className="size-4" /> Test
          </a>
          <a
            href={href(sessionHref({ mode: 'flashcards', actId, stageId }))}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-line text-[15px] font-semibold"
          >
            <Layers className="size-4" /> Fiszki
          </a>
        </div>
        {chapterIndex !== undefined && (
          <a
            href={href(`akt/${actId}/r/${chapterIndex}`)}
            className="mt-3 flex h-12 items-center justify-center gap-2 rounded-2xl bg-sunk text-[14px] font-semibold"
          >
            <BookOpen className="size-4" /> Zobacz rozdział
          </a>
        )}
      </div>
    </div>
  )
}
