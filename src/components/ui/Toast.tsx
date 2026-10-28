import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ToastItem = { id: string; message: string }

type ToastCtx = { push: (message: string) => void }

const Ctx = createContext<ToastCtx>({ push: () => undefined })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string) => {
    const id = crypto.randomUUID()
    setItems((prev) => [...prev, { id, message }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 2200)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 flex w-[min(420px,calc(100%-1.5rem))] -translate-x-1/2 flex-col gap-2 md:bottom-6">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-xl border border-slate-200 bg-white/95 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-lg backdrop-blur',
              'dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-100',
              'animate-[rise_0.25s_ease]',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  return useContext(Ctx)
}
