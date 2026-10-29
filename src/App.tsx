import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CrossRefPopover } from './components/article/CrossRefPopover'
import { ActList, ActOverview, ChapterView } from './components/browse/Browse'
import { Home } from './components/home/Home'
import { NaukaHome, readFocusAct, writeFocusAct } from './components/nauka/Nauka'
import { Session } from './components/nauka/Session'
import { ArticleReader } from './components/reader/ArticleReader'
import { SearchScreen } from './components/search/Search'
import { go, useRoute } from './components/shell/router'
import { Shell, TopBar, type Tab } from './components/shell/Shell'
import { Tags } from './components/tags/Tags'
import { useTheme } from './components/ui/ThemeToggle'
import { ToastProvider } from './components/ui/Toast'
import { loadAppData, type AppData } from './lib/data'
import { learnEngine } from './lib/learn-adapter'
import { loadUserStore, saveUserStore } from './lib/storage'
import { getLibrary, isActId, type ActId, type Library } from './lib/structure'
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
  } else if (p0 === 'nauka' && (p1 === 'trening' || p1 === 'etap')) {
    return (
      <Shell tab="nauka" bare>
        <SessionRoute
          key={route.parts.join('/')}
          lib={lib}
          kind={p1}
          actId={isActId(p2) ? p2 : readFocusAct()}
          index={Number(p3)}
          onXref={openXref}
          {...common}
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
      <CrossRefPopover open={xrefOpen} onOpenChange={setXrefOpen} article={xrefArticle} acts={data.acts} />
    </Shell>
  )
}

function SessionRoute({
  lib,
  kind,
  actId,
  index,
  store,
  onStoreChange,
  onXref,
}: {
  lib: Library
  kind: 'trening' | 'etap'
  actId: ActId
  index: number
  store: UserStore
  onStoreChange: (next: UserStore) => void
  onXref: (actId: string, number: string) => void
}) {
  // Freeze the deck at session start; grading updates the store but must not reshuffle cards.
  const [cards] = useState(() =>
    kind === 'trening'
      ? learnEngine.dailyPlan(lib, store, actId).cards
      : learnEngine.stageSession(lib.acts[actId], index, store),
  )
  const title = kind === 'trening' ? 'Trening na dziś' : (lib.acts[actId].chapters[index]?.title ?? 'Etap')
  return (
    <Session
      title={title}
      cards={cards}
      store={store}
      onStoreChange={onStoreChange}
      onXref={onXref}
      exitTo={`nauka?akt=${actId}`}
    />
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Main />
    </ToastProvider>
  )
}
