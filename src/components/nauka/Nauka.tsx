import { BookOpen, Check, Layers, List, ListChecks, Minus, Plus, Route } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import {
  countQuestionsForArticles,
  countQuestionsForStage,
  ensureBank,
  naukaSnapshot,
  type LearnMode,
  type LearnState,
  type QuestionBank,
} from '../../lib/learn-adapter'
import {
  addTagArticlesToLearnSet,
  getLearnSet,
  learnSetSize,
  removeArticleFromLearnSet,
  removeStageFromLearnSet,
  toggleStageInLearnSet,
} from '../../lib/storage'
import type { ActId, Library } from '../../lib/structure'
import { articleRange, plural } from '../../lib/structure'
import type { UserStore } from '../../types'
import { ACT_META, Emblem, actClass } from '../shell/identity'
import { href } from '../shell/router'
import { SectionLabel } from '../shell/Shell'
import { ModeStartButtons, SessionPreviewSheet, type PreviewRequest } from './SessionPreview'

const FOCUS_KEY = 'regest:nauka-act'
const VIEW_KEY = 'regest:nauka-chapters-view'

export type ChaptersView = 'lista' | 'sciezka'

export function readFocusAct(fallback: ActId = 'upea'): ActId {
  const v = localStorage.getItem(FOCUS_KEY)
  return v === 'upea' || v === 'kpa' || v === 'ordynacja' ? v : fallback
}

export function writeFocusAct(id: ActId) {
  localStorage.setItem(FOCUS_KEY, id)
}

export function readChaptersView(): ChaptersView {
  return localStorage.getItem(VIEW_KEY) === 'sciezka' ? 'sciezka' : 'lista'
}

export function writeChaptersView(v: ChaptersView) {
  localStorage.setItem(VIEW_KEY, v)
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

export function TrainingCard({
  learn,
  focusAct,
  lib,
}: {
  learn: LearnState
  focusAct: ActId
  lib: Library
}) {
  const { bank, error } = useQuestionBank()
  const snap = useMemo(() => (bank ? naukaSnapshot(bank, learn, lib, focusAct) : null), [bank, learn, lib, focusAct])
  const [preview, setPreview] = useState<PreviewRequest | null>(null)

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
    <>
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
          <button
            type="button"
            onClick={() => setPreview({ mode: 'test', actId: focusAct })}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gold text-[15px] font-semibold text-black"
          >
            <ListChecks className="size-4" /> Test
          </button>
          <button
            type="button"
            onClick={() => setPreview({ mode: 'flashcards', actId: focusAct })}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/12 text-[15px] font-semibold ring-1 ring-white/20"
          >
            <Layers className="size-4" /> Fiszki
          </button>
        </div>
      </div>
      {preview && (
        <SessionPreviewSheet
          learn={learn}
          request={preview}
          onClose={() => setPreview(null)}
          onChangeScope={() => {
            setPreview(null)
            window.location.hash = href(`nauka?akt=${focusAct}`)
          }}
        />
      )}
    </>
  )
}

