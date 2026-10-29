import { CircleHelp, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'

const SECTIONS = [
  {
    title: 'Start',
    body: 'Tu zaczynasz dzień. Aplikacja pyta o imię przy pierwszym wejściu i wita Cię na górze. Karta „Trening na dziś” uruchamia Test albo Fiszki jednym tapnięciem. Niżej: ostatnio czytane przepisy, akty i Twoje tagi.',
  },
  {
    title: 'Przeglądaj',
    body: 'Przechodzisz akt → dział/rozdział → artykuł. W czytniku wybierasz widok „Artykuł” albo „Cały rozdział”. Przy przepisie: Cytat, Podstawa, Tag i „Do nauki” (pytania trafią do kolejnej sesji).',
  },
  {
    title: 'Szukaj',
    body: 'Szukaj po fragmencie tekstu, zagadnieniu albo numerze — np. „33 kpa”. Skrót Ctrl/⌘+K otwiera Szukaj z dowolnego miejsca. Wyniki możesz zawęzić do aktu i własnych tagów.',
  },
  {
    title: 'Nauka',
    body: 'Rdzeniem są Test i Fiszki — bez kłódek, wszystkie rozdziały od razu. Jeden tap: sesja z całego aktu. Dwa tapy: rozdział → Test lub Fiszki. Przy odpowiedzi jest „zobacz przepis” (arkusz z ustawą, bez wychodzenia z sesji).',
  },
  {
    title: 'Statystyki',
    body: 'Pokazują, ile przeczytałeś (x / y) i ile „znam dobrze”. Wejdź w akt, żeby zobaczyć działy, rozdziały i typy pytań. Stąd też możesz od razu odpalić trening ze słabszego rozdziału.',
  },
  {
    title: 'Moje',
    body: 'Twoje rzeczy: tagi (żargon pracy powiązany z przepisami), zmiana imienia, motyw, podświetlenie składni oraz eksport/import bazy (wraz z postępem nauki). Dane zostają w tej przeglądarce.',
  },
] as const

export function HelpButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Jak korzystać z Regestu"
        title="Pomoc"
        className={className}
      >
        <CircleHelp className="size-[19px]" strokeWidth={1.8} />
      </button>
      {open && <HelpOverlay onClose={() => setOpen(false)} />}
    </>
  )
}

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-6"
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-paper shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-line px-5 pt-5 pb-4">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Regest</div>
            <h1 id={titleId} className="mt-1 font-serif text-[26px] leading-tight font-semibold tracking-tight">
              Jak korzystać
            </h1>
            <p className="mt-1 text-[13.5px] text-muted">Krótki przewodnik po modułach — otwierasz go przyciskiem ?.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-sunk text-ink"
          >
            <X className="size-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ol className="space-y-5">
            {SECTIONS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-sunk font-mono text-[12px] font-semibold text-ink-2 tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h2 className="text-[15.5px] font-semibold tracking-tight">{s.title}</h2>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="shrink-0 border-t border-line px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-ink text-[15px] font-semibold text-paper"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
