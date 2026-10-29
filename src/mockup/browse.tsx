import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  ChevronRight,
  Copy,
  Search,
  Sparkles,
} from "lucide-react";
import type { Act, ActId, Chapter, MockData } from "./data";
import { ACT_IDS, articleRange, chapterLabel } from "./data";
import { ACT_META, Emblem } from "./identity";
import { LawText } from "./law";
import { href, Ring, SectionLabel } from "./ui";

/** Proportional "struktura" strip: one segment per Dział. */
function StructureStrip({
  act,
  className = "",
}: {
  act: Act;
  className?: string;
}) {
  return (
    <div
      className={`flex h-1.5 gap-[3px] overflow-hidden rounded-full ${className}`}
    >
      {act.divisions.map((d, i) => (
        <div
          key={i}
          className="rounded-full bg-act"
          style={{ flexGrow: d.articleCount, opacity: 1 - (i % 2) * 0.35 }}
        />
      ))}
    </div>
  );
}

function stats(act: Act) {
  const chapters = act.chapters.filter((c) => c.no).length;
  return {
    articles: act.articleCount,
    divisions: act.divisions.length,
    chapters,
  };
}

export function ActCover({
  act,
  size = "lg",
}: {
  act: Act;
  size?: "lg" | "sm";
}) {
  const m = ACT_META[act.id];
  const s = stats(act);
  if (size === "sm")
    return (
      <a
        href={href(`akt/${act.id}`)}
        className={`act-${act.id} flex w-[148px] shrink-0 flex-col rounded-2xl bg-act-tint p-4 text-act-ink`}
      >
        <Emblem act={act.id} className="size-7 text-act" />
        <div className="mt-6 font-serif text-[22px] leading-none font-semibold">
          {m.short}
        </div>
        <div className="mt-1.5 text-[12px] leading-snug opacity-75">
          {m.nick}
        </div>
        <StructureStrip act={act} className="mt-4" />
      </a>
    );
  return (
    <a
      href={href(`akt/${act.id}`)}
      className={`act-${act.id} group relative block overflow-hidden rounded-[26px] bg-act-tint p-6 text-act-ink transition active:scale-[0.99]`}
    >
      <Emblem
        act={act.id}
        className="pointer-events-none absolute -top-6 -right-6 size-40 text-act opacity-[0.09]"
      />
      <div className="flex items-center gap-2.5">
        <span className="grid size-10 place-items-center rounded-xl bg-act text-white dark:text-black/80">
          <Emblem act={act.id} className="size-6" />
        </span>
        <span className="text-[12px] font-semibold tracking-[0.14em] uppercase opacity-70">
          {m.nick}
        </span>
      </div>
      <div className="mt-8 font-serif text-[38px] leading-none font-semibold tracking-tight">
        {m.short}
      </div>
      <div className="mt-2 max-w-[18rem] text-[15px] leading-snug">
        {m.name}
      </div>
      <div className="mt-1 text-[12.5px] opacity-60">
        {act.displayAddress.replace(" (tekst jednolity)", "")} · t.j.
      </div>
      <StructureStrip act={act} className="mt-6" />
      <div className="mt-3 flex items-center gap-4 text-[13px] tabular-nums">
        <span>
          <b className="font-semibold">{s.articles}</b> art.
        </span>
        <span>
          <b className="font-semibold">{s.divisions}</b> działów
        </span>
        <span>
          <b className="font-semibold">{s.chapters}</b> rozdz.
        </span>
        <ArrowRight className="ml-auto size-5 transition group-hover:translate-x-0.5" />
      </div>
    </a>
  );
}