export function NaukaHome({
  lib,
  store,
  onStoreChange,
  learn,
  actId,
}: {
  lib: Library
  store: UserStore
  onStoreChange: (next: UserStore) => void
  learn: LearnState
  actId: ActId
}) {
  const { bank, error } = useQuestionBank()
  const snap = useMemo(() => (bank ? naukaSnapshot(bank, learn, lib, actId) : null), [bank, learn, lib, actId])
  const [sheetStage, setSheetStage] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewRequest | null>(null)
  const [view, setView] = useState<ChaptersView>(() => readChaptersView())
  const [tagPickOpen, setTagPickOpen] = useState(false)
  const chaptersRef = useRef<HTMLDivElement>(null)

  function setChaptersView(next: ChaptersView) {
    setView(next)
    writeChaptersView(next)
  }

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
  const learnSet = getLearnSet(store)
  const setCount = learnSetSize(store)
  const inSet = new Set(learnSet.stageIds)

  function openPreview(req: PreviewRequest) {
    setSheetStage(null)
    setPreview(req)
  }

  function changeScopeFromPreview() {
    const kind = preview?.zestaw ? 'zestaw' : preview?.stageId ? 'chapters' : 'chapters'
    setPreview(null)
    if (kind === 'zestaw') {
      document.getElementById('moj-zestaw')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      chaptersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

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

      {/* 1. Trening na dziś */}
      <section className="mt-5">
        <SectionLabel className="mb-3">Trening na dziś</SectionLabel>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="font-serif text-[20px] font-semibold">
            {ACT_META[actId].short} · sesja 12 pytań
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {[
              snap.lineup.retry ? `${snap.lineup.retry} do poprawy` : '',
              snap.lineup.review ? `${snap.lineup.review} powtórek` : '',
              snap.lineup.new
                ? `reszta nowe${snap.lineup.proposedLabel ? ` z: ${snap.lineup.proposedLabel}` : ''}`
                : '',
            ]
              .filter(Boolean)
              .join(' · ') || 'Sesja z całego aktu'}
          </p>
          <div className="mt-3">
            <ModeStartButtons onPick={(mode) => openPreview({ mode, actId })} />
          </div>
        </div>
      </section>

      {snap.mistakes > 0 && (
        <button
          type="button"
          onClick={() => openPreview({ mode: 'mixed', actId, mistakesOnly: true })}
          className="mt-3 flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-left"
        >
          <span className="text-[14.5px] font-semibold">Moje błędy</span>
          <span className="text-[13px] text-muted tabular-nums">{snap.mistakes}</span>
        </button>
      )}

      {/* 2. Mój zestaw */}
      <section id="moj-zestaw" className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <SectionLabel className="mb-0">Mój zestaw</SectionLabel>
          <span className="text-[12.5px] text-muted tabular-nums">
            {setCount ? `${setCount} ${plural(setCount, 'pozycja', 'pozycje', 'pozycji')}` : 'pusty'}
          </span>
        </div>
        <MojZestaw
          bank={bank}
          lib={lib}
          store={store}
          onStoreChange={onStoreChange}
          onStart={(mode) => openPreview({ mode, zestaw: learnSet })}
          tagPickOpen={tagPickOpen}
          onTagPickOpen={setTagPickOpen}
        />
      </section>

      {/* Act switcher */}
      <div className="mt-8 grid grid-cols-3 gap-1 rounded-2xl bg-sunk p-1" role="tablist">
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

      {/* 3. Chapter list / path */}
      <div ref={chaptersRef} className="mt-6 flex items-end justify-between gap-3">
        <SectionLabel className="mb-0">Rozdziały</SectionLabel>
        <div className="grid grid-cols-2 gap-0.5 rounded-xl bg-sunk p-0.5" role="tablist" aria-label="Widok rozdziałów">
          {(
            [
              ['lista', List, 'Lista'],
              ['sciezka', Route, 'Ścieżka'],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setChaptersView(id)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12.5px] font-semibold',
                view === id ? 'bg-surface text-ink shadow-sm' : 'text-muted',
              )}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn(actClass(actId), 'mt-3')}>
        {view === 'lista' ? (
          <ChapterList
            divisions={divisions}
            actId={actId}
            inSet={inSet}
            onOpen={(stageId) => setSheetStage(stageId)}
            onToggleSet={(stageId) => onStoreChange(toggleStageInLearnSet(store, stageId))}
          />
        ) : (
          <ChapterPath
            rows={snap.chapters}
            actId={actId}
            inSet={inSet}
            onOpen={(stageId) => setSheetStage(stageId)}
            onToggleSet={(stageId) => onStoreChange(toggleStageInLearnSet(store, stageId))}
          />
        )}
      </div>

      {sheet && (
        <ChapterSheet
          actId={actId}
          label={sheet.stage.label}
          stageId={sheet.stage.id}
          chapterIndex={sheet.chapter?.index}
          questionCount={sheet.total}
          inSet={inSet.has(sheet.stage.id)}
          onToggleSet={() => onStoreChange(toggleStageInLearnSet(store, sheet.stage.id))}
          onPickMode={(mode) =>
            openPreview({ mode, actId, stageId: sheet.stage.id, stageLabel: sheet.stage.label })
          }
          onClose={() => setSheetStage(null)}
        />
      )}

      {preview && (
        <SessionPreviewSheet
          learn={learn}
          request={preview}
          onClose={() => setPreview(null)}
          onChangeScope={changeScopeFromPreview}
        />
      )}
    </div>
  )
}

