import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CrossRefPopover } from './components/article/CrossRefPopover'
import { ActList, ActOverview, ChapterView } from './components/browse/Browse'
import { Home } from './components/home/Home'
import { NamePrompt } from './components/home/NamePrompt'
import { NaukaHome, readFocusAct, writeFocusAct } from './components/nauka/Nauka'
import { Session } from './components/nauka/Session'
import { ArticleReader } from './components/reader/ArticleReader'
import { SearchScreen } from './components/search/Search'
import { StatystykiHome } from './components/stats/Statystyki'
import { go, useRoute } from './components/shell/router'
import { Shell, TopBar, type Tab } from './components/shell/Shell'
import { Tags } from './components/tags/Tags'
import { useTheme } from './components/ui/ThemeToggle'
import { ToastProvider } from './components/ui/Toast'
import { loadAppData, type AppData } from './lib/data'
import {
  consumeLearnQueue,
  loadBank,
  planSession,
  readLearnState,
  type LearnMode,
  type PlannedSession,
} from './lib/learn-adapter'
import { loadUserStore, saveUserStore } from './lib/storage'
import { getLibrary, isActId, type ActId } from './lib/structure'
import type { Article, UserStore } from './types'

function Main() {
  useTheme()
  const route = useRoute()
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [store, setStore] = useState<UserStore>(() => loadUserStore())
  const [focusToken, setFocusToken] = useState(0)
  const [draftTag, setDraftTag] = useState<string | null>(null)
  const [xrefArticle, setXrefArticle] = useState<Article | null>(null)
  const [xrefOpen, setXrefOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadAppData()
      .then((d) => !cancelled && setData(d))
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Nie udało się wczytać bazy')
      })
    // Warm the question bank in the background.
    loadBank().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        go('szukaj')
        setFocusToken((n) => n + 1)
      }
      if (e.key === 'Escape') setXrefOpen(false)
    }
    const onAssign = (e: Event) => {
      setDraftTag((e as CustomEvent<{ label: string }>).detail.label)
      go('moje')
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('egzepost:assign-tag', onAssign)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('egzepost:assign-tag', onAssign)
    }
  }, [])

  const lib = useMemo(() => (data ? getLibrary(data) : null), [data])

  function updateStore(next: UserStore) {
    setStore(next)
    saveUserStore(next)
  }

  function openXref(actId: string, number: string) {
    const article = data?.byId.get(`${actId}:${number}`)
    setXrefArticle(article ?? null)
    setXrefOpen(!!article)
  }

  if (error)
    return (
      <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-dashed border-red-300 p-5 text-red-800 dark:border-red-900 dark:text-red-200">
        <strong>Brak w bazie</strong>
        <p className="text-sm">{error}</p>
      </div>
    )
  if (!data || !lib)
    return <div className="grid min-h-dvh place-items-center font-serif text-[22px] text-muted">Regest…</div>

  const [p0, p1, p2, p3] = route.parts
  const common = { store, onStoreChange: updateStore }
  let tab: Tab = 'start'
  let top = <TopBar brand />
  let body: ReactNode

  if (p0 === 'przegladaj') {
    tab = 'przegladaj'
    body = <ActList lib={lib} />
  } else if (p0 === 'akt' && isActId(p1) && lib.acts[p1]) {
    tab = 'przegladaj'
    const act = lib.acts[p1]
    const ch = p2 === 'r' ? act.chapters[Number(p3)] : undefined
    if (ch) {
      top = <TopBar back={`akt/${act.id}`} title={act.shortName} />
      body = <ChapterView act={act} ch={ch} />
    } else {
      top = <TopBar back="przegladaj" />
      body = <ActOverview act={act} />
    }
  } else if (p0 === 'art') {
    tab = 'przegladaj'
    const article = data.byId.get(p1 ?? '')
    const act = article && isActId(article.actId) ? lib.acts[article.actId] : undefined
    const ch = article && act?.chapterOf.get(article.id)
    top = <TopBar back={act && ch ? `akt/${act.id}/r/${ch.index}` : 'przegladaj'} />
    body = article ? (
      <ArticleReader
        lib={lib}
        acts={data.acts}
        article={article}
        chapterMode={route.query.get('tryb') === 'rozdzial'}
        onXref={openXref}
        {...common}
      />
    ) : (
      <div className="p-8 text-muted">Brak w bazie: {p1}</div>
    )
  } else if (p0 === 'szukaj') {
    tab = 'szukaj'
    body = (
      <SearchScreen
        lib={lib}
        articles={data.articles}
        store={store}
        initial={route.query.get('q') ?? ''}
        focusToken={focusToken}
      />
    )
  } else if (p0 === 'nauka' && p1 === 'sesja') {
    return (
      <Shell tab="nauka" bare>
        <SessionRoute
          key={[...route.parts, route.query.toString()].join('|')}
          store={store}
          onStoreChange={updateStore}
          onXref={openXref}
          query={route.query}
        />
        <CrossRefPopover open={xrefOpen} onOpenChange={setXrefOpen} article={xrefArticle} acts={data.acts} />
      </Shell>
    )
  } else if (p0 === 'nauka') {
    tab = 'nauka'
    const q = route.query.get('akt')
    const actId: ActId = isActId(q) ? q : readFocusAct()
    if (isActId(q)) writeFocusAct(q)
    body = <NaukaHome lib={lib} store={store} actId={actId} />
  } else if (p0 === 'statystyki') {
    tab = 'statystyki'
    const actId = isActId(p1) ? p1 : undefined
    top = actId ? <TopBar back="statystyki" title="Statystyki" /> : <TopBar brand />
    body = <StatystykiHome lib={lib} store={store} actId={actId} />
  } else if (p0 === 'moje') {
    tab = 'moje'
    top = <TopBar back="" title="Moje: tagi i ustawienia" />
    body = (
      <Tags
        acts={data.acts}
        articles={data.articles}
        onXref={openXref}
        draftLabel={draftTag}
        onDraftConsumed={() => setDraftTag(null)}
        {...common}
      />
    )
  } else {
    body = <Home lib={lib} byId={data.byId} store={store} focusAct={readFocusAct()} />
  }

  return (
    <Shell tab={tab}>
      {top}
      {body}
      <NamePrompt store={store} onStoreChange={updateStore} />
      <CrossRefPopover open={xrefOpen} onOpenChange={setXrefOpen} article={xrefArticle} acts={data.acts} />
    </Shell>
  )
}

