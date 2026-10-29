import { Layers, ListChecks, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  describeSessionPreview,
  ensureBank,
  type LearnMode,
  type LearnState,
  type SessionPreviewInfo,
  type SessionRequest,
} from '../../lib/learn-adapter'
import { href } from '../shell/router'

export type PreviewRequest = SessionRequest & { stageLabel?: string }

export function SessionPreviewSheet({
  learn,
  request,
  onClose,
  onChangeScope,
}: {
  learn: LearnState
  request: PreviewRequest
  onClose: () => void
  onChangeScope: () => void
}) {
  const [info, setInfo] = useState<SessionPreviewInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ensureBank()
      .then((bank) => {
        if (cancelled) return
        setInfo(
          describeSessionPreview(bank, learn, request, {
            stageLabel: request.stageLabel,
          }),
        )
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Brak banku pytań')
      })
    return () => {
      cancelled = true
    }
  }, [learn, request])

  const modeLabel = request.mode === 'flashcards' ? 'Fiszki' : request.mode === 'test' ? 'Test' : 'Sesja'
  const ModeIcon = request.mode === 'flashcards' ? Layers : ListChecks

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" role="dialog" aria-modal aria-label="Podgląd sesji">
      <button type="button" className="flex-1 cursor-default" aria-label="Zamknij" onClick={onClose} />
      <div className="rounded-t-3xl bg-paper px-5 pt-4 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line md:mx-0" />
            <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">
              <ModeIcon className="size-3.5" /> Podgląd · {modeLabel}
            </div>
            <h2 className="mt-1 font-serif text-[22px] leading-tight font-semibold">
              {info?.scopeLabel ?? 'Ładowanie…'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-sunk text-muted"
            aria-label="Zamknij"
          >
            <X className="size-4" />
          </button>
        </div>

        {error && <p className="mt-4 text-[14px] text-muted">{error}</p>}

        {!error && !info && <p className="mt-4 text-[14px] text-muted">Liczenie pytań…</p>}

        {info && (
          <>
            <p className="mt-3 text-[14.5px] text-ink">
              {info.emptyMessage ? (
                <span className="text-muted">{info.emptyMessage}</span>
              ) : (
                <>
                  <b className="font-semibold tabular-nums">{info.count}</b>
                  {info.mode === 'flashcards' ? ' fiszek' : ' pytań'} w sesji
                  {info.available > info.count ? (
                    <span className="text-muted"> · dostępnych {info.available}</span>
                  ) : null}
                </>
              )}
            </p>

            {info.byType.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {info.byType.map((t) => (
                  <li
                    key={t.type}
                    className="rounded-full bg-sunk px-2.5 py-1 text-[12px] font-medium text-ink tabular-nums"
                  >
                    {t.label} · {t.count}
                  </li>
                ))}
              </ul>
            )}

            {!info.emptyMessage && (info.lineup.retry || info.lineup.review || info.lineup.new) ? (
              <p className="mt-3 text-[12.5px] text-muted">
                {[
                  info.lineup.retry ? `${info.lineup.retry} do poprawy` : '',
                  info.lineup.review ? `${info.lineup.review} powtórek` : '',
                  info.lineup.new ? `${info.lineup.new} nowe` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-2">
              {info.emptyMessage || info.count === 0 ? (
                <button
                  type="button"
                  disabled
                  className="col-span-2 flex h-12 items-center justify-center rounded-2xl bg-sunk text-[15px] font-semibold text-muted"
                >
                  Brak pytań do startu
                </button>
              ) : (
                <a
                  href={href(info.startHref)}
                  className="flex h-12 items-center justify-center rounded-2xl bg-ink text-[15px] font-semibold text-paper"
                >
                  Zaczynaj
                </a>
              )}
              <button
                type="button"
                onClick={onChangeScope}
                className="flex h-12 items-center justify-center rounded-2xl border border-line text-[15px] font-semibold"
              >
                Zmień zakres
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Shared opener: buttons that open preview instead of navigating straight to the session. */
export function ModeStartButtons({
  modeClassName,
  onPick,
}: {
  modeClassName?: string
  onPick: (mode: LearnMode) => void
}) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${modeClassName ?? ''}`}>
      <button
        type="button"
        onClick={() => onPick('test')}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-paper"
      >
        <ListChecks className="size-4" /> Test
      </button>
      <button
        type="button"
        onClick={() => onPick('flashcards')}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-[15px] font-semibold"
      >
        <Layers className="size-4" /> Fiszki
      </button>
    </div>
  )
}