function MojZestaw({
  bank,
  lib,
  store,
  onStoreChange,
  onStart,
  tagPickOpen,
  onTagPickOpen,
}: {
  bank: QuestionBank
  lib: Library
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onStart: (mode: LearnMode) => void
  tagPickOpen: boolean
  onTagPickOpen: (v: boolean) => void
}) {
  const set = getLearnSet(store)
  const stageById = useMemo(() => new Map(bank.stages.map((s) => [s.id, s])), [bank])

  if (!set.stageIds.length && !set.articleIds.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-4 py-5">
        <p className="text-[14.5px] text-muted">
          Dodaj rozdziały (+ lub długie przytrzymanie) albo artykuł z czytnika („Do nauki”).
        </p>
        {store.tags.length > 0 && (
          <button
            type="button"
            onClick={() => onTagPickOpen(!tagPickOpen)}
            className="mt-3 text-[13px] font-semibold text-ink underline-offset-2 hover:underline"
          >
            Dodaj z tagu…
          </button>
        )}
        {tagPickOpen && <TagPicker store={store} onPick={(id) => onStoreChange(addTagArticlesToLearnSet(store, id))} />}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <ul className="divide-y divide-line">
        {set.stageIds.map((id) => {
          const stage = stageById.get(id)
          const n = countQuestionsForStage(bank, id)
          const actId = (stage?.actId ?? id.split(':')[0]) as ActId
          const short = ACT_META[actId]?.short ?? actId
          return (
            <li key={`s:${id}`} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">
                  <span className={cn(actClass(actId), 'text-act')}>{short}</span> · {stage?.label ?? id}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {n === 0 ? 'brak pytań — tylko przeczytaj' : `${n} ${plural(n, 'pytanie', 'pytania', 'pytań')}`}
                </div>
              </div>
              <button
                type="button"
                aria-label="Usuń z zestawu"
                onClick={() => onStoreChange(removeStageFromLearnSet(store, id))}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-sunk text-muted"
              >
                <Minus className="size-4" />
              </button>
            </li>
          )
        })}
        {set.articleIds.map((id) => {
          const art = findArticle(lib, id)
          const n = countQuestionsForArticles(bank, [id])
          const actId = (art?.actId ?? id.split(':')[0]) as ActId
          const short = ACT_META[actId]?.short ?? actId
          return (
            <li key={`a:${id}`} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">
                  <span className={cn(actClass(actId), 'text-act')}>{short}</span> · {art?.label ?? id}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {n === 0 ? 'brak pytań — tylko przeczytaj' : `${n} ${plural(n, 'pytanie', 'pytania', 'pytań')}`}
                </div>
              </div>
              <button
                type="button"
                aria-label="Usuń z zestawu"
                onClick={() => onStoreChange(removeArticleFromLearnSet(store, id))}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-sunk text-muted"
              >
                <Minus className="size-4" />
              </button>
            </li>
          )
        })}
      </ul>
      <div className="border-t border-line p-3">
        <ModeStartButtons onPick={onStart} />
        {store.tags.length > 0 && (
          <button
            type="button"
            onClick={() => onTagPickOpen(!tagPickOpen)}
            className="mt-2 w-full text-center text-[12.5px] font-semibold text-muted"
          >
            Dodaj z tagu…
          </button>
        )}
        {tagPickOpen && <TagPicker store={store} onPick={(id) => onStoreChange(addTagArticlesToLearnSet(store, id))} />}
      </div>
    </div>
  )
}

