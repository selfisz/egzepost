import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CrossRefPopover } from './components/article/CrossRefPopover'
import { ActList, ActOverview, ChapterView } from './components/browse/Browse'
import { Home } from './components/home/Home'
import { NameGate } from './components/home/NameGate'
import { NaukaHome, readFocusAct, writeFocusAct } from './components/nauka/Nauka'
import { Session, useSessionTitle } from './components/nauka/Session'
import { ArticleReader } from './components/reader/ArticleReader'
import { SearchScreen } from './components/search/Search'
import { go, useRoute } from './components/shell/router'
import { Shell, TopBar, type Tab } from './components/shell/Shell'
import { StatystykiAct, StatystykiHome } from './components/statystyki/Statystyki'
import { Tags } from './components/tags/Tags'
import { useTheme } from './components/ui/ThemeToggle'
import { ToastProvider } from './components/ui/Toast'
import { loadAppData, type AppData } from './lib/data'
import {
  ensureBank,
  planSession,
  persistLearnState,
  type LearnMode,
  type LearnState,
  type SessionPlan,
} from './lib/learn-adapter'
import { getLearnState } from './lib/learn-adapter'
import { getLearnSet, loadUserStore, saveUserStore } from './lib/storage'
import { getLibrary, isActId, type ActId, type Library } from './lib/structure'
import type { Article, UserStore } from './types'

function Main() {
  useTheme()
  const route = useRoute()
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [store, setStore] = useState<UserStore>(() => loadUserStore())
  const [learn, setLearn] = useState<LearnState>(() => getLearnState())
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
    ensureBank().catch(() => {})
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

  function updateLearn(next: LearnState) {
    setLearn(persistLearnState(next))
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

  const [p0, p1, p2] = route.parts
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
    const ch = p2 === 'r' ? act.chapters[Number(route.parts[3])] : undefined
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
          key={route.parts.join('/') + route.query.toString()}
          lib={lib}
          query={route.query}
          learn={learn}
          onLearnChange={updateLearn}
          {...common}
        />
        <CrossRefPopover open={xrefOpen} onOpenChange={setXrefOpen} article={xrefArticle} acts={data.acts} />
        <NameGate store={store} onStoreChange={updateStore} />
      </Shell>
    )
  } else if (p0 === 'nauka') {
    tab = 'nauka'
    const q = route.query.get('akt')
    const actId: ActId = isActId(q) ? q : readFocusAct()
    if (isActId(q)) writeFocusAct(q)
    body = <NaukaHome lib={lib} store={store} onStoreChange={updateStore} learn={learn} actId={actId} />
  } else if (p0 === 'statystyki' && isActId(p1)) {
    tab = 'statystyki'
    top = <TopBar back="statystyki" title={lib.acts[p1].shortName} />
    body = <StatystykiAct lib={lib} store={store} learn={learn} actId={p1} />
  } else if (p0 === 'statystyki') {
    tab = 'statystyki'
    body = <StatystykiHome lib={lib} store={store} learn={learn} />
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
        learn={learn}
        onLearnChange={updateLearn}
        {...common}
      />
    )
  } else {
    body = <Home lib={lib} byId={data.byId} store={store} learn={learn} focusAct={readFocusAct()} />
  }

  return (
    <Shell tab={tab}>
      {top}
      {body}
      <CrossRefPopover open={xrefOpen} onOpenChange={setXrefOpen} article={xrefArticle} acts={data.acts} />
      <NameGate store={store} onStoreChange={updateStore} />
    </Shell>
  )
}

function SessionRoute({
  lib,
  query,
  store,
  onStoreChange,
  learn,
  onLearnChange,
}: {
  lib: Library
  query: URLSearchParams
  store: UserStore
  onStoreChange: (next: UserStore) => void
  learn: LearnState
  onLearnChange: (next: LearnState) => void
}) {
  const modeRaw = query.get('m') ?? 'mixed'
  const mode: LearnMode = modeRaw === 'test' || modeRaw === 'flashcards' || modeRaw === 'mixed' ? modeRaw : 'mixed'
  const actId = isActId(query.get('akt')) ? (query.get('akt') as ActId) : readFocusAct()
  const stageId = query.get('etap') ?? undefined
  const mistakesOnly = query.get('bledy') === '1'
  const articleId = query.get('art') ?? undefined
  const zestawMode = query.get('zestaw') === '1'

  const [plan, setPlan] = useState<SessionPlan | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ensureBank()
      .then((bank) => {
        if (cancelled) return
        const next = planSession(bank, learn, {
          mode,
          actId: zestawMode ? undefined : actId,
          stageId: zestawMode ? undefined : stageId,
          mistakesOnly: zestawMode ? false : mistakesOnly,
          articleId: zestawMode ? undefined : articleId,
          zestaw: zestawMode ? getLearnSet(store) : undefined,
        })
        setPlan(next)
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Brak banku')
      })
    return () => {
      cancelled = true
    }
    // Freeze deck at mount — ignore learn/store updates after first plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const title = useSessionTitle(plan ?? { actId, stage: null, items: [], counts: { retry: 0, review: 0, new: 0 } }, mode)

  if (loadError) {
    return (
      <div className="grid min-h-dvh place-items-center p-8 text-center">
        <p className="text-muted">{loadError}</p>
      </div>
    )
  }
  if (!plan) {
    return <div className="grid min-h-dvh place-items-center font-serif text-[22px] text-muted">Sesja…</div>
  }

  if (plan.items.length === 0) {
    return (
      <div className="grid min-h-dvh place-items-center p-8 text-center">
        <div>
          <p className="font-serif text-[22px] font-semibold">brak pytań — tylko przeczytaj</p>
          <p className="mt-2 text-[14px] text-muted">
            {zestawMode
              ? 'W „Mój zestaw” nie ma pytań silnika dla wybranych pozycji.'
              : 'W tym zakresie silnik nie ma pytań.'}
          </p>
          <a href={`#/nauka?akt=${actId}`} className="mt-6 inline-flex h-11 items-center rounded-2xl bg-ink px-5 text-[14px] font-semibold text-paper">
            Wróć do Nauki
          </a>
        </div>
      </div>
    )
  }

  return (
    <Session
      title={title}
      plan={plan}
      mode={mode}
      learn={learn}
      onLearnChange={onLearnChange}
      store={store}
      onStoreChange={onStoreChange}
      lib={lib}
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
