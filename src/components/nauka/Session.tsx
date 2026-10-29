import { ArrowRight, BookOpen, Check, Layers, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import {
  applyAnswer,
  flashcardOutcome,
  gradeAnswer,
  gradeHint,
  sessionHref,
  type Grade,
  type LearnMode,
  type LearnState,
  type Question,
  type SessionItem,
  type SessionPlan,
  typeLabel,
} from '../../lib/learn-adapter'
import { markArticleRead } from '../../lib/storage'
import type { Library } from '../../lib/structure'
import { isActId } from '../../lib/structure'
import type { Article, UserStore } from '../../types'
import { LawText } from '../article/LawText'
import { ACT_META, Emblem, actClass } from '../shell/identity'
import { go, href } from '../shell/router'
import { SectionLabel } from '../shell/Shell'

const REASON_LABEL: Record<SessionItem['reason'], string> = {
  retry: 'Do poprawy',
  review: 'Powtórka',
  new: 'Nowe',
}

export function Session({
  title,
  plan,
  mode,
  learn,
  onLearnChange,
  store,
  onStoreChange,
  lib,
  exitTo,
}: {
  title: string
  plan: SessionPlan
  mode: LearnMode
  learn: LearnState
  onLearnChange: (next: LearnState) => void
  store: UserStore
  onStoreChange: (next: UserStore) => void
  lib: Library
  exitTo: string
}) {
  const items = plan.items
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [sheet, setSheet] = useState<Article | null>(null)
  const [tally, setTally] = useState({ ok: 0, bad: 0 })
  const [missed, setMissed] = useState<SessionItem[]>([])
  const item = items[idx]
  const finished = idx >= items.length

  function advance(correct: boolean, qItem: SessionItem) {
    setTally((t) => ({ ok: t.ok + (correct ? 1 : 0), bad: t.bad + (correct ? 0 : 1) }))
    if (!correct) setMissed((m) => [...m, qItem])
    setIdx((i) => i + 1)
    setRevealed(false)
    setSelected([])
    setChecked(false)
    window.scrollTo(0, 0)
  }

  function openProvision(q: Question) {
    const src = q.sources[0]
    if (!src) return
    const act = isActId(src.actId) ? lib.acts[src.actId] : undefined
    const article = act?.byNumber.get(src.articleNumber) ?? act?.articles.find((a) => a.id === src.articleId)
    if (!article) return
    onStoreChange(markArticleRead(store, article.id))
    setSheet(article)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!item || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const asFlash = item.presentAs === 'flashcard'
      if (e.key === ' ' && asFlash && !revealed) {
        e.preventDefault()
        setRevealed(true)
      }
      if (asFlash && revealed) {
        if (e.key === '1') gradeFlash('again')
        if (e.key === '2') gradeFlash('hard')
        if (e.key === '3') gradeFlash('good')
        if (e.key === '4') gradeFlash('easy')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function gradeFlash(g: Grade) {
    if (!item) return
    const outcome = flashcardOutcome(g)
    onLearnChange(applyAnswer(learn, item.question, outcome))
    advance(outcome.correct, item)
  }

  function submitTest() {
    if (!item || !selected.length) return
    const result = gradeAnswer(item.question, selected)
    setChecked(true)
    onLearnChange(applyAnswer(learn, item.question, { correct: result.correct, selected }))
  }

  function continueAfterTest() {
    if (!item) return
    const result = gradeAnswer(item.question, selected)
    advance(result.correct, item)
  }

  if (!items.length)
    return (
      <Frame title={title} exitTo={exitTo} progress={1} label="">
        <div className="mt-16 text-center">
          <div className="font-serif text-[24px] font-semibold">Nic do zrobienia</div>
          <p className="mt-2 text-muted">Brak pytań w tym zakresie. Wybierz inny rozdział albo tryb.</p>
          <a href={href(exitTo)} className="mt-6 inline-flex rounded-2xl bg-ink px-5 py-3 font-semibold text-paper">
            Wróć do Nauki
          </a>
        </div>
      </Frame>
    )

  if (finished)
    return (
      <Frame title={title} exitTo={exitTo} progress={1} label={`${items.length}/${items.length}`}>
        <div className="mt-12 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-gold text-black">
            <Check className="size-8" strokeWidth={2.6} />
          </div>
          <h1 className="mt-5 font-serif text-[28px] font-semibold">
            {tally.ok} z {items.length} dobrze
          </h1>
          <p className="mt-2 text-muted">
            {mode === 'flashcards' ? 'Fiszki' : mode === 'test' ? 'Test' : 'Sesja'} · błędy: {tally.bad}
          </p>
          {missed.length > 0 && (
            <ul className="mt-6 space-y-2 text-left">
              {missed.map((m) => (
                <li key={m.question.id} className="rounded-2xl border border-line bg-surface px-4 py-3">
                  <div className="text-[13px] font-medium">{m.question.prompt}</div>
                  <div className="mt-1 text-[12.5px] text-muted">{m.question.answer}</div>
                  {m.question.sources[0] && (
                    <button
                      type="button"
                      onClick={() => openProvision(m.question)}
                      className="mt-2 text-[13px] font-semibold text-act"
                    >
                      zobacz przepis
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {missed.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  go(
                    sessionHref({
                      mode,
                      actId: plan.actId && isActId(plan.actId) ? plan.actId : undefined,
                      mistakesOnly: true,
                    }),
                  )
                }
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-sunk px-6 text-[15px] font-semibold"
              >
                Jeszcze raz błędy
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                go(
                  sessionHref({
                    mode,
                    actId: plan.actId && isActId(plan.actId) ? plan.actId : undefined,
                  }),
                )
              }
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-ink px-6 text-[15px] font-semibold text-paper"
            >
              Kolejna sesja
            </button>
            <button
              type="button"
              onClick={() => go(exitTo)}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-line px-6 text-[15px] font-semibold"
            >
              Koniec
            </button>
          </div>
        </div>
        {sheet && <ProvisionSheet article={sheet} onClose={() => setSheet(null)} />}
      </Frame>
    )

  const q = item.question
  const asFlash = item.presentAs === 'flashcard'
  const actShort = isActId(q.actId) ? ACT_META[q.actId].short : q.actId
  const result = checked ? gradeAnswer(q, selected) : null

  return (
    <Frame title={title} exitTo={exitTo} progress={idx / items.length} label={`${idx + 1}/${items.length}`}>
      <div className={actClass(q.actId)}>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] font-semibold">
          <span className="rounded-full bg-act-tint px-2.5 py-1 text-act-ink">{typeLabel(q.type)}</span>
          <span className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-ink-2">
            <Emblem act={q.actId} className="size-3.5 text-act" /> {actShort}
          </span>
          <span className="rounded-full border border-line px-2.5 py-1 text-muted">{REASON_LABEL[item.reason]}</span>
          {asFlash && (
            <span className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-muted">
              <Layers className="size-3" /> Fiszka
            </span>
          )}
        </div>

        <h1 className="mt-4 font-serif text-[22px] leading-[1.3] font-semibold tracking-tight md:text-[24px]">{q.prompt}</h1>
        {q.context && (
          <blockquote className="law mt-4 rounded-2xl bg-sunk p-4 text-[15.5px] leading-[1.55]">{q.context}</blockquote>
        )}

        {asFlash ? (
          <>
            {!revealed ? (
              <div className="mt-6 rounded-2xl border border-dashed border-line p-5 text-[14px] leading-relaxed text-muted">
                Odpowiedz w myślach. Potem odsłoń i oceń się uczciwie — od tego zależy, kiedy pytanie wróci.
              </div>
            ) : (
              <FlashBack q={q} onProvision={() => openProvision(q)} />
            )}
          </>
        ) : (
          <TestOptions
            q={q}
            selected={selected}
            checked={checked}
            onToggle={(id) => {
              if (checked) return
              if (q.format === 'multiple') {
                setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
              } else {
                setSelected([id])
              }
            }}
          />
        )}

        {checked && result && (
          <div className="mt-5">
            <div
              className={cn(
                'rounded-2xl px-4 py-3 text-[14.5px] font-semibold',
                result.correct
                  ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                  : 'bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-100',
              )}
            >
              {result.correct ? 'Dobrze' : 'Jeszcze raz'} — {q.answer}
            </div>
            {q.sources[0] && (
              <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
                <SectionLabel className="mb-2">Podstawa</SectionLabel>
                <p className="law text-[14.5px] leading-relaxed">{q.sources[0].quote}</p>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <span className="text-[12.5px] font-semibold text-act">{q.sources[0].citation}</span>
                  <button type="button" onClick={() => openProvision(q)} className="text-[13px] font-semibold">
                    zobacz przepis
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="h-28" />
        <div className="fixed inset-x-0 bottom-0 z-20 bg-paper/90 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] backdrop-blur md:static md:mt-6 md:bg-transparent md:px-0">
          <div className="mx-auto max-w-2xl">
            {asFlash && !revealed && (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="h-14 w-full rounded-2xl bg-ink text-[16px] font-semibold text-paper"
              >
                Pokaż odpowiedź
              </button>
            )}
            {asFlash && revealed && (
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ['again', 'Nie pamiętam', 'bg-sunk text-ink'],
                    ['hard', 'Trudne', 'bg-sunk text-ink'],
                    ['good', 'Dobrze', 'bg-gold-tint text-ink'],
                    ['easy', 'Łatwe', 'bg-ink text-paper'],
                  ] as const
                ).map(([g, l, c]) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => gradeFlash(g)}
                    className={cn('flex h-14 flex-col items-center justify-center rounded-2xl px-1', c)}
                  >
                    <span className="text-[12.5px] font-semibold leading-tight">{l}</span>
                    <span className="text-[10.5px] opacity-60">{gradeHint(learn, q, g)}</span>
                  </button>
                ))}
              </div>
            )}
            {!asFlash && !checked && (
              <button
                type="button"
                disabled={!selected.length}
                onClick={submitTest}
                className={cn(
                  'flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold',
                  selected.length ? 'bg-ink text-paper' : 'bg-sunk text-muted',
                )}
              >
                Sprawdź
              </button>
            )}
            {!asFlash && checked && (
              <button
                type="button"
                onClick={continueAfterTest}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-[16px] font-semibold text-paper"
              >
                Dalej <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      {sheet && <ProvisionSheet article={sheet} onClose={() => setSheet(null)} />}
    </Frame>
  )
}

function FlashBack({ q, onProvision }: { q: Question; onProvision: () => void }) {
  return (
    <div className="mt-6">
      <SectionLabel className="mb-2">Odpowiedź</SectionLabel>
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="text-[16px] font-semibold">{q.answer}</div>
        {q.options && q.options.some((o) => o.correct) && (
          <ul className="mt-3 space-y-1.5 text-[14px] text-ink-2">
            {q.options
              .filter((o) => o.correct)
              .map((o) => (
                <li key={o.id} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
                  <span>{o.text}</span>
                </li>
              ))}
          </ul>
        )}
        {q.sources[0] && (
          <>
            <p className="law mt-4 border-t border-line pt-3 text-[14px] leading-relaxed text-muted">{q.sources[0].quote}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[12.5px] font-semibold text-act">{q.sources[0].citation}</span>
              <button type="button" onClick={onProvision} className="inline-flex items-center gap-1 text-[13px] font-semibold">
                <BookOpen className="size-3.5" /> zobacz przepis
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TestOptions({
  q,
  selected,
  checked,
  onToggle,
}: {
  q: Question
  selected: string[]
  checked: boolean
  onToggle: (id: string) => void
}) {
  const options = q.options ?? []
  const multi = q.format === 'multiple'
  return (
    <div className="mt-4 space-y-2.5">
      {multi && <p className="text-[12.5px] text-muted">Zaznacz wszystkie poprawne.</p>}
      {options.map((o, i) => {
        const isSel = selected.includes(o.id)
        const cls =
          !checked
            ? isSel
              ? 'border-ink bg-sunk'
              : 'border-line bg-surface'
            : o.correct
              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100'
              : isSel
                ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                : 'border-line bg-surface opacity-50'
        return (
          <button
            key={o.id}
            type="button"
            disabled={checked}
            onClick={() => onToggle(o.id)}
            className={cn('flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left', cls)}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-current/20 font-mono text-[12px]">
              {checked && o.correct ? <Check className="size-4" strokeWidth={3} /> : multi ? (isSel ? '☑' : '☐') : 'ABCD'[i]}
            </span>
            <span className="min-w-0 pt-0.5 text-[15px] leading-snug">{o.text}</span>
          </button>
        )
      })}
    </div>
  )
}

function ProvisionSheet({ article, onClose }: { article: Article; onClose: () => void }) {
  const actShort = isActId(article.actId) ? ACT_META[article.actId].short : article.actId
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" role="dialog" aria-modal>
      <button type="button" className="flex-1 cursor-default" aria-label="Zamknij" onClick={onClose} />
      <div className={cn(actClass(article.actId), 'max-h-[78dvh] overflow-auto rounded-t-3xl bg-paper px-5 pt-4 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl')}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold text-act">{actShort}</div>
            <h2 className="font-serif text-[22px] font-semibold">{article.label}</h2>
            {article.title && <div className="text-[14px] text-ink-2">{article.title}</div>}
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-sunk" aria-label="Zamknij przepis">
            <X className="size-5" />
          </button>
        </div>
        <LawText article={article} className="mt-4" size="md" />
        <a href={href(`art/${article.id}`)} className="mt-4 inline-flex text-[13px] font-semibold">
          Otwórz w czytniku <ArrowRight className="ml-1 size-3.5" />
        </a>
      </div>
    </div>
  )
}

function Frame({
  title,
  exitTo,
  progress,
  label,
  children,
}: {
  title: string
  exitTo: string
  progress: number
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col px-5 md:px-8">
      <div className="sticky top-0 z-20 -mx-5 flex h-14 items-center gap-3 bg-paper/90 px-5 backdrop-blur md:-mx-8 md:px-8">
        <a href={href(exitTo)} aria-label="Zakończ sesję" className="-ml-2 grid size-10 place-items-center rounded-full text-muted">
          <X className="size-6" strokeWidth={1.8} />
        </a>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-sunk" title={title}>
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="text-[13px] font-semibold text-muted tabular-nums">{label}</span>
      </div>
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </div>
  )
}

export function useSessionTitle(plan: SessionPlan, mode: LearnMode) {
  return useMemo(() => {
    const modeLabel = mode === 'flashcards' ? 'Fiszki' : mode === 'test' ? 'Test' : 'Trening'
    if (plan.stage) return `${modeLabel} · ${plan.stage.label}`
    return modeLabel
  }, [plan.stage, mode])
}