export function Home({ data }: { data: MockData }) {
  const last = data.byId.get("upea:33")!;
  const lastCh = data.acts.upea.chapterOf.get(last.id)!;
  return (
    <div className="px-5 pt-2 md:px-8 md:pt-8">
      <div className="text-[13px] text-muted">Czwartek, 29 października</div>
      <h1 className="mt-1 font-serif text-[32px] leading-tight font-semibold tracking-tight">
        Dzień dobry.
      </h1>

      <a
        href={href("szukaj")}
        className="mt-5 flex h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 text-muted shadow-[0_1px_0_rgba(0,0,0,0.03)]"
      >
        <Search className="size-5" strokeWidth={1.8} />
        <span className="text-[15px]">
          Słowo, zagadnienie albo „art. 33 upea”
        </span>
      </a>

      <a
        href={href("nauka/karta/1")}
        className="mt-4 flex items-center gap-4 rounded-[22px] bg-hero p-5 text-hero-fg ring-1 ring-gold/15"
      >
        <div className="relative grid place-items-center text-gold">
          <Ring value={0.35} size={56} stroke={5} />
          <span className="absolute text-[13px] font-semibold text-hero-fg tabular-nums">
            4/12
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold tracking-[0.14em] text-gold uppercase">
            Trening na dziś
          </div>
          <div className="mt-0.5 text-[17px] font-semibold">
            Zostało 8 kart · 4 min
          </div>
          <div className="mt-0.5 truncate text-[13px] opacity-60">
            Powtórki u.p.e.a. i Kpa · nowe: Zasady prowadzenia egzekucji
          </div>
        </div>
        <ArrowRight className="size-5 opacity-70" />
      </a>

      <SectionLabel className="mt-9 mb-3">Czytaj dalej</SectionLabel>
      <a
        href={href(`art/${last.id}`)}
        className="act-upea flex gap-4 rounded-2xl border border-line bg-surface p-4"
      >
        <div className="w-1 shrink-0 rounded-full bg-act" />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-muted">
            u.p.e.a. · {chapterLabel(lastCh)} · {lastCh.title}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-serif text-[19px] font-semibold">
              {last.label}
            </span>
            <span className="truncate text-[15px] text-ink-2">
              {last.title}
            </span>
          </div>
          <p className="law mt-1.5 line-clamp-2 text-[14.5px] leading-snug text-muted">
            {last.blocks[0]?.text}
          </p>
        </div>
      </a>

      <div className="mt-9 mb-3 flex items-end justify-between">
        <SectionLabel>Akty</SectionLabel>
        <a
          href={href("przegladaj")}
          className="text-[13px] font-medium text-ink-2"
        >
          Wszystkie
        </a>
      </div>
      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
        {ACT_IDS.map((id) => (
          <ActCover key={id} act={data.acts[id]} size="sm" />
        ))}
      </div>

      <SectionLabel className="mt-9 mb-3">Twoje skróty</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {[
          "zarzut",
          "tytuł wykonawczy",
          "doręczenie zastępcze",
          "przedawnienie",
          "koszty upomnienia",
        ].map((t) => (
          <a
            key={t}
            href={href(`szukaj?q=${encodeURIComponent(t)}`)}
            className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13.5px] text-ink-2"
          >
            {t}
          </a>
        ))}
      </div>
    </div>
  );
}

export function BrowseList({ data }: { data: MockData }) {
  return (
    <div className="px-5 pt-2 md:px-8 md:pt-8">
      <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight">
        Przeglądaj
      </h1>
      <p className="mt-1 text-[15px] text-muted">
        Trzy akty, tekst jednolity z ISAP.
      </p>
      <div className="mt-6 space-y-4">
        {ACT_IDS.map((id) => (
          <ActCover key={id} act={data.acts[id]} />
        ))}
      </div>
      <p className="mt-6 text-center text-[12px] text-muted">
        Tytuły artykułów w nawiasach są redakcyjne (Legalis) — nie są częścią
        ustawy.
      </p>
    </div>
  );
}

