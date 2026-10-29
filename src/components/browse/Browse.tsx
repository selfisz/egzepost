import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react'
import type { ActId, ActStructure, Chapter, Library } from '../../lib/structure'
import { articleRange, chapterLabel, isRepealed, plural } from '../../lib/structure'
import { cn } from '../../lib/cn'
import { ACT_META, Emblem, actClass } from '../shell/identity'
import { href } from '../shell/router'
import { SectionLabel } from '../shell/Shell'

/** Proportional strip: one segment per Dział, sized by article count. */
export function StructureStrip({ act, className }: { act: ActStructure; className?: string }) {
  return (
    <div className={cn('flex h-1.5 gap-[3px] overflow-hidden rounded-full', className)} aria-hidden>
      {act.divisions.map((d, i) => (
        <div
          key={i}
          className="rounded-full bg-act"
          style={{ flexGrow: d.articleCount, opacity: 1 - (i % 2) * 0.35 }}
        />
      ))}
    </div>
  )
}

export function actStats(act: ActStructure) {
  return {
    articles: act.articleCount,
    divisions: act.divisions.length,
    chapters: act.chapters.filter((c) => c.no).length,
  }
}

export function ActCover({ act, size = 'lg' }: { act: ActStructure; size?: 'lg' | 'sm' }) {
  const m = ACT_META[act.id]
  const s = actStats(act)
  if (size === 'sm')
    return (
      <a
        href={href(`akt/${act.id}`)}
        className={cn(actClass(act.id), 'flex w-[148px] shrink-0 flex-col rounded-2xl bg-act-tint p-4 text-act-ink')}
      >
        <Emblem act={act.id} className="size-7 text-act" />
        <div className="mt-6 font-serif text-[22px] leading-none font-semibold">{m.short}</div>
        <div className="mt-1.5 text-[12px] leading-snug opacity-75">{m.nick}</div>
        <StructureStrip act={act} className="mt-4" />
      </a>
    )
  return (
    <a
      href={href(`akt/${act.id}`)}
      className={cn(
        actClass(act.id),
        'group relative block overflow-hidden rounded-[26px] bg-act-tint p-6 text-act-ink transition active:scale-[0.99]',
      )}
    >
      <Emblem act={act.id} className="pointer-events-none absolute -top-6 -right-6 size-40 text-act opacity-[0.09]" />
      <div className="flex items-center gap-2.5">
        <span className="grid size-10 place-items-center rounded-xl bg-act text-white dark:text-black/80">
          <Emblem act={act.id} className="size-6" />
        </span>
        <span className="text-[12px] font-semibold tracking-[0.14em] uppercase opacity-70">{m.nick}</span>
      </div>
      <div className="mt-8 font-serif text-[38px] leading-none font-semibold tracking-tight">{m.short}</div>
      <div className="mt-2 max-w-[18rem] text-[15px] leading-snug">{m.name}</div>
      <div className="mt-1 text-[12.5px] opacity-60">{act.displayAddress.replace(' (tekst jednolity)', '')} · t.j.</div>
      <StructureStrip act={act} className="mt-6" />
      <div className="mt-3 flex items-center gap-4 text-[13px] tabular-nums">
        <span>
          <b className="font-semibold">{s.articles}</b> art.
        </span>
        <span>
          <b className="font-semibold">{s.divisions}</b> {plural(s.divisions, 'dział', 'działy', 'działów')}
        </span>
        <span>
          <b className="font-semibold">{s.chapters}</b> rozdz.
        </span>
        <ArrowRight className="ml-auto size-5 transition group-hover:translate-x-0.5" />
      </div>
    </a>
  )
}

export function ActList({ lib }: { lib: Library }) {
  return (
    <div className="px-5 pt-2 md:px-8 md:pt-8">
      <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight">Przeglądaj</h1>
      <p className="mt-1 text-[15px] text-muted">Trzy akty, tekst jednolity z ISAP.</p>
      <div className="mt-6 space-y-4">
        {lib.list.map((act) => (
          <ActCover key={act.id} act={act} />
        ))}
      </div>
      <p className="mt-6 text-center text-[12px] text-muted">
        Tytuły artykułów są redakcyjne (Legalis) — nie są częścią ustawy.
      </p>
    </div>
  )
}