function TagPicker({ store, onPick }: { store: UserStore; onPick: (tagId: string) => void }) {
  return (
    <ul className="mt-2 max-h-40 overflow-auto rounded-xl bg-sunk p-1">
      {store.tags.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => onPick(t.id)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] hover:bg-surface"
          >
            <span className="font-medium">{t.label}</span>
            <span className="text-muted tabular-nums">{t.articleIds.length} art.</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function ChapterList({
  divisions,
  actId,
  inSet,
  onOpen,
  onToggleSet,
}: {
  divisions: ReturnType<typeof groupByDivision>
  actId: ActId
  inSet: Set<string>
  onOpen: (stageId: string) => void
  onToggleSet: (stageId: string) => void
}) {
  return (
    <>
      {divisions.map((div) => (
        <section key={div.key} className="mb-5">
          <div className="flex items-center gap-3 rounded-2xl bg-act-tint px-4 py-3 text-act-ink">
            <span className="shrink-0 font-mono text-[11.5px] font-semibold">{div.heading}</span>
            <h2 className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{div.title}</h2>
          </div>
          <ul className="mt-1 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {div.rows.map((row) => (
              <ChapterListRow
                key={row.stage.id}
                row={row}
                actId={actId}
                inSet={inSet.has(row.stage.id)}
                onOpen={() => onOpen(row.stage.id)}
                onToggleSet={() => onToggleSet(row.stage.id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

function ChapterListRow({
  row,
  actId,
  inSet,
  onOpen,
  onToggleSet,
}: {
  row: ReturnType<typeof naukaSnapshot>['chapters'][number]
  actId: ActId
  inSet: boolean
  onOpen: () => void
  onToggleSet: () => void
}) {
  const empty = row.total === 0
  const pct = row.total ? row.seen / row.total : 0
  const ch = row.chapter
  const longPress = useLongPress(onToggleSet)

  return (
    <li>
      <div
        className={cn('flex w-full items-center gap-2 px-3 py-3', empty ? 'opacity-55' : 'hover:bg-sunk/60')}
        {...longPress}
      >
        <button
          type="button"
          aria-label={inSet ? 'Usuń z zestawu' : 'Dodaj do zestawu'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleSet()
          }}
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            inSet ? 'bg-ink text-paper' : 'bg-sunk text-muted',
          )}
        >
          {inSet ? <Check className="size-4" strokeWidth={2.6} /> : <Plus className="size-4" />}
        </button>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left" disabled={false}>
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
              ? 'brak pytań — tylko przeczytaj'
              : `${row.total} ${plural(row.total, 'pytanie', 'pytania', 'pytań')} · ${row.seen}/${row.total}${
                  row.mistakes ? ` · do powtórki: ${row.mistakes}` : ''
                }${ch ? ` · ${articleRange(ch)}` : ''}`}
          </div>
          {!empty && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-sunk">
              <div className="h-full rounded-full bg-act" style={{ width: `${Math.max(pct * 100, 2)}%` }} />
            </div>
          )}
        </button>
        {empty && ch ? (
          <a
            href={href(`akt/${actId}/r/${ch.index}`)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-[12.5px] font-semibold text-act"
          >
            Czytaj
          </a>
        ) : null}
      </div>
    </li>
  )
}

function ChapterPath({
  rows,
  inSet,
  onOpen,
  onToggleSet,
}: {
  rows: ReturnType<typeof naukaSnapshot>['chapters']
  actId: ActId
  inSet: Set<string>
  onOpen: (stageId: string) => void
  onToggleSet: (stageId: string) => void
}) {
  return (
    <ol className="relative mx-auto max-w-md py-2">
      <div className="absolute top-4 bottom-4 left-[21px] w-px bg-line" aria-hidden />
      {rows.map((row) => (
        <ChapterPathRow
          key={row.stage.id}
          row={row}
          inSet={inSet.has(row.stage.id)}
          onOpen={() => onOpen(row.stage.id)}
          onToggleSet={() => onToggleSet(row.stage.id)}
        />
      ))}
    </ol>
  )
}

function ChapterPathRow({
  row,
  inSet,
  onOpen,
  onToggleSet,
}: {
  row: ReturnType<typeof naukaSnapshot>['chapters'][number]
  inSet: boolean
  onOpen: () => void
  onToggleSet: () => void
}) {
  const mastered = row.status === 'completed'
  const empty = row.total === 0
  const longPress = useLongPress(onToggleSet)
  return (
    <li className="relative flex gap-3 py-2.5">
      <button
        type="button"
        aria-label={row.stage.label}
        onClick={onOpen}
        {...longPress}
        className={cn(
          'relative z-[1] mt-0.5 grid size-[42px] shrink-0 place-items-center rounded-full border-2 transition',
          mastered
            ? 'border-act bg-act text-act-ink'
            : empty
              ? 'border-line bg-sunk text-muted'
              : row.proposed
                ? 'border-ink bg-paper text-ink ring-4 ring-ink/10'
                : 'border-line bg-paper text-muted',
        )}
      >
        {mastered ? (
          <Check className="size-5" strokeWidth={2.8} />
        ) : (
          <span className="size-2.5 rounded-full bg-current opacity-40" />
        )}
      </button>
      <div className="min-w-0 flex-1 pt-1">
        <button type="button" onClick={onOpen} className="w-full text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('text-[14.5px] font-semibold', empty && 'text-muted')}>{row.stage.label}</span>
            {row.proposed && (
              <span className="rounded-full bg-ink px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-paper uppercase">
                Proponujemy
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[12px] text-muted">
            {empty
              ? 'brak pytań — tylko przeczytaj'
              : `${row.total} ${plural(row.total, 'pytanie', 'pytania', 'pytań')} · ${row.seen}/${row.total}`}
          </div>
        </button>
      </div>
      <button
        type="button"
        aria-label={inSet ? 'Usuń z zestawu' : 'Dodaj do zestawu'}
        onClick={onToggleSet}
        className={cn(
          'mt-1 grid size-9 shrink-0 place-items-center rounded-full',
          inSet ? 'bg-ink text-paper' : 'bg-sunk text-muted',
        )}
      >
        {inSet ? <Check className="size-4" strokeWidth={2.6} /> : <Plus className="size-4" />}
      </button>
    </li>
  )
}

function findArticle(lib: Library, articleId: string) {
  for (const act of lib.list) {
    const hit = act.articles.find((a) => a.id === articleId)
    if (hit) return hit
  }
  return undefined
}

function useLongPress(onLongPress: () => void, ms = 550) {
  const timer = useRef<number | null>(null)
  const clear = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }
  return {
    onPointerDown: () => {
      clear()
      timer.current = window.setTimeout(() => {
        timer.current = null
        onLongPress()
      }, ms)
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  }
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
  questionCount,
  inSet,
  onToggleSet,
  onPickMode,
  onClose,
}: {
  actId: ActId
  label: string
  stageId: string
  chapterIndex?: number
  questionCount: number
  inSet: boolean
  onToggleSet: () => void
  onPickMode: (mode: LearnMode) => void
  onClose: () => void
}) {
  void stageId
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" role="dialog" aria-modal>
      <button type="button" className="flex-1 cursor-default" aria-label="Zamknij" onClick={onClose} />
      <div className="rounded-t-3xl bg-paper px-5 pt-4 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <h2 className="font-serif text-[22px] font-semibold">{label}</h2>
        <p className="mt-1 text-[13px] text-muted">
          {questionCount === 0
            ? 'brak pytań — tylko przeczytaj'
            : `${questionCount} ${plural(questionCount, 'pytanie', 'pytania', 'pytań')} · bez blokad`}
        </p>
        {questionCount > 0 ? (
          <div className="mt-4">
            <ModeStartButtons onPick={onPickMode} />
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleSet}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-line text-[14px] font-semibold"
          >
            {inSet ? <Check className="size-4" /> : <Plus className="size-4" />}
            {inSet ? 'W zestawie' : 'Do zestawu'}
          </button>
          {chapterIndex !== undefined ? (
            <a
              href={href(`akt/${actId}/r/${chapterIndex}`)}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-sunk text-[14px] font-semibold"
            >
              <BookOpen className="size-4" /> Zobacz rozdział
            </a>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  )
}
