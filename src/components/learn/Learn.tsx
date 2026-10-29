import { ArrowLeft, Plus, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ActMeta, Article, LearnModule, UserStore } from '../../types'
import { ArticleBody } from '../article/ArticleBody'
import { ActBadge } from '../article/CrossRefPopover'
import { isDue, review, type Grade } from '../../lib/srs'
import {
  moduleProgress,
  resolveLearnModules,
  setProgress,
  upsertLearnModule,
} from '../../lib/storage'
import { cn } from '../../lib/cn'
import { segmentLegalText } from '../../lib/legal-highlight'
import { useToast } from '../ui/Toast'

type Props = {
  acts: ActMeta[]
  articles: Article[]
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
}

type Mode = 'tag' | 'which' | 'cloze'
const CLOZE_KINDS = new Set(['term', 'decision'])

export function Learn({ acts, articles, store, onStoreChange, onXref }: Props) {
  const toast = useToast()
  const modules = useMemo(() => resolveLearnModules(store), [store])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const active = modules.find((m) => m.id === activeId) ?? null

  if (active) {
    return (
      <Session
        module={active}
        acts={acts}
        articles={articles}
        store={store}
        onStoreChange={onStoreChange}
        onXref={onXref}
        onBack={() => setActiveId(null)}
      />
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 md:pb-10 md:pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ucz się</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-zinc-400">
            Moduły tematyczne z jasnym zakresem artykułów — nie losowy parser całej bazy.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-900"
        >
          <Plus className="h-4 w-4" /> Z tagów
        </button>
      </div>

      {creating && (
        <CreateFromTags
          store={store}
          onStoreChange={onStoreChange}
          onDone={(id) => {
            setCreating(false)
            setActiveId(id)
            toast.push('Utworzono moduł z tagów')
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="space-y-3">
        {modules.map((mod) => {
          const { pct, mastered, total } = moduleProgress(store, mod.articleIds)
          const started = mod.articleIds.some((id) => store.progress[id])
          return (
            <article
              key={mod.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {mod.actId && mod.actId !== 'both' && (
                      <ActBadge actId={mod.actId} acts={acts} />
                    )}
                    {mod.seeded && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                        <Sparkles className="h-3 w-3" /> seed
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">{mod.name}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{mod.purpose}</p>
                  <p className="mt-2 font-mono text-xs text-slate-400">
                    {total} art. · {mastered} „na blachę”
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveId(mod.id)}
                  className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {started ? 'Kontynuuj' : 'Start sesji'}
                </button>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function CreateFromTags({
  store,
  onStoreChange,
  onDone,
  onCancel,
}: {
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onDone: (id: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])

  function save() {
    if (!name.trim() || tagIds.length === 0) return
    const articleIds = [
      ...new Set(tagIds.flatMap((id) => store.tags.find((t) => t.id === id)?.articleIds ?? [])),
    ]
    if (articleIds.length === 0) return
    const id = `user_${crypto.randomUUID().slice(0, 8)}`
    const mod: LearnModule = {
      id,
      name: name.trim(),
      purpose: purpose.trim() || 'Moduł z Twoich tagów.',
      actId: 'both',
      articleIds,
      seeded: false,
      createdAt: new Date().toISOString(),
    }
    onStoreChange(upsertLearnModule(store, mod))
    onDone(id)
  }

  return (
    <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-stone-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
      <h2 className="font-semibold">Utwórz moduł z tagów</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nazwa modułu"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        placeholder="Jedno zdanie — po co"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <div className="max-h-40 space-y-1 overflow-auto">
        {store.tags.length === 0 ? (
          <p className="text-sm text-slate-500">Brak tagów — dodaj je w Moje.</p>
        ) : (
          store.tags.map((t) => (
            <label key={t.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tagIds.includes(t.id)}
                onChange={() =>
                  setTagIds((prev) =>
                    prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id],
                  )
                }
              />
              {t.label}{' '}
              <span className="font-mono text-xs text-slate-400">{t.articleIds.length} art.</span>
            </label>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!name.trim() || tagIds.length === 0}
          onClick={save}
          className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Utwórz
        </button>
        <button type="button" className="rounded-xl px-3 py-2 text-sm" onClick={onCancel}>
          Anuluj
        </button>
      </div>
    </div>
  )
}

function Session({
  module,
  acts,
  articles,
  store,
  onStoreChange,
  onXref,
  onBack,
}: {
  module: LearnModule
  acts: ActMeta[]
  articles: Article[]
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
  onBack: () => void
}) {
  const [mode, setMode] = useState<Mode>('tag')
  const [revealed, setRevealed] = useState(false)
  const [showFull, setShowFull] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [openedCloze, setOpenedCloze] = useState<Record<number, boolean>>({})
  const [guess, setGuess] = useState('')
  const [sessionDone, setSessionDone] = useState(0)

  const pool = useMemo(() => {
    const list = module.articleIds
      .map((id) => articles.find((a) => a.id === id))
      .filter(Boolean) as Article[]
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
  }, [module.articleIds, articles, store.progress])

  const sessionTotal = Math.min(12, Math.max(pool.length, 1))
  const card = pool.length ? pool[cursor % pool.length] : null
  const tagForCard = card
    ? store.tags.find((t) => t.articleIds.includes(card.id))
    : undefined

  const clozeSegments = useMemo(() => {
    if (!card) return []
    return segmentLegalText(card.excerpt || card.text.slice(0, 320))
  }, [card])

  const choices = useMemo(() => {
    if (!card) return []
    const others = pool
      .filter((a) => a.id !== card.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
    return [card, ...others].sort(() => Math.random() - 0.5)
  }, [card, pool, cursor])

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
      if (e.key === '1') grade('hard')
      if (e.key === '2') grade('good')
      if (e.key === '3') grade('easy')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function grade(g: Grade) {
    if (!card) return
    onStoreChange(setProgress(store, review(store.progress[card.id], card.id, g)))
    setSessionDone((n) => n + 1)
    setCursor((c) => c + 1)
  }

  const pos = (sessionDone % sessionTotal) + 1

  return (
    <section className="mx-auto flex min-h-[75vh] w-full max-w-2xl flex-col px-4 pb-36 pt-4 md:pb-16 md:pt-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" /> Katalog
        </button>
        <div className="text-right">
          <p className="text-sm font-semibold">{module.name}</p>
          <p className="text-xs text-slate-500">
            {pos} / {sessionTotal} w sesji
          </p>
        </div>
      </div>

      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${(pos / sessionTotal) * 100}%` }}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(
          [
            ['tag', 'Tag → przepis'],
            ['which', 'Który artykuł?'],
            ['cloze', 'Cloze'],
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
      </div>

      {!card ? (
        <div className="rounded-2xl border border-dashed border-rose-300 p-5 text-rose-800 dark:border-rose-900 dark:text-rose-200">
          <strong>brak w bazie</strong>
          <p className="text-sm">Brak artykułów w tym module (import / usunięte id).</p>
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

            {mode === 'tag' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">Przypomnij przepis dla zagadnienia:</p>
                <p className="text-xl font-semibold tracking-tight">
                  {tagForCard?.label ??
                    card.section ??
                    card.chapter ??
                    `Instytucja — ${acts.find((a) => a.id === card.actId)?.shortName}`}
                </p>
                {tagForCard?.note && <p className="text-sm text-slate-500">{tagForCard.note}</p>}
                {!revealed ? (
                  <p className="text-sm text-slate-400">Spacja lub „Pokaż odpowiedź”</p>
                ) : (
                  <ArticleBody article={card} plain onXref={(raw) => {
                    const m = raw.match(/art(?:ykuł|\.)?\s*(\d+[a-z]?)/i)
                    if (m) onXref(card.actId, m[1])
                  }} />
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
                  </p>
                )}
              </div>
            )}

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

            {(revealed || showFull) && showFull && (
              <div className="mt-4 border-t border-slate-100 pt-4 dark:border-zinc-800">
                <ArticleBody article={card} plain />
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              className="text-sm font-medium text-slate-600 dark:text-zinc-300"
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
                <GradeBtn label="Trudne" hint="1 · dziś" tone="rose" onClick={() => grade('hard')} />
                <GradeBtn label="Dobrze" hint="2 · dni" tone="amber" onClick={() => grade('good')} />
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
