import type { Article, ArticleBlock } from '../../types'
import { renderLegalText } from '../../lib/legal-highlight'
import { cn } from '../../lib/cn'

type Props = {
  article: Article
  query?: string
  onXref?: (raw: string) => void
  className?: string
}

function BlockView({
  block,
  query,
  onXref,
  depth = 0,
}: {
  block: ArticleBlock
  query?: string
  onXref?: (raw: string) => void
  depth?: number
}) {
  if (block.type === 'text') {
    return <p className="leading-relaxed text-slate-800 dark:text-zinc-200">{renderLegalText(block.text, { query, onXref })}</p>
  }

  if (block.type === 'para') {
    return (
      <div className="space-y-2">
        <p className="leading-relaxed text-slate-800 dark:text-zinc-200">
          <span className="mr-2 font-mono text-sm font-semibold text-slate-500 dark:text-zinc-400">
            {block.marker}
          </span>
          {renderLegalText(block.text, { query, onXref })}
        </p>
        {block.children?.map((c, i) => (
          <BlockView key={i} block={c} query={query} onXref={onXref} depth={depth + 1} />
        ))}
      </div>
    )
  }

  if (block.type === 'point') {
    return (
      <div className={cn('space-y-2 border-l-2 border-slate-200 pl-4 dark:border-zinc-700', depth > 0 && 'ml-1')}>
        <p className="leading-relaxed text-slate-800 dark:text-zinc-200">
          <span className="mr-2 font-mono text-sm font-bold text-slate-700 dark:text-zinc-300">
            {block.marker}
          </span>
          {renderLegalText(block.text, { query, onXref })}
        </p>
        {block.children?.map((c, i) => (
          <BlockView key={i} block={c} query={query} onXref={onXref} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <div className="border-l-2 border-slate-200 pl-4 dark:border-zinc-700">
      <p className="leading-relaxed text-slate-800 dark:text-zinc-200">
        <span className="mr-2 font-mono text-sm font-bold text-slate-700 dark:text-zinc-300">
          {block.marker}
        </span>
        {renderLegalText(block.text, { query, onXref })}
      </p>
    </div>
  )
}

export function ArticleBody({ article, query, onXref, className }: Props) {
  const blocks = article.blocks?.length ? article.blocks : [{ type: 'text' as const, text: article.text }]
  return (
    <div className={cn('max-w-2xl space-y-3', className)}>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} query={query} onXref={onXref} />
      ))}
    </div>
  )
}