export function ActOverview({ data, actId }: { data: MockData; actId: ActId }) {
  const act = data.acts[actId];
  const m = ACT_META[actId];
  const s = stats(act);
  return (
    <div className={`act-${actId}`}>
      <div className="px-5 md:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-act text-white dark:text-black/80">
            <Emblem act={actId} className="size-6" />
          </span>
          <div>
            <div className="font-serif text-[28px] leading-none font-semibold">
              {m.short}
            </div>
            <div className="mt-1 text-[13px] text-muted">{m.name}</div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-surface py-3 text-center">
          {[
            [s.articles, "artykułów"],
            [s.divisions, "działów"],
            [s.chapters, "rozdziałów"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="font-serif text-[22px] font-semibold tabular-nums">
                {n}
              </div>
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
              <span className="font-mono text-[12px] font-semibold text-act">
                DZIAŁ {d.no}
              </span>
              <span className="min-w-0 flex-1 truncate font-serif text-[18px] font-semibold">
                {d.title}
              </span>
              <span className="text-[12px] text-muted tabular-nums">
                {d.articleCount}
              </span>
            </div>
            <div className="mt-1 overflow-hidden rounded-2xl border border-line bg-surface">
              {d.chapters.map((c) => (
                <ChapterRow
                  key={c.index}
                  act={act}
                  ch={c}
                  max={maxChapter(act)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function maxChapter(act: Act) {
  return Math.max(...act.chapters.map((c) => c.articles.length));
}

function ChapterRow({ act, ch, max }: { act: Act; ch: Chapter; max: number }) {
  return (
    <a
      href={href(`akt/${act.id}/r/${ch.index}`)}
      className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0 active:bg-sunk"
    >
      <span className="w-9 shrink-0 font-mono text-[12px] text-muted">
        {ch.no ? `R. ${ch.no}` : "—"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-snug font-medium">{ch.title}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-sunk">
            <div
              className="h-full rounded-full bg-act/70"
              style={{ width: `${(ch.articles.length / max) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-[11.5px] text-muted tabular-nums">
            {articleRange(ch)}
          </span>
        </div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted" />
    </a>
  );
}

export function ChapterView({
  data,
  actId,
  index,
}: {
  data: MockData;
  actId: ActId;
  index: number;
}) {
  const act = data.acts[actId];
  const ch = act.chapters[index];
  if (!ch) return null;
  return (
    <div className={`act-${actId} px-5 md:px-8`}>
      <div className="text-[12px] font-semibold tracking-[0.12em] text-act uppercase">
        Dział {ch.divisionNo} · {chapterLabel(ch)}
      </div>
      <h1 className="mt-1.5 font-serif text-[28px] leading-tight font-semibold tracking-tight">
        {ch.title}
      </h1>
      <div className="mt-1 text-[13px] text-muted">
        {articleRange(ch)} · {ch.articles.length} przepisów
      </div>
      <div className="mt-4 flex gap-2">
        <a
          href={href(`art/${ch.articles[0].id}?tryb=rozdzial`)}
          className="rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-paper"
        >
          Czytaj cały rozdział
        </a>
        <a
          href={href("nauka")}
          className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13.5px] font-medium"
        >
          <Sparkles className="size-4 text-gold" /> Etap w Nauce
        </a>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        {ch.articles.map((a) =>
          a.title === "uchylony" || /^\(uchylony\)/.test(a.text) ? (
            <div
              key={a.id}
              className="flex gap-3 border-b border-line px-4 py-2 text-[13px] text-muted last:border-b-0"
            >
              <span className="w-12 shrink-0 font-serif tabular-nums">
                {a.number}
              </span>
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
                <div className="text-[15px] font-medium">
                  {a.title ?? a.label}
                </div>
                <p className="law mt-0.5 line-clamp-2 text-[14px] leading-snug text-muted">
                  {a.blocks[0]?.text || a.excerpt}
                </p>
              </div>
            </a>
          ),
        )}
      </div>
    </div>
  );
}

export function Reader({
  data,
  articleId,
  chapterMode,
}: {
  data: MockData;
  articleId: string;
  chapterMode: boolean;
}) {
  const a = data.byId.get(articleId);
  if (!a)
    return <div className="p-8 text-muted">Brak w bazie: {articleId}</div>;
  const act = data.acts[a.actId as ActId];
  const ch = act.chapterOf.get(a.id)!;
  const i = act.articles.indexOf(a);
  const prev = act.articles[i - 1];
  const next = act.articles[i + 1];
  const list = chapterMode ? ch.articles : [a];
  return (
    <div className={`act-${act.id} px-5 md:px-8`}>
      <a
        href={href(`akt/${act.id}/r/${ch.index}`)}
        className="flex items-center gap-1.5 text-[12.5px] text-muted"
      >
        <Emblem act={act.id} className="size-3.5 text-act" />
        <span className="font-semibold text-act">{act.shortName}</span>
        <span>·</span>
        <span className="truncate">
          {chapterLabel(ch)} · {ch.title}
        </span>
      </a>

      <div className="mt-4 inline-flex rounded-full bg-sunk p-1 text-[13px] font-medium">
        <a
          href={href(`art/${a.id}`)}
          className={`rounded-full px-3.5 py-1.5 ${!chapterMode ? "bg-surface shadow-sm" : "text-muted"}`}
        >
          Artykuł
        </a>
        <a
          href={href(`art/${a.id}?tryb=rozdzial`)}
          className={`rounded-full px-3.5 py-1.5 ${chapterMode ? "bg-surface shadow-sm" : "text-muted"}`}
        >
          Cały rozdział
        </a>
      </div>

      {list.map((art) => (
        <article
          key={art.id}
          className="mx-auto max-w-2xl border-b border-line py-7 last:border-b-0"
        >
          <div className="flex items-baseline gap-3">
            <h1 className="font-serif text-[34px] leading-none font-semibold tracking-tight">
              {art.label}
            </h1>
          </div>
          {art.title && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[17px] font-semibold text-ink-2">
                {art.title}
              </span>
              <span
                title="Tytuł redakcyjny z Legalis — nie jest częścią tekstu ustawy"
                className="rounded-md border border-line px-1.5 py-0.5 text-[10.5px] font-medium text-muted"
              >
                tytuł red.
              </span>
            </div>
          )}
          <div className="mt-6">
            <LawText article={art} />
          </div>
        </article>
      ))}

      {!chapterMode && (
        <>
          <div className="mx-auto mt-2 flex max-w-2xl gap-2">
            {[
              [Copy, "Kopiuj cytat"],
              [Bookmark, "Zapisz"],
              [ArrowUpRight, "ISAP"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Copy;
              return (
                <button
                  key={label as string}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface py-2.5 text-[13.5px] font-medium"
                >
                  <I className="size-4" strokeWidth={1.8} /> {label as string}
                </button>
              );
            })}
          </div>
          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 pb-4">
            {prev ? (
              <a
                href={href(`art/${prev.id}`)}
                className="rounded-2xl border border-line p-3.5"
              >
                <div className="text-[11.5px] text-muted">← Poprzedni</div>
                <div className="mt-1 text-[14px] font-semibold">
                  {prev.label}
                </div>
                <div className="truncate text-[12.5px] text-muted">
                  {prev.title}
                </div>
              </a>
            ) : (
              <span />
            )}
            {next && (
              <a
                href={href(`art/${next.id}`)}
                className="rounded-2xl border border-line p-3.5 text-right"
              >
                <div className="text-[11.5px] text-muted">Następny →</div>
                <div className="mt-1 text-[14px] font-semibold">
                  {next.label}
                </div>
                <div className="truncate text-[12.5px] text-muted">
                  {next.title}
                </div>
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
