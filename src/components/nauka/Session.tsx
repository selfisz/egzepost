import { ArrowRight, Check, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import {
  answerFlashcard,
  answerTest,
  previewIntervalDays,
  readLearnState,
  type Grade,
  type LearnMode,
  type PlannedSession,
  type Question,
} from '../../lib/learn-adapter'
import { markArticleRead } from '../../lib/storage'
import { isActId } from '../../lib/structure'
import type { UserStore } from '../../types'
import { ACT_META, Emblem, actClass } from '../shell/identity'
import { go, href } from '../shell/router'
import { SectionLabel } from '../shell/Shell'

function when(days: number) {
  if (days <= 0) return 'dziś'
  if (days === 1) return 'jutro'
  return `za ${days} dni`
}

const REASON_LABEL = { retry: 'Poprawka', review: 'Powtórka', new: 'Nowe' } as const

export function Session({
  plan,
  store,
  onStoreChange,
  onXref,
  exitTo,
}: {
  plan: PlannedSession
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
  exitTo: string
}) {
  const items = plan.items
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [graded, setGraded] = useState<{ correct: boolean; correctIds: string[] } | null>(null)
  const [tally, setTally] = useState({ ok: 0, bad: 0 })
  const [learnState, setLearnState] = useState(() => readLearnState())
  const [sheetArticleId, setSheetArticleId] = useState<string | null>(null)

  const item = items[idx]
  const finished = idx >= items.length
  const presentAs = item?.presentAs
  const q = item?.question

  function advance() {
    setIdx((i) => i + 1)
    setRevealed(false)
    setSelected([])
    setGraded(null)
    setSheetArticleId(null)
    window.scrollTo(0, 0)
  }

  function submitTest() {
    if (!q || graded) return
    const { state, correct, result } = answerTest(learnState, q, selected)
    setLearnState(state)
    setGraded({ correct, correctIds: result.correctIds })
    setTally((t) => ({ ok: t.ok + (correct ? 1 : 0), bad: t.bad + (correct ? 0 : 1) }))
  }

  function submitFlash(g: Grade) {
    if (!q) return
    const next = answerFlashcard(learnState, q, g)
    setLearnState(next)
    setTally((t) => ({
      ok: t.ok + (g === 'again' ? 0 : 1),
      bad: t.bad + (g === 'again' ? 1 : 0),
    }))
    advance()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (presentAs === 'flashcard') {
        if (e.key === ' ' && !revealed) {
          e.preventDefault()
          setRevealed(true)
        }
        if (revealed) {
          if (e.key === '1') submitFlash('again')
          if (e.key === '2') submitFlash('hard')
          if (e.key === '3') submitFlash('good')
          if (e.key === '4') submitFlash('easy')
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function openPrzepis(articleId: string) {
    setSheetArticleId(articleId)
    onStoreChange(markArticleRead(store, articleId))
  }

  if (!items.length)
    return (
      <Frame title={plan.title} exitTo={exitTo} progress={1} label="">
        <div className="mt-16 text-center">
          <div className="font-serif text-[24px] font-semibold">Nic do zrobienia</div>
          <p className="mt-2 text-muted">W tym zakresie nie ma teraz pytań. Wybierz inny rozdział albo wróć później.</p>
          <a href={href(exitTo)} className="mt-6 inline-flex rounded-2xl bg-ink px-5 py-3 font-semibold text-paper">
            Wróć do Nauki
          </a>
        </div>
      </Frame>
    )

  if (finished)
    return (
      <Frame title={plan.title} exitTo={exitTo} progress={1} label={`${items.length}/${items.length}`}>
        <div className="mt-12 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-gold text-black">
            <Check className="size-8" strokeWidth={2.6} />
          </div>
          <h1 className="mt-5 font-serif text-[28px] font-semibold">Sesja zakończona</h1>
          <p className="mt-2 text-muted">
            {tally.ok} dobrze · {tally.bad} do poprawy · {items.length} pytań
          </p>
          <div className="mt-8 flex flex-col items-center gap-2">
            {tally.bad > 0 && (
              <a
                href={href(`nauka/sesja?tryb=${plan.mode}&bledy=1${plan.actId ? `&akt=${plan.actId}` : ''}`)}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-line bg-surface px-6 text-[15px] font-semibold"
              >
                Jeszcze raz błędy
              </a>
            )}
            <button
              type="button"
              onClick={() => go(exitTo)}
              className="inline-flex h-14 items-center justify-center rounded-2xl bg-ink px-8 text-[16px] font-semibold text-paper"
            >
              Koniec
            </button>
          </div>
        </div>
      </Frame>
    )

  const actShort = isActId(q!.actId) ? ACT_META[q!.actId].short : q!.actId
  const source = q!.sources[0]

  return (
    <Frame title={plan.title} exitTo={exitTo} progress={idx / items.length} label={`${idx + 1}/${items.length}`}>
      <div className={actClass(q!.actId)}>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] font-semibold">
          <span className="rounded-full bg-act-tint px-2.5 py-1 text-act-ink">
            {presentAs === 'flashcard' ? 'Fiszka' : q!.format === 'multiple' ? 'Wielokrotny wybór' : 'Test'}
          </span>
          <span className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-ink-2">
            <Emblem act={q!.actId} className="size-3.5 text-act" /> {actShort}
          </span>
          <span className="rounded-full border border-line px-2.5 py-1 text-muted">{REASON_LABEL[item!.reason]}</span>
        </div>

        <h1 className="mt-4 font-serif text-[22px] leading-[1.3] font-semibold tracking-tight">{q!.prompt}</h1>
        {q!.context && (
          <blockquote className="law mt-3 rounded-2xl bg-sunk p-4 text-[15.5px] leading-[1.55] whitespace-pre-wrap">
            {q!.context}
          </blockquote>
        )}

        {presentAs !== 'flashcard' && q!.options && (
          <OptionList
            question={q!}
            selected={selected}
            graded={graded}
            onToggle={(id) => {
              if (graded) return
              if (q!.format === 'multiple') {
                setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
              } else {
                setSelected([id])
              }
            }}
          />
        )}

        {presentAs === 'flashcard' && !revealed && (
          <div className="mt-6 rounded-2xl border border-dashed border-line p-5 text-[14px] leading-relaxed text-muted">
            Odpowiedz w myślach. Potem odsłoń i oceń się uczciwie — od tego zależy, kiedy pytanie wróci.
          </div>
        )}

        {(presentAs === 'flashcard' ? revealed : !!graded) && (
          <Feedback
            question={q!}
            citation={source?.citation}
            quote={source?.quote}
            onOpen={() => source && openPrzepis(source.articleId)}
            onXref={onXref}
          />
        )}

        <div className="h-28" />
        <div className="fixed inset-x-0 bottom-0 z-20 bg-paper/90 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] backdrop-blur md:static md:mt-6 md:bg-transparent md:px-0">
          <div className="mx-auto max-w-2xl">
            {presentAs === 'flashcard' && !revealed && (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="h-14 w-full rounded-2xl bg-ink text-[16px] font-semibold text-paper"
              >
                Pokaż odpowiedź
              </button>
            )}
            {presentAs === 'flashcard' && revealed && (
              <div className="grid grid-cols-4 gap-1.5">
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
                    onClick={() => submitFlash(g)}
                    className={cn('flex h-14 flex-col items-center justify-center rounded-2xl px-1', c)}
                  >
                    <span className="text-[12.5px] leading-tight font-semibold">{l}</span>
                    <span className="text-[10.5px] opacity-60">{when(previewIntervalDays(learnState, q!.id, g))}</span>
                  </button>
                ))}
              </div>
            )}
            {presentAs !== 'flashcard' && !graded && (
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
            {presentAs !== 'flashcard' && graded && (
              <button
                type="button"
                onClick={advance}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-[16px] font-semibold text-paper"
              >
                Dalej <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {sheetArticleId && (
        <PrzepisSheet
          articleId={sheetArticleId}
          onClose={() => setSheetArticleId(null)}
          onOpenFull={() => go(`art/${sheetArticleId}`)}
        />
      )}
    </Frame>
  )
}

function OptionList({
  question,
  selected,
  graded,
  onToggle,
}: {
  question: Question
  selected: string[]
  graded: { correct: boolean; correctIds: string[] } | null
  onToggle: (id: string) => void
}) {
  const multi = question.format === 'multiple'
  return (
    <div className="mt-4 space-y-2.5">
      {multi && !graded && (
        <p className="text-[12.5px] text-muted">Zaznacz wszystkie poprawne odpowiedzi.</p>
      )}
      {question.options!.map((o, i) => {
        const isSel = selected.includes(o.id)
        const isCorrect = graded?.correctIds.includes(o.id)
        const cls =
          !graded
            ? isSel
              ? 'border-ink bg-sunk'
              : 'border-line bg-surface'
            : isCorrect
              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100'
              : isSel
                ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                : 'border-line bg-surface opacity-50'
        return (
          <button
            key={o.id}
            type="button"
            disabled={!!graded}
            onClick={() => onToggle(o.id)}
            className={cn('flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left', cls)}
          >
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-current/20 font-mono text-[12px]">
              {graded && isCorrect ? <Check className="size-4" strokeWidth={3} /> : multi ? (isSel ? '✓' : '○') : 'ABCD'[i]}
            </span>
            <span className="min-w-0 text-[15px] leading-snug">{o.text}</span>
          </button>
        )
      })}
    </div>
  )
}

function Feedback({
  question,
  citation,
  quote,
  onOpen,
  onXref,
}: {
  question: Question
  citation?: string
  quote?: string
  onOpen: () => void
  onXref: (actId: string, number: string) => void
}) {
  void onXref
  return (
    <div className="mt-6">
      <SectionLabel className="mb-2">Odpowiedź</SectionLabel>
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-[inset_4px_0_0_var(--act)]">
        <div className="whitespace-pre-wrap text-[15.5px] leading-relaxed font-medium">{question.answer}</div>
        {(quote || citation) && (
          <>
            <div className="mt-3 border-t border-line pt-3">
              <div className="text-[11.5px] font-semibold tracking-wider text-muted uppercase">Podstawa</div>
              {citation && <div className="mt-1 text-[13px] font-semibold text-act">{citation}</div>}
              {quote && <p className="law mt-1.5 text-[14px] leading-snug text-ink-2">„{quote}”</p>}
            </div>
          </>
        )}
        <button
          type="button"
          onClick={onOpen}
          className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-semibold"
        >
          Zobacz przepis <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function PrzepisSheet({
  articleId,
  onClose,
  onOpenFull,
}: {
  articleId: string
  onClose: () => void
  onOpenFull: () => void
}) {
  // Lightweight: deep-link into the reader rather than embedding full LawText here —
  // keeps the session module free of article-data wiring; sheet offers one-tap open.
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[max(env(safe-area-inset-bottom),16px)]"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-[24px] bg-paper p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="font-serif text-[20px] font-semibold">Zobacz przepis</div>
        <p className="mt-1 text-[13.5px] text-muted">
          Otwórz artykuł w czytniku. Po powrocie (wstecz) wrócisz do tej samej karty sesji.
        </p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={onOpenFull}
            className="flex h-12 items-center justify-center rounded-2xl bg-ink text-[15px] font-semibold text-paper"
          >
            Otwórz {articleId.split(':')[1] ? `art. ${articleId.split(':')[1]}` : 'przepis'}
          </button>
          <button type="button" onClick={onClose} className="h-11 text-[14px] text-muted">
            Zostań w sesji
          </button>
        </div>
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

export function modeLabel(mode: LearnMode) {
  return mode === 'flashcards' ? 'Fiszki' : mode === 'test' ? 'Test' : 'Trening'
}
