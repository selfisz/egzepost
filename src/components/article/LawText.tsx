import type { ReactNode } from 'react'
import { renderLegalText } from '../../lib/legal-highlight'
import { cn } from '../../lib/cn'
import type { Article, ArticleBlock } from '../../types'

const XREF = /((?:art\.|artykuł)\s*\d+[a-z]*(?:\s*§\s*\d+[a-z]*)?)/gi

type Opts = { onXref?: (raw: string) => void; highlight?: boolean }

function inline(text: string, { onXref, highlight }: Opts): ReactNode {
  if (highlight) return renderLegalText(text, { onXref })
  if (!onXref) return text
  const parts = text.split(XREF)
  return parts.map((p, i) => {
    if (i % 2 === 0) return p
    // "art. 9 ustawy z dnia …" points to another statute — not resolvable here.
    if (/^\s*(ustawy|ustawie|rozporządzenia)/.test(parts[i + 1] ?? '')) return p
    return (
      <button key={i} type="button" className="xref" onClick={() => onXref(p)}>
        {p}
      </button>
    )
  })
}

function Block({ b, opts }: { b: ArticleBlock; opts: Opts }) {
  if (b.type === 'text') return <p className="mb-3 last:mb-0">{inline(b.text, opts)}</p>
  if (b.type === 'para')
    return (
      <div className="mb-5 grid grid-cols-[2.6rem_1fr] last:mb-0">
        <span className="pt-[1px] font-serif text-[0.84em] font-semibold text-act tabular-nums">
          {b.marker.replace(/\.$/, '')}
        </span>
        <div>
          {b.text && <p>{inline(b.text, opts)}</p>}
          {!!b.children?.length && (
            <div className="mt-2.5 space-y-2">
              {b.children.map((c, i) => (
                <Block key={i} b={c} opts={opts} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  if (b.type === 'point')
    return (
      <div className="grid grid-cols-[2.1rem_1fr]">
        <span className="pt-[0.2em] font-mono text-[0.7em] font-medium text-muted tabular-nums">{b.marker}</span>
        <div>
          <p>{inline(b.text, opts)}</p>
          {!!b.children?.length && (
            <div className="mt-1.5 space-y-1.5">
              {b.children.map((c, i) => (
                <Block key={i} b={c} opts={opts} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  return (
    <div className="grid grid-cols-[1.6rem_1fr] text-ink-2">
      <span className="font-serif text-muted italic">{b.marker}</span>
      <p>{inline(b.text, opts)}</p>
    </div>
  )
}

export function LawText({
  article,
  size = 'lg',
  onXref,
  highlight,
  className,
}: {
  article: Article
  size?: 'lg' | 'md'
  onXref?: (raw: string) => void
  highlight?: boolean
  className?: string
}) {
  const blocks = article.blocks?.length ? article.blocks : [{ type: 'text' as const, text: article.text }]
  return (
    <div
      className={cn(
        'law text-ink',
        size === 'lg' ? 'text-[18px] leading-[1.62]' : 'text-[16px] leading-[1.58]',
        className,
      )}
    >
      {blocks.map((b, i) => (
        <Block key={i} b={b} opts={{ onXref, highlight }} />
      ))}
    </div>
  )
}
