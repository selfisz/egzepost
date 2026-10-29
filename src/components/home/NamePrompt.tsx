import { useState } from 'react'
import { getProfile, setProfile } from '../../lib/storage'
import type { UserStore } from '../../types'

export function NamePrompt({
  store,
  onStoreChange,
}: {
  store: UserStore
  onStoreChange: (next: UserStore) => void
}) {
  const profile = getProfile(store)
  const [value, setValue] = useState(profile.name ?? '')
  if (profile.namePromptSeen) return null

  function save(name: string | undefined) {
    onStoreChange(setProfile(store, { name: name?.trim() || undefined, namePromptSeen: true }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 pb-[max(env(safe-area-inset-bottom),20px)] md:items-center">
      <div className="w-full max-w-md rounded-[24px] bg-paper p-6 shadow-xl" role="dialog" aria-labelledby="name-prompt-title">
        <div className="text-[12px] font-semibold tracking-[0.14em] text-muted uppercase">Regest</div>
        <h2 id="name-prompt-title" className="mt-2 font-serif text-[26px] leading-tight font-semibold">
          Jak masz na imię?
        </h2>
        <p className="mt-2 text-[14px] text-muted">Użyjemy go w powitaniu. Możesz zmienić później w Moje → Ustawienia.</p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save(value)
          }}
          placeholder="np. Anna"
          maxLength={40}
          className="mt-5 h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[16px] outline-none focus:border-ink/40"
        />
        <div className="mt-4 grid grid-cols-[1fr_1.4fr] gap-2">
          <button type="button" onClick={() => save(undefined)} className="h-12 rounded-2xl text-[14px] font-medium text-muted">
            Pomiń
          </button>
          <button
            type="button"
            onClick={() => save(value)}
            className="h-12 rounded-2xl bg-ink text-[15px] font-semibold text-paper"
          >
            Zapisz
          </button>
        </div>
      </div>
    </div>
  )
}
