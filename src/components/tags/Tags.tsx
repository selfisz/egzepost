import { Download, Upload } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ActMeta, Article, TagCategory, UserStore, UserTag } from '../../types'
import { ArticleCard } from '../article/ArticleCard'
import {
  deleteTag,
  exportStoreJson,
  importStoreJson,
  newTagId,
  upsertTag,
} from '../../lib/storage'
import { useToast } from '../ui/Toast'
import { cn } from '../../lib/cn'

type Props = {
  acts: ActMeta[]
  articles: Article[]
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
  draftLabel?: string | null
  onDraftConsumed?: () => void
}

const CATEGORIES: TagCategory[] = [
  'Zajęcia',
  'Koszty',
  'Terminy',
  'Doręczenia',
  'Zarzuty',
  'Inne',
]

export function Tags({
  acts,
  articles,
  store,
  onStoreChange,
  onXref,
  draftLabel,
  onDraftConsumed,
}: Props) {
  const toast = useToast()
  const [label, setLabel] = useState('')
  const [aliases, setAliases] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState<TagCategory>('Inne')
  const [articleIds, setArticleIds] = useState<string[]>([])
  const [pickerQuery, setPickerQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState<TagCategory | 'all'>('all')

  useEffect(() => {
    if (!draftLabel) return
    setLabel(draftLabel)
    onDraftConsumed?.()
  }, [draftLabel, onDraftConsumed])

  const picker = useMemo(() => {
    const q = pickerQuery.trim().toLocaleLowerCase('pl')
    const list = !q
      ? articles.filter((a) => ['18', '33', '56', '104', '124', '144'].includes(a.number)).concat(articles.slice(0, 20))
      : articles
          .filter(
            (a) =>
              a.label.toLocaleLowerCase('pl').includes(q) ||
              a.number.includes(q) ||
              a.excerpt.toLocaleLowerCase('pl').includes(q),
          )
          .slice(0, 40)
    const seen = new Set<string>()
    return list.filter((a) => {
      if (seen.has(a.id)) return false
      seen.add(a.id)
      return true
    })
  }, [articles, pickerQuery])

  const sortedTags = useMemo(() => {
    const list =
      catFilter === 'all'
        ? [...store.tags]
        : store.tags.filter((t) => (t.category ?? 'Inne') === catFilter)
    return list.sort((a, b) => a.label.localeCompare(b.label, 'pl'))
  }, [store.tags, catFilter])

  function resetForm() {
    setLabel('')
    setAliases('')
    setNote('')
    setCategory('Inne')
    setArticleIds([])
    setEditingId(null)
    setPickerQuery('')
  }

  function startEdit(tag: UserTag) {
    setEditingId(tag.id)
    setLabel(tag.label)
    setAliases(tag.aliases.join(', '))
    setNote(tag.note ?? '')
    setCategory(tag.category ?? 'Inne')
    setArticleIds([...tag.articleIds])
  }

  function save() {
    const trimmed = label.trim()
    if (!trimmed || articleIds.length === 0) return
    const now = new Date().toISOString()
    const existing = editingId ? store.tags.find((t) => t.id === editingId) : undefined
    const tag: UserTag = {
      id: existing?.id ?? newTagId(),
      label: trimmed,
      aliases: aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      articleIds,
      note: note.trim() || undefined,
      category,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    onStoreChange(upsertTag(store, tag))
    toast.push(editingId ? 'Zapisano tag' : 'Dodano tag')
    resetForm()
  }

  function doExport() {
    const blob = new Blob([exportStoreJson(store)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `egzepost-baza-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.push('Wyeksportowano bazę JSON')
  }

  function doImport(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const next = importStoreJson(String(reader.result))
        onStoreChange(next)
        toast.push('Zaimportowano bazę')
      } catch (e) {
        toast.push(e instanceof Error ? e.message : 'Błąd importu')
      }
    }
    reader.readAsText(file)
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 md:pb-10 md:pt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Moje</h1>
        <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-zinc-400">
          Tagi (żargon pracy), ustawienia i eksport bazy. Dane lokalnie w przeglądarce.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={doExport}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <Download className="h-4 w-4" /> Eksportuj bazę (JSON)
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
          <Upload className="h-4 w-4" /> Importuj bazę (JSON)
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) doImport(f)
              e.target.value = ''
            }}
          />
        </label>
        <p className="w-full text-xs text-slate-500">
          Źródła: {acts.map((a) => `${a.shortName} (${a.articleCount} art.)`).join(' · ')}
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Field label="Etykieta / zagadnienie">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="np. zarzut w egzekucji"
            className={inputCls}
          />
        </Field>
        <Field label="Aliasy (po przecinku)">
          <input
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="np. zarzuty, zbieg"
            className={inputCls}
          />
        </Field>
        <Field label="Kategoria">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TagCategory)}
            className={inputCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notatka (opcjonalnie)">
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Własna wskazówka — nie zastępuje ustawy"
            className={inputCls}
          />
        </Field>
        <Field label="Powiązane artykuły">
          <input
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            placeholder="Filtruj: art. 33, egzekucja…"
            className={inputCls}
          />
          <div className="mt-2 max-h-44 overflow-auto rounded-xl border border-slate-200 dark:border-zinc-700">
            {picker.map((a) => {
              const act = acts.find((x) => x.id === a.actId)?.shortName
              const checked = articleIds.includes(a.id)
              return (
                <label
                  key={a.id}
                  className="flex cursor-pointer gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0 dark:border-zinc-800"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setArticleIds((prev) =>
                        checked ? prev.filter((id) => id !== a.id) : [...prev, a.id],
                      )
                    }
                  />
                  <span>
                    <span className="font-mono font-semibold">
                      {act} {a.label}
                    </span>{' '}
                    — {a.excerpt.slice(0, 90)}
                    {a.excerpt.length > 90 ? '…' : ''}
                  </span>
                </label>
              )
            })}
          </div>
          <p className="mt-1 text-xs text-slate-500">Wybrane: {articleIds.length}</p>
        </Field>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!label.trim() || articleIds.length === 0}
            onClick={save}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {editingId ? 'Zapisz zmiany' : 'Dodaj tag'}
          </button>
          {editingId && (
            <button type="button" className="rounded-xl px-3 py-2 text-sm" onClick={resetForm}>
              Anuluj
            </button>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Słownik tagów ({sortedTags.length})</h2>
          <div className="flex flex-wrap gap-1">
            <CatChip active={catFilter === 'all'} onClick={() => setCatFilter('all')}>
              Wszystkie
            </CatChip>
            {CATEGORIES.map((c) => (
              <CatChip key={c} active={catFilter === c} onClick={() => setCatFilter(c)}>
                {c}
              </CatChip>
            ))}
          </div>
        </div>

        {sortedTags.length === 0 ? (
          <p className="text-sm text-slate-500">Brak tagów — dodaj pierwszy powyżej.</p>
        ) : (
          <div className="space-y-2">
            {sortedTags.map((tag) => {
              const open = expandedId === tag.id
              const linked = tag.articleIds
                .map((id) => articles.find((a) => a.id === id))
                .filter(Boolean) as Article[]
              return (
                <div
                  key={tag.id}
                  className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 p-4 text-left"
                    onClick={() => setExpandedId(open ? null : tag.id)}
                  >
                    <div>
                      <div className="font-semibold">{tag.label}</div>
                      <div className="mt-0.5 font-mono text-xs text-slate-500">
                        {tag.category ?? 'Inne'}
                        {tag.aliases.length ? ` · ${tag.aliases.join(', ')}` : ''}
                      </div>
                      {tag.note && <p className="mt-1 text-sm text-slate-500">{tag.note}</p>}
                    </div>
                    <span className="font-mono text-xs text-slate-400">{linked.length} art.</span>
                  </button>
                  {open && (
                    <div className="space-y-3 border-t border-slate-100 p-4 dark:border-zinc-800">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-zinc-700"
                          onClick={() => startEdit(tag)}
                        >
                          Edytuj
                        </button>
                        <button
                          type="button"
                          className="rounded-lg px-3 py-1.5 text-sm text-rose-700"
                          onClick={() => onStoreChange(deleteTag(store, tag.id))}
                        >
                          Usuń
                        </button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {linked.map((a) => (
                          <ArticleCard
                            key={a.id}
                            article={a}
                            acts={acts}
                            tags={store.tags}
                            store={store}
                            onStoreChange={onStoreChange}
                            onXref={onXref}
                            compact
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function CatChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-xs font-medium',
        active
          ? 'border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
          : 'border-slate-200 dark:border-zinc-700',
      )}
    >
      {children}
    </button>
  )
}
