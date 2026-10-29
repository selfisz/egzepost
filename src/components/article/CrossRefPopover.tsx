import * as Popover from '@radix-ui/react-popover'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ActMeta, Article } from '../../types'
import { ArticleBody } from './ArticleBody'
import { actShort } from '../../lib/data'
import { cn } from '../../lib/cn'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  article: Article | null
  acts: ActMeta[]
  anchorLabel?: string
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const fn = () => setMobile(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return mobile
}

export function CrossRefPopover({ open, onOpenChange, article, acts }: Props) {
  const mobile = useIsMobile()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  if (!article) return null

  const header = (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <ActBadge actId={article.actId} acts={acts} />
          <span className="font-mono text-lg font-bold">{article.label}</span>
        </div>
        {article.title && (
          <p className="mb-1 text-sm font-medium text-slate-700 dark:text-zinc-300">{article.title}</p>
        )}
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Podgląd odesłania · Esc zamyka
        </p>
      </div>
      <button
        type="button"
        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
        onClick={() => onOpenChange(false)}
        aria-label="Zamknij"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )

  const body = (
    <div className="max-h-[60vh] overflow-y-auto pr-1">
      <ArticleBody article={article} />
    </div>
  )

  if (mobile) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <Dialog.Title className="sr-only">Podgląd przepisu</Dialog.Title>
            {header}
            {body}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Anchor asChild>
        <span className="fixed left-1/2 top-24 -translate-x-1/2" />
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          className={cn(
            'z-50 w-[min(560px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl outline-none',
            'dark:border-zinc-700 dark:bg-zinc-900',
          )}
        >
          {header}
          {body}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function ActBadge({ actId, acts }: { actId: string; acts: ActMeta[] }) {
  const short = actShort(acts, actId)
  const tone =
    actId === 'upea'
      ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
      : actId === 'ordynacja'
        ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold',
        tone,
      )}
    >
      {short}
    </span>
  )
}
