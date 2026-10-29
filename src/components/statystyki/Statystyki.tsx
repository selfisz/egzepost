import { ChevronRight, Layers, ListChecks } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '../../lib/cn'
import {
  guidedPath,
  progressBy,
  sessionHref,
  summarize,
  TYPE_LABELS,
  type LearnState,
  type QuestionBank,
  type QuestionType,
} from '../../lib/learn-adapter'
import {
  actReadStats,
  activityDays,
  answersInWindow,
  articleKnownWell,
  dueInDays,
  dueToday,
  efficacy,
  isRead,
  overallReadStats,
} from '../../lib/stats'
import type { ActId, Library } from '../../lib/structure'
import { isActId, plural } from '../../lib/structure'
import type { UserStore } from '../../types'
import { useQuestionBank } from '../nauka/Nauka'
import { ACT_META, Emblem, actClass } from '../shell/identity'
import { href } from '../shell/router'
import { SectionLabel } from '../shell/Shell'

export function StatystykiHome({
  lib,
  store,
  learn,
}: {
  lib: Library
  store: UserStore
  learn: LearnState
}) {
  const { bank, error } = useQuestionBank()
  if (error) {
    return (
      <div className="px-5 pt-8">
        <h1 className="font-serif text-[32px] font-semibold">Statystyki</h1>
        <p className="mt-4 text-muted">{error}</p>
      </div>
    )
  }
  if (!bank) {
    return (
      <div className="px-5 pt-8">
        <h1 className="font-serif text-[32px] font-semibold">Statystyki</h1>
        <p className="mt-4 text-muted">Ładowanie…</p>
      </div>
    )
  }
  return <Overview lib={lib} store={store} learn={learn} bank={bank} />
}

