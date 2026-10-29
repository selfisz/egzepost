import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/cn'
import { loadBank, readLearnState, type QuestionBank } from '../../lib/learn-adapter'
import {
  actStats,
  activityDaysWithReading,
  answersToday,
  chapterStats,
  overallAccuracy,
  sumActs,
  typeStats,
  weakChapters,
  type ActStats,
  type ChapterStats,
} from '../../lib/stats'
import { chapterLabel, plural, type ActId, type Library } from '../../lib/structure'
import type { UserStore } from '../../types'
import { ACT_META, Emblem, actClass } from '../shell/identity'
import { href } from '../shell/router'
import { Ring, SectionLabel } from '../shell/Shell'

function RatioText({ have, total }: { have: number; total: number }) {
  return (
    <span className="tabular-nums">
      {have}
      <span className="text-muted">/{total}</span>
    </span>
  )
}

function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-sunk">
      <div className={cn('h-full rounded-full', className ?? 'bg-ink')} style={{ width: `${Math.max(Math.min(value, 1) * 100, value ? 2 : 0)}%` }} />
    </div>
  )
}

export function StatystykiHome({
  lib,
  store,
  actId,
}: {
  lib: Library
  store: UserStore
  actId?: ActId
}) {
  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBank()
      .then((b) => !cancelled && setBank(b))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Brak banku'))
    return () => {
      cancelled = true
    }
  }, [])

  const state = useMemo(() => readLearnState(), [bank, store.readLog])
  const acts = useMemo(() => (bank ? actStats(lib, bank, store, state) : []), [bank, lib, store, state])
  const totals = useMemo(() => sumActs(acts), [acts])
  const types = useMemo(() => (bank ? typeStats(bank, state) : []), [bank, state])
  const weak = useMemo(() => (bank ? weakChapters(lib, bank, store, state, 3) : []), [bank, lib, store, state])
  const activity = useMemo(() => activityDaysWithReading(state, store, 28), [state, store])
  const accuracy = overallAccuracy(state)
  const today = answersToday(state)

  if (actId && bank) {
    return <ActDetail lib={lib} store={store} bank={bank} actId={actId} />
  }

  return (
    <div className="px-5 pt-2 md:px-8 md:pt-8">
      <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight">Statystyki</h1>
      <p className="mt-1 text-[13.5px] text-muted">Czytanie i nauka — tylko na tym urządzeniu.</p>

      {error && (
        <p className="mt-3 rounded-2xl border border-dashed border-red-300 p-3 text-[13px] text-red-800">{error}</p>
      )}

      {!bank && !error && <p className="mt-6 text-muted">Ładowanie…</p>}

      {bank && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <BigStat label="Przeczytane" ratio={totals.read} />
            <BigStat label="Znam dobrze" ratio={totals.knownWell} hint="artykuły z pytaniami" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
            <span>
              Dziś: <b className="font-semibold text-ink tabular-nums">{today}</b>{' '}
              {plural(today, 'odpowiedź', 'odpowiedzi', 'odpowiedzi')}
            </span>
            {accuracy != null && (
              <span>
                Skuteczność: <b className="font-semibold text-ink tabular-nums">{accuracy}%</b>
              </span>
            )}
          </div>

          <SectionLabel className="mt-6 mb-2">Aktywność · 4 tygodnie</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {activity.map((on, i) => (
              <span
                key={i}
                className={cn('size-2.5 rounded-[3px]', on ? 'bg-ink' : 'bg-sunk')}
                title={on ? 'aktywność' : 'brak'}
              />
            ))}
          </div>

          <SectionLabel className="mt-8 mb-3">Akty</SectionLabel>
          <div className="space-y-3">
            {acts.map((a) => (
              <ActCard key={a.actId} a={a} />
            ))}
          </div>

          <SectionLabel className="mt-8 mb-3">Typy pytań</SectionLabel>
          <ul className="space-y-2">
            {types.slice(0, 8).map((t) => (
              <li key={t.type} className="rounded-2xl border border-line bg-surface px-3.5 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[14px] font-semibold">{t.label}</span>
                  <span className="text-[12.5px] text-muted tabular-nums">
                    <RatioText have={t.questions.have} total={t.questions.total} />
                    {t.accuracy != null ? ` · ${t.accuracy}%` : ''}
                    {t.mistakes ? ` · ${t.mistakes} błędów` : ''}
                  </span>
                </div>
                <div className="mt-2">
                  <Bar value={t.questions.total ? t.questions.have / t.questions.total : 0} />
                </div>
              </li>
            ))}
          </ul>

          {weak.length > 0 && (
            <>
              <SectionLabel className="mt-8 mb-3">Słabe miejsca</SectionLabel>
              <ul className="space-y-2">
                {weak.map((c) => (
                  <li key={c.chapter.actId + c.chapter.index}>
                    <a
                      href={
                        c.stageId
                          ? href(`nauka/sesja?tryb=test&akt=${c.chapter.actId}&etap=${encodeURIComponent(c.stageId)}`)
                          : href(`akt/${c.chapter.actId}/r/${c.chapter.index}`)
                      }
                      className={cn(actClass(c.chapter.actId), 'flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3')}
                    >
                      <Emblem act={c.chapter.actId} className="size-5 shrink-0 text-act" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold">
                          {ACT_META[c.chapter.actId].short} · {chapterLabel(c.chapter)} · {c.chapter.title}
                        </div>
                        <div className="text-[12.5px] text-muted tabular-nums">{c.mistakes} błędów · ćwicz →</div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}

function BigStat({ label, ratio, hint }: { label: string; ratio: { have: number; total: number }; hint?: string }) {
  const pct = ratio.total ? ratio.have / ratio.total : 0
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <Ring value={pct} size={48} stroke={5} />
        <div>
          <div className="text-[11.5px] font-semibold tracking-wider text-muted uppercase">{label}</div>
          <div className="font-serif text-[26px] leading-none font-semibold">
            <RatioText have={ratio.have} total={ratio.total} />
          </div>
          {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
        </div>
      </div>
    </div>
  )
}

function ActCard({ a }: { a: ActStats }) {
  return (
    <a href={href(`statystyki/${a.actId}`)} className={cn(actClass(a.actId), 'block rounded-2xl border border-line bg-surface p-4')}>
      <div className="flex items-center gap-2">
        <Emblem act={a.actId} className="size-5 text-act" />
        <span className="text-[16px] font-semibold">{a.shortName}</span>
      </div>
      <div className="mt-3 space-y-2.5">
        <div>
          <div className="mb-1 flex justify-between text-[12.5px]">
            <span className="text-muted">Przeczytane</span>
            <RatioText have={a.read.have} total={a.read.total} />
          </div>
          <Bar value={a.read.total ? a.read.have / a.read.total : 0} className="bg-act" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[12.5px]">
            <span className="text-muted">Znam dobrze</span>
            <RatioText have={a.knownWell.have} total={a.knownWell.total} />
          </div>
          <Bar value={a.knownWell.total ? a.knownWell.have / a.knownWell.total : 0} className="bg-act" />
        </div>
      </div>
      <div className="mt-3 text-[12px] text-muted tabular-nums">
        {a.mistakes} błędów · {a.due} do powtórki
        {a.withoutQuestions ? ` · ${a.withoutQuestions} bez pytań` : ''}
      </div>
    </a>
  )
}

function ActDetail({
  lib,
  store,
  bank,
  actId,
}: {
  lib: Library
  store: UserStore
  bank: QuestionBank
  actId: ActId
}) {
  const state = useMemo(() => readLearnState(), [bank, store])
  const act = lib.acts[actId]
  const a = useMemo(() => actStats(lib, bank, store, state).find((x) => x.actId === actId)!, [lib, bank, store, state, actId])
  const chapters = useMemo(() => chapterStats(act, bank, store, state), [act, bank, store, state])
  const types = useMemo(
    () => typeStats({ ...bank, questions: bank.questions.filter((q) => q.actId === actId) }, state),
    [bank, state, actId],
  )
  const [tab, setTab] = useState<'rozdzialy' | 'typy'>('rozdzialy')
  const [sheet, setSheet] = useState<ChapterStats | null>(null)

  // Group by division
  const byDiv = act.divisions.map((d) => ({
    d,
    rows: chapters.filter((c) => c.chapter.divisionNo === d.no),
  }))

  return (
    <div className={cn(actClass(actId), 'px-5 pt-2 md:px-8 md:pt-8')}>
      <div className="flex items-center gap-2">
        <Emblem act={actId} className="size-6 text-act" />
        <h1 className="font-serif text-[28px] font-semibold tracking-tight">{act.shortName}</h1>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <BigStat label="Przeczytane" ratio={a.read} />
        <BigStat label="Znam dobrze" ratio={a.knownWell} />
      </div>
      <p className="mt-3 text-[12.5px] text-muted tabular-nums">
        Pytania: {a.questions.have}/{a.questions.total} opanowanych · {a.mistakes} błędów · {a.due} do powtórki
        {a.withoutQuestions ? ` · ${a.withoutQuestions} artykułów bez pytań` : ''}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-sunk p-1">
        {(
          [
            ['rozdzialy', 'Rozdziały'],
            ['typy', 'Typy pytań'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded-xl py-2 text-[13.5px] font-semibold',
              tab === id ? 'bg-surface shadow-sm' : 'text-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'rozdzialy' && (
        <div className="mt-4 space-y-5">
          {byDiv.map(({ d, rows }) =>
            rows.length ? (
              <section key={d.no}>
                <div className="mb-2 text-[12px] font-semibold tracking-wider text-act uppercase">
                  Dział {d.no} — {d.title}
                </div>
                <ul className="space-y-1.5">
                  {rows.map((c) => (
                    <li key={c.chapter.index}>
                      <button
                        type="button"
                        onClick={() => setSheet(c)}
                        className="flex w-full flex-col gap-1.5 rounded-2xl border border-line bg-surface px-3.5 py-3 text-left"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="text-[14px] font-semibold">
                            {chapterLabel(c.chapter)} · {c.chapter.title}
                          </span>
                          {c.onlyReading && <span className="shrink-0 text-[11px] text-muted">tylko czytanie</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="mb-0.5 text-[11px] text-muted">
                              Czytanie <RatioText have={c.read.have} total={c.read.total} />
                            </div>
                            <Bar value={c.read.total ? c.read.have / c.read.total : 0} className="bg-act" />
                          </div>
                          <div>
                            <div className="mb-0.5 text-[11px] text-muted">
                              Znam <RatioText have={c.knownWell.have} total={c.knownWell.total} />
                            </div>
                            <Bar value={c.knownWell.total ? c.knownWell.have / c.knownWell.total : 0} className="bg-act" />
                          </div>
                        </div>
                        {c.mistakes > 0 && (
                          <div className="text-[12px] text-muted tabular-nums">{c.mistakes} błędów</div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}

      {tab === 'typy' && (
        <ul className="mt-4 space-y-2">
          {types.map((t) => (
            <li key={t.type} className="rounded-2xl border border-line bg-surface px-3.5 py-3">
              <div className="flex justify-between text-[14px] font-semibold">
                <span>{t.label}</span>
                <RatioText have={t.questions.have} total={t.questions.total} />
              </div>
              <div className="mt-2">
                <Bar value={t.questions.total ? t.questions.have / t.questions.total : 0} className="bg-act" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {sheet && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 pb-[max(env(safe-area-inset-bottom),16px)]"
          role="dialog"
          aria-modal
          onClick={() => setSheet(null)}
        >
          <div className="w-full max-w-md rounded-[24px] bg-paper p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-[20px] font-semibold">
              {chapterLabel(sheet.chapter)} · {sheet.chapter.title}
            </h2>
            <p className="mt-1 text-[13px] text-muted tabular-nums">
              Czytanie {sheet.read.have}/{sheet.read.total} · znam {sheet.knownWell.have}/{sheet.knownWell.total}
              {sheet.mistakes ? ` · ${sheet.mistakes} błędów` : ''}
            </p>
            <div className="mt-5 grid gap-2">
              {sheet.stageId && !sheet.onlyReading && (
                <>
                  <a
                    href={href(`nauka/sesja?tryb=test&akt=${actId}&etap=${encodeURIComponent(sheet.stageId)}`)}
                    className="flex h-12 items-center justify-center rounded-2xl bg-ink text-[15px] font-semibold text-paper"
                  >
                    Test
                  </a>
                  <a
                    href={href(`nauka/sesja?tryb=flashcards&akt=${actId}&etap=${encodeURIComponent(sheet.stageId)}`)}
                    className="flex h-12 items-center justify-center rounded-2xl border border-line bg-surface text-[15px] font-semibold"
                  >
                    Fiszki
                  </a>
                </>
              )}
              <a
                href={href(`akt/${actId}/r/${sheet.chapter.index}`)}
                className="flex h-12 items-center justify-center rounded-2xl text-[15px] font-semibold text-ink-2"
              >
                Czytaj
              </a>
              <button type="button" onClick={() => setSheet(null)} className="h-11 text-[14px] text-muted">
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