export function ActOverview({ act }: { act: ActStructure }) {
  const m = ACT_META[act.id]
  const s = actStats(act)
  const max = Math.max(...act.chapters.map((c) => c.articles.length))
  return (
    <div className={actClass(act.id)}>
      <div className="px-5 md:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-act text-white dark:text-black/80">
            <Emblem act={act.id} className="size-6" />
          </span>
          <div>
            <h1 className="font-serif text-[28px] leading-none font-semibold">{m.short}</h1>
            <div className="mt-1 text-[13px] text-muted">{m.name}</div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-surface py-3 text-center">
          {(
            [
              [s.articles, 'artykułów'],
              [s.divisions, 'działów'],
              [s.chapters, 'rozdziałów'],
            ] as const
          ).map(([n, l]) => (
            <div key={l}>
              <div className="font-serif text-[22px] font-semibold tabular-nums">{n}</div>
              <div className="text-[12px] text-muted">{l}</div>
            </div>
          ))}
        </div>
        <SectionLabel className="mt-8 mb-1">Mapa ustawy</SectionLabel>
      </div>

      <div className="mt-2 space-y-7 px-5 md:px-8">
        {act.divisions.map((d, di) => (
          <section key={di}>
            <div className="sticky top-14 z-10 -mx-5 flex items-baseline gap-3 bg-paper/90 px-5 py-2 backdrop-blur md:-mx-8 md:px-8">
              <span className="shrink-0 font-mono text-[12px] font-semibold text-act">DZIAŁ {d.no}</span>
              <h2 className="min-w-0 flex-1 truncate font-serif text-[18px] font-semibold">{d.title}</h2>
              <span className="text-[12px] text-muted tabular-nums">{d.articleCount}</span>
            </div>
            <div className="mt-1 overflow-hidden rounded-2xl border border-line bg-surface">
              {d.chapters.map((c) => (
                <ChapterRow key={c.index} act={act} ch={c} max={max} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function ChapterRow({ act, ch, max }: { act: ActStructure; ch: Chapter; max: number }) {
  return (
    <a
      href={href(`akt/${act.id}/r/${ch.index}`)}
      className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0 active:bg-sunk"
    >
      <span className="w-9 shrink-0 font-mono text-[12px] text-muted">{ch.no ? `R. ${ch.no}` : '—'}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-snug font-medium">{ch.title}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-sunk">
            <div className="h-full rounded-full bg-act/70" style={{ width: `${(ch.articles.length / max) * 100}%` }} />
          </div>
          <span className="shrink-0 text-[11.5px] text-muted tabular-nums">{articleRange(ch)}</span>
        </div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted" />
    </a>
  )
}

export function ChapterView({ act, ch }: { act: ActStructure; ch: Chapter }) {
  return (
    <div className={cn(actClass(act.id), 'px-5 md:px-8')}>
      <div className="text-[12px] font-semibold tracking-[0.12em] text-act uppercase">
        Dział {ch.divisionNo} · {chapterLabel(ch)}
      </div>
      <h1 className="mt-1.5 font-serif text-[28px] leading-tight font-semibold tracking-tight">{ch.title}</h1>
      <div className="mt-1 text-[13px] text-muted">
        {articleRange(ch)} · {ch.articles.length} {plural(ch.articles.length, 'przepis', 'przepisy', 'przepisów')}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={href(`art/${ch.articles[0].id}?tryb=rozdzial`)}
          className="rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-paper"
        >
          Czytaj cały rozdział
        </a>
        <a
          href={href(`nauka?akt=${act.id as ActId}`)}
          className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13.5px] font-medium"
        >
          <Sparkles className="size-4 text-gold" /> Etap w Nauce
        </a>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        {ch.articles.map((a) =>
          isRepealed(a) ? (
            <div key={a.id} className="flex gap-3 border-b border-line px-4 py-2 text-[13px] text-muted last:border-b-0">
              <span className="w-12 shrink-0 font-serif tabular-nums">{a.number}</span>
              <span className="italic">uchylony</span>
            </div>
          ) : (
            <a
              key={a.id}
              href={href(`art/${a.id}`)}
              className="flex gap-3 border-b border-line px-4 py-3.5 last:border-b-0 active:bg-sunk"
            >
              <span className="w-12 shrink-0 pt-[1px] font-serif text-[16px] font-semibold text-act tabular-nums">
                {a.number}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium">{a.title ?? a.label}</div>
                <p className="law mt-0.5 line-clamp-2 text-[14px] leading-snug text-muted">
                  {a.blocks[0]?.text || a.excerpt}
                </p>
              </div>
            </a>
          ),
        )}
      </div>
    </div>
  )
}