function SessionRoute({
  store,
  onStoreChange,
  onXref,
  query,
}: {
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
  query: URLSearchParams
}) {
  const modeRaw = query.get('tryb')
  const mode: LearnMode = modeRaw === 'test' || modeRaw === 'flashcards' || modeRaw === 'mixed' ? modeRaw : 'mixed'
  const actId = isActId(query.get('akt')) ? (query.get('akt') as ActId) : readFocusAct()
  const stageId = query.get('etap') ?? undefined
  const mistakesOnly = query.get('bledy') === '1'
  const exitTo = `nauka?akt=${actId}`

  const [plan, setPlan] = useState<PlannedSession | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBank()
      .then((bank) => {
        if (cancelled) return
        const state = readLearnState()
        const next = planSession(bank, state, {
          mode,
          actId,
          stageId,
          mistakesOnly,
          preferArticleIds: store.learnQueue,
        })
        // Consume queued articles that appear in this session.
        const used = new Set(next.items.map((i) => i.question.articleId))
        const consumed = store.learnQueue.filter((id) => used.has(id))
        if (consumed.length) onStoreChange(consumeLearnQueue(store, consumed))
        setPlan(next)
      })
      .catch((e: unknown) => !cancelled && setErr(e instanceof Error ? e.message : 'Brak banku'))
    return () => {
      cancelled = true
    }
    // Freeze plan once built — don't rebuild on store changes mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (err)
    return (
      <div className="p-8 text-center">
        <p className="text-muted">{err}</p>
        <a href={`#/${exitTo}`} className="mt-4 inline-block font-semibold">
          Wróć
        </a>
      </div>
    )
  if (!plan) return <div className="grid min-h-dvh place-items-center text-muted">Przygotowuję sesję…</div>

  return (
    <Session plan={plan} store={store} onStoreChange={onStoreChange} onXref={onXref} exitTo={exitTo} />
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Main />
    </ToastProvider>
  )
}
