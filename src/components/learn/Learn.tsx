import { useEffect, useMemo, useState } from 'react'
import type { ActMeta, Article, UserStore } from '../../types'
import { ArticleBody } from '../article/ArticleBody'
import { ActBadge } from '../article/CrossRefPopover'
import { isDue, review, type Grade } from '../../lib/srs'
import { setProgress } from '../../lib/storage'
import { cn } from '../../lib/cn'
import { segmentLegalText } from '../../lib/legal-highlight'

type Props = {
  acts: ActMeta[]
  articles: Article[]
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
}

type Mode = 'cloze' | 'tag' | 'which'

const CLOZE_KINDS = new Set(['term', 'decision'])

export function Learn({ acts, articles, store, onStoreChange, onXref }: Props) {
  const [mode, setMode] = useState<Mode>('which')
  const [actFilter, setActFilter] = useState<'all' | 'upea' | 'kpa'>('all')
  const [revealed, setRevealed] = useState(false)
  const [showFull, setShowFull] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [openedCloze, setOpenedCloze] = useState<Record<number, boolean>>({})
  const [guess, setGuess] = useState('')

  const pool = useMemo(() => {
    let list = actFilter === 'all' ? articles : articles.filter((a) => a.actId === actFilter)
    if (store.learnQueue.length) {
      const queued = store.learnQueue
        .map((id) => list.find((a) => a.id === id))
        .filter(Boolean) as Article[]
      if (queued.length) list = [...queued, ...list.filter((a) => !store.learnQueue.includes(a.id))]
    }
    if (mode === 'tag') {
      const taggedIds = new Set(store.tags.flatMap((t) => t.articleIds))
      const tagged = list.filter((a) => taggedIds.has(a.id))
      if (tagged.length) list = tagged
    }
    const scored = list.map((a) => {
      const p = store.progress[a.id]
      return { a, due: !p || isDue(p), unseen: !p, dueAt: p?.dueAt ?? '' }
    })
    scored.sort((x, y) => {
      if (x.due !== y.due) return x.due ? -1 : 1
      if (x.unseen !== y.unseen) return x.unseen ? -1 : 1
      return x.dueAt.localeCompare(y.dueAt)
    })
    return scored.map((s) => s.a)
  }, [articles, actFilter, store.progress, store.learnQueue, store.tags, mode])

  const todayDone = Object.values(store.progress).filter((p) => {
    if (!p.lastResult) return false
    const d = new Date(p.dueAt)
    // approximate: reviewed today if repetitions>0 and last update near now — use dueAt - interval
    return p.repetitions > 0 && Date.now() - (d.getTime() - p.intervalDays * 86400000) < 86400000
  }).length

  const card = pool.length ? pool[cursor % pool.length] : null
  const sessionTotal = Math.min(15, Math.max(pool.length, 1))
  const sessionPos = (cursor % sessionTotal) + 1

  const tagForCard = card
    ? store.tags.find((t) => t.articleIds.includes(card.id))
    : undefined

  const clozeSegments = useMemo(() => {
    if (!card) return []
    return segmentLegalText(card.excerpt || card.text.slice(0, 320))
  }, [card])

  useEffect(() => {
    setRevealed(false)
    setShowFull(false)
    setOpenedCloze({})
    setGuess('')
  }, [cursor, mode, card?.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        setRevealed(true)
        return
      }
      if (!revealed || !card) return
      if (e.key === '1') {
        onStoreChange(setProgress(store, review(store.progress[card.id], card.id, 'hard')))
        setCursor((c) => c + 1)
      }
      if (e.key === '2') {
        onStoreChange(setProgress(store, review(store.progress[card.id], card.id, 'good')))
        setCursor((c) => c + 1)
      }
      if (e.key === '3') {
        onStoreChange(setProgress(store, review(store.progress[card.id], card.id, 'easy')))
        setCursor((c) => c + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, card, store, onStoreChange])

  function grade(g: Grade) {
    if (!card) return
    onStoreChange(setProgress(store, review(store.progress[card.id], card.id, g)))
    setCursor((c) => c + 1)
  }

  const choices = useMemo(() => {
    if (!card) return []
    const others = pool
      .filter((a) => a.id !== card.id && a.actId === card.actId)
      .slice(0, 8)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
    return [card, ...others].sort(() => Math.random() - 0.5)
  }, [card, pool, cursor])

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col px-4 pb-36 pt-4 md:pb-16 md:pt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nauka</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            {sessionPos} / {sessionTotal} dzisiaj · zrobione ok. {todayDone}
          </p>
        </div>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(sessionPos / sessionTotal) * 100}%` }}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(
          [
            ['cloze', 'Cloze'],
            ['tag', 'Tag → przepis'],
            ['which', 'Który artykuł?'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium',
              mode === id
                ? 'border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                : 'border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900',
            )}
          >
            {label}
          </button>
        ))}
        {(['all', 'upea', 'kpa'] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={actFilter === id}
            onClick={() => setActFilter(id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm',
              actFilter === id
                ? 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'
                : 'border-slate-200 dark:border-zinc-800',
            )}
          >
            {id === 'all' ? 'Oba' : id === 'upea' ? 'u.p.e.a.' : 'Kpa'}
          </button>
        ))}
      </div>

      {!card ? (
        <div className="rounded-2xl border border-dashed border-rose-300 p-5 text-rose-800 dark:border-rose-900 dark:text-rose-200">
          <strong>brak w bazie</strong>
          <p className="text-sm">Brak artykułów do nauki w wybranym zakresie.</p>
        </div>
      ) : (
        <>
          <div
            key={`${card.id}-${mode}-${cursor}`}
            className="flex-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-3 flex items-center gap-2">
              <ActBadge actId={card.actId} acts={acts} />
              {mode !== 'which' && revealed && (
                <span className="font-mono text-lg font-bold">{card.label}</span>
              )}
            </div>

            {mode === 'cloze' && (
              <div className="max-w-2xl space-y-3 text-[15px] leading-relaxed">
                <p className="text-sm text-slate-500">Uzupełnij luki w cytacie z ustawy:</p>
                <p>
                  {clozeSegments.map((seg, i) => {
                    if (CLOZE_KINDS.has(seg.kind) && !openedCloze[i] && !revealed) {
                      return (
                        <button
                          key={i}
                          type="button"
                          className="mx-0.5 inline-flex min-w-[2.5rem] items-center justify-center rounded-md border border-dashed border-amber-400 bg-amber-50 px-2 py-0.5 font-mono text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
                          onClick={() => setOpenedCloze((o) => ({ ...o, [i]: true }))}
                        >
                          ?
                        </button>
                      )
                    }
                    return <span key={i}>{seg.value}</span>
                  })}
                </p>
              </div>
            )}

            {mode === 'tag' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">Przypomnij przepis dla zagadnienia:</p>
                <p className="text-xl font-semibold tracking-tight">
                  {tagForCard?.label ??
                    card.chapter ??
                    `Instytucja z ${acts.find((a) => a.id === card.actId)?.shortName}`}
                </p>
                {tagForCard?.note && (
                  <p className="text-sm text-slate-500">{tagForCard.note}</p>
                )}
                {!revealed ? (
                  <p className="text-sm text-slate-400">Spacja lub „Pokaż odpowiedź”</p>
                ) : (
                  <ArticleBody
                    article={{ ...card, blocks: card.blocks?.slice(0, 2) || card.blocks }}
                    onXref={(raw) => {
                      const m = raw.match(/art(?:ykuł|\.)?\s*(\d+[a-z]?)/i)
                      if (m) onXref(card.actId, m[1])
                    }}
                  />
                )}
              </div>
            )}

            {mode === 'which' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">Z którego artykułu pochodzi ten fragment?</p>
                <blockquote className="max-w-2xl border-l-2 border-amber-400 pl-4 text-[15px] leading-relaxed text-slate-800 dark:text-zinc-200">
                  {card.excerpt}
                </blockquote>
                {!revealed && (
                  <div className="space-y-2">
                    <div className="grid gap-2">
                      {choices.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-left font-mono text-sm hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          onClick={() => {
                            setGuess(c.label)
                            setRevealed(true)
                          }}
                        >
                          {acts.find((a) => a.id === c.actId)?.shortName} {c.label}
                        </button>
                      ))}
                    </div>
                    <input
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      placeholder="lub wpisz numer, np. 33"
                      className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setRevealed(true)
                      }}
                    />
                  </div>
                )}
                {revealed && (
                  <p className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    {acts.find((a) => a.id === card.actId)?.shortName} {card.label}
                    {guess &&
                      !guess.includes(card.number) &&
                      ` · Twoja odpowiedź: ${guess}`}
                  </p>
                )}
              </div>
            )}

            {(revealed || showFull) && showFull && (
              <div className="mt-4 border-t border-slate-100 pt-4 dark:border-zinc-800">
                <ArticleBody article={card} />
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              className="text-sm font-medium text-indigo-700 dark:text-indigo-300"
              onClick={() => setShowFull((v) => !v)}
            >
              {showFull ? 'Ukryj pełny kontekst' : 'Pokaż pełny kontekst artykułu'}
            </button>

            {!revealed ? (
              <button
                type="button"
                className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                onClick={() => setRevealed(true)}
              >
                Pokaż odpowiedź <span className="ml-2 font-mono text-xs opacity-70">Spacja</span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <GradeBtn
                  label="Trudne"
                  hint="1 · dziś"
                  tone="rose"
                  onClick={() => grade('hard')}
                />
                <GradeBtn
                  label="Dobrze"
                  hint="2 · dni"
                  tone="amber"
                  onClick={() => grade('good')}
                />
                <GradeBtn
                  label="Na blachę"
                  hint="3 · pamiętam"
                  tone="emerald"
                  onClick={() => grade('easy')}
                />
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function GradeBtn({
  label,
  hint,
  tone,
  onClick,
}: {
  label: string
  hint: string
  tone: 'rose' | 'amber' | 'emerald'
  onClick: () => void
}) {
  const tones = {
    rose: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100',
    amber:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100',
    emerald:
      'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('rounded-2xl border px-2 py-3 text-center', tones[tone])}
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="font-mono text-[10px] opacity-70">{hint}</div>
    </button>
  )
}
