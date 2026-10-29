import { Download, MoreHorizontal, Pin, Upload } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ActMeta, Article, TagCategory, UserStore, UserTag } from '../../types'
import { Reader } from '../reader/Reader'
import {
  applyImportedLearn,
  deleteTag,
  exportStoreJson,
  getPrefs,
  getProfile,
  importStoreJson,
  newTagId,
  setPrefs,
  setProfile,
  togglePinnedTag,
  upsertTag,
} from '../../lib/storage'
import { useTheme } from '../ui/ThemeToggle'
import { useToast } from '../ui/Toast'
import { ActBadge } from '../article/CrossRefPopover'
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

type HubView = 'dict' | 'edit' | 'settings'

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
  const { theme, toggle: toggleTheme } = useTheme()
  const prefs = getPrefs(store)

  const [view, setView] = useState<HubView>('dict')
  const [label, setLabel] = useState('')
  const [aliases, setAliases] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState<TagCategory>('Inne')
  const [articleIds, setArticleIds] = useState<string[]>([])
  const [pickerQuery, setPickerQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState<TagCategory | 'all'>('all')
  const [menuId, setMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (!draftLabel) return
    setLabel(draftLabel)
    setView('edit')
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
    const pinned = new Set(store.pinnedTagIds ?? [])
    return list.sort((a, b) => {
      const ap = pinned.has(a.id) ? 0 : 1
      const bp = pinned.has(b.id) ? 0 : 1
      if (ap !== bp) return ap - bp
      return a.label.localeCompare(b.label, 'pl')
    })
  }, [store.tags, store.pinnedTagIds, catFilter])

  const activeTag = activeId ? store.tags.find((t) => t.id === activeId) : null

  const compareColumns = useMemo(() => {
    if (!activeTag) return []
    const linked = activeTag.articleIds
      .map((id) => articles.find((a) => a.id === id))
      .filter(Boolean) as Article[]
    return acts.map((act) => ({
      act,
      articles: linked.filter((a) => a.actId === act.id),
    }))
  }, [activeTag, articles, acts])

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
    setView('edit')
    setMenuId(null)
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
    setActiveId(tag.id)
    setView('dict')
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
        const { store: next, learn } = importStoreJson(String(reader.result))
        applyImportedLearn(learn)
        onStoreChange(next)
        toast.push('Zaimportowano bazę')
      } catch (e) {
        toast.push(e instanceof Error ? e.message : 'Błąd importu')
      }
    }
    reader.readAsText(file)
  }

  if (activeTag && view === 'dict') {
    const colsWithContent = compareColumns.filter((c) => c.articles.length > 0)
    const gridCols =
      colsWithContent.length <= 1
        ? 'md:grid-cols-1'
        : colsWithContent.length === 2
          ? 'md:grid-cols-2'
          : 'md:grid-cols-3'

    return (
      <section className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:pb-10 md:pt-8">
        <button
          type="button"
          className="mb-4 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          onClick={() => setActiveId(null)}
        >
          ← Słownik żargonu
        </button>

        <header className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {activeTag.category ?? 'Inne'}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{activeTag.label}</h1>
              {activeTag.aliases.length > 0 && (
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {activeTag.aliases.join(' · ')}
                </p>
              )}
              {activeTag.note && (
                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-zinc-400">
                  {activeTag.note}
                </p>
              )}
            </div>
            <div className="relative flex items-center gap-1">
              <button
                type="button"
                title={(store.pinnedTagIds ?? []).includes(activeTag.id) ? 'Odepnij' : 'Przypnij'}
                onClick={() => onStoreChange(togglePinnedTag(store, activeTag.id))}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 dark:border-zinc-700',
                  (store.pinnedTagIds ?? []).includes(activeTag.id)
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500',
                )}
              >
                <Pin className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Więcej"
                onClick={() => setMenuId(menuId === activeTag.id ? null : activeTag.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 text-slate-500 dark:border-zinc-700"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuId === activeTag.id && (
                <div className="absolute right-0 top-9 z-10 min-w-[160px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  <button
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-zinc-800"
                    onClick={() => startEdit(activeTag)}
                  >
                    Edytuj
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    onClick={() => {
                      onStoreChange(deleteTag(store, activeTag.id))
                      setActiveId(null)
                      setMenuId(null)
                      toast.push('Usunięto tag')
                    }}
                  >
                    Usuń
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-zinc-400">
            Porównanie aktów obok siebie — tylko powiązane artykuły z bazy.
          </p>
        </header>

        {colsWithContent.length === 0 ? (
          <p className="text-sm text-slate-500">Brak powiązanych artykułów.</p>
        ) : (
          <div className={cn('grid gap-4', gridCols)}>
            {colsWithContent.map(({ act, articles: colArts }) => (
              <div key={act.id} className="min-w-0 space-y-3">
                <div className="sticky top-0 z-[1] flex items-center gap-2 border-b border-slate-200/80 bg-stone-50/95 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
                  <ActBadge actId={act.id} acts={acts} />
                  <span className="text-xs text-slate-500">{colArts.length} art.</span>
                </div>
                {colArts.map((a) => (
                  <Reader
                    key={a.id}
                    article={a}
                    acts={acts}
                    store={store}
                    onStoreChange={onStoreChange}
                    onXref={onXref}
                    highlightLegal={prefs.highlightLegal}
                    onToggleHighlight={() =>
                      onStoreChange(setPrefs(store, { highlightLegal: !prefs.highlightLegal }))
                    }
                    showNav={false}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 md:pb-10 md:pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Moje</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-zinc-400">
            Słownik żargonu pracy — tagi łączą przepisy z aktów obok siebie.
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
          {(
            [
              ['dict', 'Słownik'],
              ['edit', editingId ? 'Edycja' : 'Nowy tag'],
              ['settings', 'Ustawienia'],
            ] as const
          ).map(([id, labelTab]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                'rounded-[10px] px-3 py-1.5 text-sm font-medium',
                view === id
                  ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-slate-600 dark:text-zinc-300',
              )}
            >
              {labelTab}
            </button>
          ))}
        </div>
      </div>

      {view === 'settings' && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Profil</h2>
            <Row
              label="Imię"
              hint="Używane w powitaniu na starcie"
              action={
                <input
                  defaultValue={getProfile(store).name ?? ''}
                  maxLength={40}
                  placeholder="np. Anna"
                  onBlur={(e) => {
                    const name = e.target.value.trim()
                    onStoreChange(setProfile(store, { name: name || undefined, namePromptSeen: true }))
                  }}
                  className="h-8 w-36 rounded-lg border border-slate-200 bg-transparent px-2 text-sm dark:border-zinc-700"
                />
              }
            />
          </section>

          <section className="space-y-3 border-t border-slate-200/80 pt-5 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Wygląd</h2>
            <Row
              label="Motyw"
              hint={theme === 'dark' ? 'Ciemny' : 'Jasny'}
              action={
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-zinc-700"
                >
                  Przełącz
                </button>
              }
            />
            <Row
              label="Podświetlenie składni prawnej"
              hint="Domyślnie wyłączone — spokojne czytanie"
              action={
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs.highlightLegal}
                  onClick={() =>
                    onStoreChange(setPrefs(store, { highlightLegal: !prefs.highlightLegal }))
                  }
                  className={cn(
                    'relative h-7 w-12 rounded-full transition',
                    prefs.highlightLegal ? 'bg-slate-900 dark:bg-zinc-100' : 'bg-slate-300 dark:bg-zinc-700',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition dark:bg-zinc-900',
                      prefs.highlightLegal ? 'left-[22px]' : 'left-0.5',
                    )}
                  />
                </button>
              }
            />
          </section>

          <section className="space-y-3 border-t border-slate-200/80 pt-5 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Baza lokalna</h2>
            <p className="text-xs text-slate-500">
              Eksport obejmuje tagi, imię, historię czytania, postęp nauki (pytania), stary SRS, moduły,
              przypięcia i preferencje. Dane tylko w tej przeglądarce.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={doExport}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Download className="h-3.5 w-3.5" /> Eksportuj bazę (JSON)
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                <Upload className="h-3.5 w-3.5" /> Importuj bazę (JSON)
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
            </div>
            <p className="font-mono text-[11px] text-slate-400">
              Źródła: {acts.map((a) => `${a.shortName} (${a.articleCount})`).join(' · ')}
            </p>
          </section>
        </div>
      )}

      {view === 'edit' && (
        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
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
                      <span className="mr-1.5 inline-block align-middle">
                        <ActBadge actId={a.actId} acts={acts} />
                      </span>
                      <span className="font-mono font-semibold">{a.label}</span>{' '}
                      — {a.excerpt.slice(0, 80)}
                      {a.excerpt.length > 80 ? '…' : ''}
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
            <button
              type="button"
              className="rounded-xl px-3 py-2 text-sm text-slate-500"
              onClick={() => {
                resetForm()
                setView('dict')
              }}
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {view === 'dict' && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-1">
            <CatChip active={catFilter === 'all'} onClick={() => setCatFilter('all')}>
              Wszystkie
            </CatChip>
            {CATEGORIES.map((c) => (
              <CatChip key={c} active={catFilter === c} onClick={() => setCatFilter(c)}>
                {c}
              </CatChip>
            ))}
          </div>

          {sortedTags.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-zinc-700">
              <p className="text-sm text-slate-500">Brak tagów — dodaj pierwszy żargon pracy.</p>
              <button
                type="button"
                className="mt-3 text-sm font-medium text-slate-800 underline dark:text-zinc-200"
                onClick={() => setView('edit')}
              >
                Nowy tag
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200/80 rounded-2xl border border-slate-200/80 bg-white/90 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/80">
              {sortedTags.map((tag) => {
                const pinned = (store.pinnedTagIds ?? []).includes(tag.id)
                const counts = acts.map((act) => ({
                  act,
                  n: tag.articleIds.filter((id) => id.startsWith(`${act.id}:`)).length,
                }))
                return (
                  <li key={tag.id} className="flex items-stretch">
                    <button
                      type="button"
                      className="min-w-0 flex-1 px-4 py-3 text-left hover:bg-stone-50/80 dark:hover:bg-zinc-800/50"
                      onClick={() => setActiveId(tag.id)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {pinned && <Pin className="h-3 w-3 text-amber-600 dark:text-amber-400" />}
                        <span className="font-semibold">{tag.label}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {tag.category ?? 'Inne'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {counts
                          .filter((c) => c.n > 0)
                          .map((c) => (
                            <span key={c.act.id} className="inline-flex items-center gap-1">
                              <ActBadge actId={c.act.id} acts={acts} />
                              <span className="font-mono text-[10px] text-slate-400">{c.n}</span>
                            </span>
                          ))}
                      </div>
                    </button>
                    <div className="relative flex items-center pr-2">
                      <button
                        type="button"
                        title="Więcej"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                        onClick={() => setMenuId(menuId === tag.id ? null : tag.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuId === tag.id && (
                        <div className="absolute right-2 top-9 z-10 min-w-[180px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                          <button
                            type="button"
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-zinc-800"
                            onClick={() => {
                              onStoreChange(togglePinnedTag(store, tag.id))
                              setMenuId(null)
                            }}
                          >
                            {pinned ? 'Odepnij' : 'Przypnij do Szukaj'}
                          </button>
                          <button
                            type="button"
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-zinc-800"
                            onClick={() => startEdit(tag)}
                          >
                            Edytuj
                          </button>
                          <button
                            type="button"
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-slate-50 dark:hover:bg-zinc-800"
                            onClick={() => {
                              onStoreChange(deleteTag(store, tag.id))
                              setMenuId(null)
                            }}
                          >
                            Usuń
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-zinc-700'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function Row({
  label,
  hint,
  action,
}: {
  label: string
  hint?: string
  action: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      {action}
    </div>
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
          : 'border-slate-200 text-slate-600 dark:border-zinc-700 dark:text-zinc-300',
      )}
    >
      {children}
    </button>
  )
}