function Overview({
  lib,
  store,
  learn,
  bank,
}: {
  lib: Library
  store: UserStore
  learn: LearnState
  bank: QuestionBank
}) {
  const overall = useMemo(() => overallReadStats(lib, bank, learn, store), [lib, bank, learn, store])
  const eff = efficacy(learn)
  const today = answersInWindow(learn, 86_400_000).length
  const week = answersInWindow(learn, 7 * 86_400_000).length
  const days = activityDays(learn, 28)
  const byType = useMemo(() => {
    const groups = progressBy(bank, learn, 'type')
    return [...groups].sort((a, b) => a.pct - b.pct || b.mistakes - a.mistakes)
  }, [bank, learn])
  const weak = useMemo(() => {
    const stages = progressBy(bank, learn, 'stage')
      .filter((g) => g.mistakes > 0)
      .sort((a, b) => b.mistakes - a.mistakes)
      .slice(0, 3)
    return stages.map((g) => {
      const stage = bank.stages.find((s) => s.id === g.key)
      return { ...g, stage }
    })
  }, [bank, learn])

  return (
    <div className="px-5 pt-2 md:px-8 md:pt-8">
      <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight">Statystyki</h1>
      <p className="mt-1 text-[14px] text-muted">Przeczytane i opanowane — lokalnie, bez konta.</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <BigStat label="Przeczytane" value={`${overall.read} / ${overall.readable}`} />
        <BigStat label="Znam dobrze" value={`${overall.knownWell} / ${overall.withQuestions}`} />
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionLabel>Aktywność · 4 tygodnie</SectionLabel>
          <span className="text-[12.5px] text-muted tabular-nums">
            dziś {today} · 7 dni {week}
            {eff !== null ? ` · skuteczność ${eff}%` : ''}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-28 gap-1" style={{ gridTemplateColumns: 'repeat(28, minmax(0, 1fr))' }}>
          {days.map((d) => (
            <span
              key={d.key}
              title={`${d.key}: ${d.count}`}
              className={cn(
                'aspect-square rounded-[3px]',
                d.count === 0 ? 'bg-sunk' : d.count < 5 ? 'bg-gold/40' : d.count < 12 ? 'bg-gold/70' : 'bg-gold',
              )}
            />
          ))}
        </div>
      </div>

      <SectionLabel className="mt-8 mb-3">Akty</SectionLabel>
      <div className="space-y-3">
        {overall.acts.map((a) => {
          const due = dueToday(learn, bank, a.actId)
          const mistakes = summarize(
            bank.questions.filter((q) => q.actId === a.actId).map((q) => q.id),
            learn,
          ).mistakes
          return (
            <a
              key={a.actId}
              href={href(`statystyki/${a.actId}`)}
              className={cn(actClass(a.actId), 'flex gap-3 rounded-2xl border border-line bg-surface p-4')}
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-act-tint text-act">
                <Emblem act={a.actId} className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-act">{ACT_META[a.actId].short}</div>
                  <ChevronRight className="size-4 text-muted" />
                </div>
                <Meter label="Przeczytane" cur={a.read} max={a.readable} />
                <Meter label="Znam dobrze" cur={a.knownWell} max={a.withQuestions} className="mt-1.5" />
                <div className="mt-2 text-[12px] text-muted tabular-nums">
                  {mistakes} {plural(mistakes, 'błąd', 'błędy', 'błędów')} · {due} do powtórki
                </div>
              </div>
            </a>
          )
        })}
      </div>

      <SectionLabel className="mt-8 mb-3">Typy pytań</SectionLabel>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {byType.map((t) => {
          const typeEff = typeEfficacy(learn, bank, t.key as QuestionType)
          return (
            <li key={t.key} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14.5px] font-semibold">{t.label}</span>
                <span className="text-[12.5px] text-muted tabular-nums">
                  {t.mastered}/{t.total}
                  {typeEff !== null ? ` · ${typeEff}%` : ''}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunk">
                <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(t.pct, t.total ? 2 : 0)}%` }} />
              </div>
            </li>
          )
        })}
      </ul>

      {weak.length > 0 && (
        <>
          <SectionLabel className="mt-8 mb-3">Słabe miejsca</SectionLabel>
          <ul className="space-y-2">
            {weak.map((w) => (
              <li key={w.key}>
                <a
                  href={href(
                    sessionHref({
                      mode: 'mixed',
                      actId: isActId(w.stage?.actId) ? w.stage!.actId : undefined,
                      stageId: w.key,
                    }),
                  )}
                  className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14.5px] font-semibold">{w.label}</div>
                    <div className="text-[12.5px] text-muted">
                      {w.mistakes} {plural(w.mistakes, 'błąd', 'błędy', 'błędów')} · otwórz sesję
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export function StatystykiAct({
  lib,
  store,
  learn,
  actId,
}: {
  lib: Library
  store: UserStore
  learn: LearnState
  actId: ActId
}) {
  const { bank, error } = useQuestionBank()
  const [tab, setTab] = useState<'chapters' | 'types'>('chapters')
  const [sheet, setSheet] = useState<string | null>(null)

  if (error || !bank) {
    return (
      <div className="px-5 pt-8">
        <p className="text-muted">{error ?? 'Ładowanie…'}</p>
      </div>
    )
  }

  const stats = actReadStats(lib, bank, learn, store, actId)
  const qSummary = summarize(
    bank.questions.filter((q) => q.actId === actId).map((q) => q.id),
    learn,
  )
  const path = guidedPath(bank, learn, actId)
  const typeRows = (Object.keys(TYPE_LABELS) as QuestionType[])
    .map((type) => {
      const ids = bank.questions.filter((q) => q.actId === actId && q.type === type).map((q) => q.id)
      if (!ids.length) return null
      return { type, label: TYPE_LABELS[type], ...summarize(ids, learn), eff: typeEfficacy(learn, bank, type, actId) }
    })
    .filter(Boolean) as { type: QuestionType; label: string; total: number; mastered: number; mistakes: number; pct: number; eff: number | null }[]

  const sheetStage = sheet ? path.find((p) => p.stage.id === sheet) : null

  const divisions = new Map<string, typeof path>()
  for (const row of path) {
    const key = row.stage.chapter || 'Bez działu'
    const list = divisions.get(key) ?? []
    list.push(row)
    divisions.set(key, list)
  }

  return (
    <div className={cn(actClass(actId), 'px-5 pt-2 md:px-8 md:pt-4')}>
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-act-tint text-act">
          <Emblem act={actId} className="size-7" />
        </div>
        <div>
          <h1 className="font-serif text-[28px] font-semibold text-act">{ACT_META[actId].short}</h1>
          <div className="text-[13px] text-muted">{ACT_META[actId].name}</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <BigStat label="Przeczytane" value={`${stats.read} / ${stats.readable}`} />
        <BigStat label="Znam dobrze" value={`${stats.knownWell} / ${stats.withQuestions}`} />
      </div>
      <p className="mt-2 text-[12.5px] text-muted">
        {stats.withoutQuestions} {plural(stats.withoutQuestions, 'artykuł', 'artykuły', 'artykułów')} bez pytań · opanowane
        pytania {qSummary.mastered}/{qSummary.total} · błędy {qSummary.mistakes} · do powtórki dziś{' '}
        {dueToday(learn, bank, actId)} · w 7 dni {dueInDays(learn, bank, actId, 7)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-sunk p-1" role="tablist">
        {(
          [
            ['chapters', 'Rozdziały'],
            ['types', 'Typy pytań'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
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

      {tab === 'types' ? (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {typeRows
            .sort((a, b) => a.pct - b.pct)
            .map((t) => (
              <li key={t.type} className="px-4 py-3">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold">{t.label}</span>
                  <span className="text-[12.5px] text-muted tabular-nums">
                    {t.mastered}/{t.total}
                    {t.eff !== null ? ` · ${t.eff}%` : ''}
                    {t.mistakes ? ` · ${t.mistakes} bł.` : ''}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunk">
                  <div className="h-full rounded-full bg-act" style={{ width: `${Math.max(t.pct, 2)}%` }} />
                </div>
              </li>
            ))}
        </ul>
      ) : (
        <div className="mt-4 space-y-5">
          {[...divisions].map(([div, rows]) => (
            <section key={div}>
              <div className="mb-2 text-[12px] font-semibold tracking-wide text-act-ink/80 uppercase">{div}</div>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {rows.map(({ stage, progress }) => {
                  const artIds = stage.articleIds
                  const readN = artIds.filter((id) => isRead(store, id)).length
                  const withQ = artIds.filter((id) => bank.questions.some((q) => q.articleId === id))
                  const known = withQ.filter((id) => articleKnownWell(bank, learn, id).knownWell).length
                  const empty = progress.total === 0
                  return (
                    <li key={stage.id}>
                      <button
                        type="button"
                        onClick={() => setSheet(stage.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunk/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[14.5px] font-semibold">{stage.label}</div>
                          {empty ? (
                            <div className="mt-0.5 text-[12px] text-muted">tylko do czytania</div>
                          ) : (
                            <>
                              <MiniMeters
                                read={readN}
                                readable={artIds.length}
                                known={known}
                                knownMax={withQ.length}
                              />
                              <div className="mt-1 text-[12px] text-muted tabular-nums">
                                pytania {progress.mastered}/{progress.total}
                                {progress.mistakes ? ` · błędy ${progress.mistakes}` : ''}
                              </div>
                            </>
                          )}
                        </div>
                        <ChevronRight className="size-4 text-muted" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {sheetStage && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" role="dialog" aria-modal>
          <button type="button" className="flex-1" aria-label="Zamknij" onClick={() => setSheet(null)} />
          <div className="rounded-t-3xl bg-paper px-5 pt-4 pb-[max(env(safe-area-inset-bottom),20px)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <h2 className="font-serif text-[22px] font-semibold">{sheetStage.stage.label}</h2>
            <p className="mt-1 text-[13px] text-muted">
              opanowane {sheetStage.progress.mastered}/{sheetStage.progress.total} · błędy {sheetStage.progress.mistakes}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={href(sessionHref({ mode: 'test', actId, stageId: sheetStage.stage.id }))}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-paper"
              >
                <ListChecks className="size-4" /> Test
              </a>
              <a
                href={href(sessionHref({ mode: 'flashcards', actId, stageId: sheetStage.stage.id }))}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-line text-[15px] font-semibold"
              >
                <Layers className="size-4" /> Fiszki
              </a>
            </div>
            <a
              href={href(`nauka?akt=${actId}`)}
              className="mt-3 flex h-12 items-center justify-center rounded-2xl bg-sunk text-[14px] font-semibold"
            >
              Czytaj w Przeglądaj / Nauce
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function typeEfficacy(learn: LearnState, bank: QuestionBank, type: QuestionType, actId?: string): number | null {
  const ids = new Set(
    bank.questions.filter((q) => q.type === type && (!actId || q.actId === actId)).map((q) => q.id),
  )
  const log = learn.log.filter((e) => ids.has(e.qid)).slice(-500)
  if (!log.length) return null
  return Math.round((log.filter((e) => e.correct).length / log.length) * 100)
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{label}</div>
      <div className="mt-1 font-serif text-[26px] font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function Meter({ label, cur, max, className }: { label: string; cur: number; max: number; className?: string }) {
  const pct = max ? Math.round((cur / max) * 100) : 0
  return (
    <div className={className}>
      <div className="flex justify-between text-[11.5px] text-muted">
        <span>{label}</span>
        <span className="tabular-nums">
          {cur}/{max}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunk">
        <div className="h-full rounded-full bg-act" style={{ width: `${Math.max(pct, max ? 2 : 0)}%` }} />
      </div>
    </div>
  )
}

function MiniMeters({
  read,
  readable,
  known,
  knownMax,
}: {
  read: number
  readable: number
  known: number
  knownMax: number
}) {
  return (
    <div className="mt-2 flex gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-sunk" title={`Przeczytane ${read}/${readable}`}>
        <div
          className="h-full rounded-full bg-act/50"
          style={{ width: `${readable ? Math.max((read / readable) * 100, 2) : 0}%` }}
        />
      </div>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-sunk" title={`Znam dobrze ${known}/${knownMax}`}>
        <div
          className="h-full rounded-full bg-act"
          style={{ width: `${knownMax ? Math.max((known / knownMax) * 100, 2) : 0}%` }}
        />
      </div>
    </div>
  )
}
