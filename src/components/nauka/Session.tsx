import { ArrowRight, Check, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { learnEngine, type Grade, type LearnCard } from '../../lib/learn-adapter'
import { chapterLabel, isActId } from '../../lib/structure'
import type { UserStore } from '../../types'
import { LawText } from '../article/LawText'
import { ACT_META, Emblem, actClass } from '../shell/identity'
import { go, href } from '../shell/router'
import { SectionLabel } from '../shell/Shell'

function when(days: number) {
  if (days <= 0) return 'dziś'
  if (days === 1) return 'jutro'
  return `za ${days} dni`
}

const KIND_LABEL: Record<LearnCard['kind'], string> = {
  poznaj: 'Nowy przepis',
  przypomnij: 'Przypomnij sobie',
  ktory: 'Który przepis?',
}

export function Session({
  title,
  cards,
  store,
  onStoreChange,
  onXref,
  exitTo,
}: {
  title: string
  cards: LearnCard[]
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
  exitTo: string
}) {
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [choice, setChoice] = useState<number | null>(null)
  const [tally, setTally] = useState({ fresh: 0, known: 0, again: 0 })
  const card = cards[idx]
  const finished = idx >= cards.length

  function grade(g: Grade) {
    if (!card) return
    onStoreChange(learnEngine.grade(store, card, g))
    setTally((t) => ({
      fresh: t.fresh + (card.isReview ? 0 : 1),
      known: t.known + (card.isReview && g !== 'hard' ? 1 : 0),
      again: t.again + (g === 'hard' ? 1 : 0),
    }))
    setIdx((i) => i + 1)
    setRevealed(false)
    setChoice(null)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card || e.target instanceof HTMLInputElement) return
      if (e.key === ' ' && card.kind === 'przypomnij' && !revealed) {
        e.preventDefault()
        setRevealed(true)
      }
      if (card.kind === 'przypomnij' && revealed) {
        if (e.key === '1') grade('hard')
        if (e.key === '2') grade('good')
        if (e.key === '3') grade('easy')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!cards.length)
    return (
      <Frame title={title} exitTo={exitTo} progress={1} label="">
        <div className="mt-16 text-center">
          <div className="font-serif text-[24px] font-semibold">Nic do zrobienia</div>
          <p className="mt-2 text-muted">Ten etap nie ma teraz kart. Wróć do ścieżki.</p>
          <a href={href(exitTo)} className="mt-6 inline-flex rounded-2xl bg-ink px-5 py-3 font-semibold text-paper">
            Wróć do Nauki
          </a>
        </div>
      </Frame>
    )

  if (finished)
    return (
      <Frame title={title} exitTo={exitTo} progress={1} label={`${cards.length}/${cards.length}`}>
        <div className="mt-12 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-gold text-black">
            <Check className="size-8" strokeWidth={2.6} />
          </div>
          <h1 className="mt-5 font-serif text-[28px] font-semibold">Sesja zakończona</h1>
          <p className="mt-2 text-muted">
            {cards.length} kart · nowe: {tally.fresh} · utrwalone: {tally.known} · do powtórki: {tally.again}
          </p>
          <button
            type="button"
            onClick={() => go(exitTo)}
            className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-ink px-8 text-[16px] font-semibold text-paper"
          >
            Wróć do ścieżki
          </button>
        </div>
      </Frame>
    )

  const a = card.article
  const actShort = isActId(a.actId) ? ACT_META[a.actId].short : a.actId
  const xref = (raw: string) => {
    const m = raw.match(/art(?:ykuł|\.)?\s*(\d+[a-z]*)/i)
    if (m) onXref(a.actId, m[1])
  }
  const quizAnswered = card.kind === 'ktory' && choice !== null
  const correct = quizAnswered && !!card.options?.[choice!]?.correct

  return (
    <Frame title={title} exitTo={exitTo} progress={idx / cards.length} label={`${idx + 1}/${cards.length}`}>
      <div className={actClass(a.actId)}>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] font-semibold">
          <span className="rounded-full bg-act-tint px-2.5 py-1 text-act-ink">{KIND_LABEL[card.kind]}</span>
          <span className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-ink-2">
            <Emblem act={a.actId} className="size-3.5 text-act" /> {actShort}
          </span>
          {card.isReview && <span className="rounded-full border border-line px-2.5 py-1 text-muted">powtórka</span>}
        </div>
        <div className="mt-4 text-[12.5px] text-muted">
          {chapterLabel(card.chapter)} · {card.chapter.title}
        </div>

        {card.kind === 'poznaj' && (
          <>
            <h1 className="mt-1 font-serif text-[30px] leading-tight font-semibold tracking-tight">{a.label}</h1>
            {a.title && <div className="mt-1.5 text-[17px] font-semibold text-ink-2">{a.title}</div>}
            {card.tagLabel && <TagHint label={card.tagLabel} />}
            <div className="mt-5 rounded-2xl border border-line bg-surface p-4 pl-5 shadow-[inset_4px_0_0_var(--act)]">
              <LawText article={a} size="md" onXref={xref} />
            </div>
            <p className="mt-3 text-[12.5px] text-muted">Przeczytaj spokojnie. Ten przepis wróci jako pytanie.</p>
          </>
        )}

        {card.kind === 'przypomnij' && (
          <>
            <h1 className="mt-1 font-serif text-[24px] leading-[1.3] font-semibold tracking-tight">
              Co stanowi {a.label.toLowerCase()} {actShort}?
            </h1>
            {a.title && <div className="mt-1.5 text-[16px] font-medium text-ink-2">„{a.title}”</div>}
            {card.tagLabel && <TagHint label={card.tagLabel} />}
            {!revealed ? (
              <div className="mt-6 rounded-2xl border border-dashed border-line p-5 text-[14px] leading-relaxed text-muted">
                Odpowiedz w myślach albo na głos. Potem odsłoń przepis i oceń się uczciwie — od tego zależy, kiedy
                karta wróci.
              </div>
            ) : (
              <Answer card={card} xref={xref} />
            )}
          </>
        )}

        {card.kind === 'ktory' && (
          <>
            <h1 className="mt-1 font-serif text-[22px] leading-[1.3] font-semibold tracking-tight">
              Który przepis tak stanowi?
            </h1>
            <blockquote className="law mt-4 rounded-2xl bg-sunk p-4 text-[16px] leading-[1.55]">
              {card.fragment}
            </blockquote>
            <div className="mt-4 space-y-2.5">
              {card.options!.map((o, i) => {
                const cls =
                  choice === null
                    ? 'border-line bg-surface'
                    : o.correct
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100'
                      : choice === i
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                        : 'border-line bg-surface opacity-50'
                return (
                  <button
                    key={o.article.id}
                    type="button"
                    disabled={choice !== null}
                    onClick={() => setChoice(i)}
                    className={cn('flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left', cls)}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-current/20 font-mono text-[12px]">
                      {choice !== null && o.correct ? <Check className="size-4" strokeWidth={3} /> : 'ABCD'[i]}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-serif text-[16px] font-semibold">{o.article.label}</span>
                      {o.article.title && <span className="block truncate text-[13.5px] opacity-75">{o.article.title}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
            {quizAnswered && <Answer card={card} xref={xref} />}
          </>
        )}

        <div className="h-28" />
        <div className="fixed inset-x-0 bottom-0 z-20 bg-paper/90 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] backdrop-blur md:static md:mt-6 md:bg-transparent md:px-0">
          <div className="mx-auto max-w-2xl">
            {card.kind === 'poznaj' && (
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <button type="button" onClick={() => grade('easy')} className="h-14 rounded-2xl bg-sunk text-[15px] font-semibold">
                  Znam to
                </button>
                <button
                  type="button"
                  onClick={() => grade('good')}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink text-[16px] font-semibold text-paper"
                >
                  Dalej <ArrowRight className="size-4" />
                </button>
              </div>
            )}
            {card.kind === 'przypomnij' && !revealed && (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="h-14 w-full rounded-2xl bg-ink text-[16px] font-semibold text-paper"
              >
                Pokaż odpowiedź
              </button>
            )}
            {card.kind === 'przypomnij' && revealed && (
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['hard', 'Nie wiem', 'bg-sunk text-ink'],
                    ['good', 'Częściowo', 'bg-gold-tint text-ink'],
                    ['easy', 'Umiem', 'bg-ink text-paper'],
                  ] as const
                ).map(([g, l, c]) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => grade(g)}
                    className={cn('flex h-14 flex-col items-center justify-center rounded-2xl', c)}
                  >
                    <span className="text-[15px] font-semibold">{l}</span>
                    <span className="text-[11px] opacity-60">{when(learnEngine.nextIntervalDays(store, card, g))}</span>
                  </button>
                ))}
              </div>
            )}
            {card.kind === 'ktory' && (
              <button
                type="button"
                disabled={!quizAnswered}
                onClick={() => grade(correct ? 'good' : 'hard')}
                className={cn(
                  'flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold',
                  quizAnswered ? 'bg-ink text-paper' : 'bg-sunk text-muted',
                )}
              >
                {quizAnswered ? (
                  <>
                    Dalej <ArrowRight className="size-4" />
                  </>
                ) : (
                  'Wybierz odpowiedź'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Frame>
  )
}

function TagHint({ label }: { label: string }) {
  return (
    <div className="mt-2 inline-flex rounded-full bg-gold-tint px-2.5 py-0.5 text-[12.5px] font-medium text-ink-2">
      Twój tag: #{label}
    </div>
  )
}

function Answer({ card, xref }: { card: LearnCard; xref: (raw: string) => void }) {
  const a = card.article
  return (
    <div className="mt-6">
      <SectionLabel className="mb-2">Odpowiedź z ustawy</SectionLabel>
      <div className="rounded-2xl border border-line bg-surface p-4 pl-5 shadow-[inset_4px_0_0_var(--act)]">
        <LawText article={a} size="md" onXref={xref} />
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="text-[12.5px] font-semibold text-act">
            {a.label.toLowerCase()} {isActId(a.actId) ? ACT_META[a.actId].short : ''}
            {a.title ? ` · ${a.title}` : ''}
          </span>
          <a href={href(`art/${a.id}`)} className="flex shrink-0 items-center gap-1 text-[13px] font-semibold">
            W czytniku <ArrowRight className="size-3.5" />
          </a>
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
