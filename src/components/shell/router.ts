import { useEffect, useState } from 'react'

export type Route = { parts: string[]; query: URLSearchParams }

function parseHash(): Route {
  const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ''))
  const [path, qs = ''] = raw.split('?')
  return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) }
}

export function useRoute() {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const on = () => {
      setRoute(parseHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

/** Hash routes keep deep links working under any Vite base (e.g. `/egzepost/`). */
export function href(path: string) {
  return `#/${path.replace(/^\//, '')}`
}

export function go(path: string) {
  location.hash = href(path)
}

/** Update the URL without a navigation (e.g. live search query). */
export function replaceRoute(path: string) {
  history.replaceState(null, '', href(path))
}
