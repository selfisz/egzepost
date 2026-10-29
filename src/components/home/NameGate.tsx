import { useState } from 'react'
import { getProfile, setProfile } from '../../lib/storage'
import type { UserStore } from '../../types'

/** First-visit prompt: „Jak masz na imię?” */
export function NameGate({
  store,
  onStoreChange,
}: {
  store: UserStore
  onStoreChange: (next: UserStore) => void
}) {
  const profile = getProfile(store)
  const [name, setName] = useState(profile.name ?? '')
  if (profile.greeted) return null

  function finish(value: string | undefined) {
    const trimmed = value?.trim()
    onStoreChange(setProfile(store, { name: trimmed || undefined, greeted: true }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center" role="dialog" aria-modal aria-labelledby="name-gate-title">
      <div className="w-full max-w-md rounded-3xl bg-paper p-6 shadow-2xl">
        <div className="text-[12px] font-semibold tracking-[0.14em] text-muted uppercase">Regest</div>
        <h1 id="name-gate-title" className="mt-2 font-serif text-[28px] leading-tight font-semibold">
          Jak masz na imię?
        </h1>
        <p className="mt-2 text-[14.5px] text-muted">Przywitamy Cię na starcie. Imię zostaje tylko w tej przeglądarce.</p>
        <label className="mt-5 block">
          <span className="sr-only">Imię</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) finish(name)
            }}
            placeholder="np. Anna"
            className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[16px] outline-none focus:border-ink/40"
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => finish(undefined)}
            className="h-12 flex-1 rounded-2xl bg-sunk text-[15px] font-semibold"
          >
            Pomiń
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => finish(name)}
            className="h-12 flex-[1.4] rounded-2xl bg-ink text-[15px] font-semibold text-paper disabled:opacity-40"
          >
            Zapisz
          </button>
        </div>
      </div>
    </div>
  )
}
