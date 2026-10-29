import { ArrowRight, Search as SearchIcon, X } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { Article } from "../types";
import type { ActId, MockData } from "./data";
import { ACT_IDS, chapterLabel } from "./data";
import { ACT_META, Emblem } from "./identity";
import { go, href, SectionLabel } from "./ui";

const FOLD: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

/** Same-length fold so match offsets map 1:1 back onto the original text. */
function fold(s: string) {
  let out = "";
  for (const ch of s.toLowerCase()) out += FOLD[ch] ?? ch;
  return out;
}

const ACT_ALIASES: [RegExp, ActId][] = [
  [/\b(upea|egzek\w*)\b/, "upea"],
  [/\bkpa\b/, "kpa"],
  [/\b(op|ordynacj\w*)\b/, "ordynacja"],
];

function parseRef(
  q: string,
): { number: string; para?: string; act?: ActId } | null {
  const f = fold(q);
  const m = f.match(
    /^\s*(?:art\.?\s*)?(\d+[a-z]{0,2})\b\s*(?:§\s*(\d+[a-z]?))?\s*(.*)$/,
  );
  if (!m || (!/art/.test(f) && !m[3])) return null;
  const rest = (m[3] ?? "").replace(/\./g, "");
  const act = ACT_ALIASES.find(([re]) => re.test(rest))?.[1];
  if (!/art/.test(f) && !act) return null;
  return { number: m[1], para: m[2], act };
}

function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one
  const d = n % 10
  const t = n % 100
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many
}

type Hit = {
  article: Article;
  score: number;
  snippet: ReactNode;
  inTitle: boolean;
};

function snippetFor(text: string, terms: string[]): ReactNode {
  const ft = fold(text);
  const first =
    terms
      .map((t) => ft.indexOf(t))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b)[0] ?? 0;
  let start = Math.max(0, first - 50);
  if (start > 0) start = text.lastIndexOf(" ", start) + 1;
  let end = Math.min(text.length, first + 150);
  if (end < text.length) end = Math.max(text.indexOf(" ", end), first + 1);
  if (end < 0) end = text.length;
  const slice = text.slice(start, end);
  const fslice = ft.slice(start, end);
  const ranges: [number, number][] = [];
  for (const t of terms) {
    let i = fslice.indexOf(t);
    while (i >= 0) {
      let e = i + t.length;
      while (e < fslice.length && /[\p{L}]/u.test(fslice[e])) e++;
      ranges.push([i, e]);
      i = fslice.indexOf(t, e);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const out: ReactNode[] = [];
  let pos = 0;
  ranges.forEach(([s, e], k) => {
    if (s < pos) return;
    out.push(slice.slice(pos, s));
    out.push(
      <mark key={k} className="hit">
        {slice.slice(s, e)}
      </mark>,
    );
    pos = e;
  });
  out.push(slice.slice(pos));
  return (
    <>
      {start > 0 && "…"}
      {out}
      {end < text.length && "…"}
    </>
  );
}

function highlight(text: string, terms: string[]): ReactNode {
  const ft = fold(text);
  const t = terms.find((x) => ft.includes(x));
  if (!t) return text;
  const i = ft.indexOf(t);
  let e = i + t.length;
  while (e < ft.length && /[\p{L}]/u.test(ft[e])) e++;
  return (
    <>
      {text.slice(0, i)}
      <mark className="hit">{text.slice(i, e)}</mark>
      {text.slice(e)}
    </>
  );
}

function runSearch(data: MockData, q: string, scope: ActId | "all") {
  const terms = fold(q)
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((t) => t.length > 1)
    .map((t) => (t.length > 5 ? t.slice(0, t.length - 1) : t));
  const groups: Record<ActId, Hit[]> = { upea: [], kpa: [], ordynacja: [] };
  if (!terms.length) return { groups, terms, total: 0 };
  let total = 0;
  for (const id of ACT_IDS) {
    if (scope !== "all" && scope !== id) continue;
    for (const a of data.acts[id].articles) {
      const ft = fold(a.text);
      const ftitle = fold(a.title ?? "");
      if (!terms.every((t) => ft.includes(t) || ftitle.includes(t))) continue;
      const inTitle = terms.some((t) => ftitle.includes(t));
      const phrase = ft.includes(terms.join(" "));
      const freq = terms.reduce((n, t) => n + ft.split(t).length - 1, 0);
      groups[id].push({
        article: a,
        inTitle,
        score: (inTitle ? 50 : 0) + (phrase ? 20 : 0) + Math.min(freq, 10),
        snippet: snippetFor(a.text.replace(/\n/g, " "), terms),
      });
      total++;
    }
    groups[id].sort((x, y) => y.score - x.score);
  }
  return { groups, terms, total };
}

export function SearchScreen({
  data,
  initial,
}: {
  data: MockData;
  initial: string;
}) {
  const [q, setQ] = useState(initial);
  const [scope, setScope] = useState<ActId | "all">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const ref = useMemo(() => parseRef(q), [q]);
  const refHits = useMemo(() => {
    if (!ref) return [];
    const acts = ref.act ? [ref.act] : ACT_IDS;
    return acts
      .map((id) => data.acts[id].byNumber.get(ref.number))
      .filter(Boolean) as Article[];
  }, [ref, data]);
  const res = useMemo(
    () => runSearch(data, ref ? "" : q, scope),
    [data, q, scope, ref],
  );

  const commit = (v: string) => {
    setQ(v);
    history.replaceState(null, "", href(`szukaj?q=${encodeURIComponent(v)}`));
  };

  return (
    <div className="px-5 pt-2 md:px-8 md:pt-8">
      <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight">
        Szukaj
      </h1>
      <div className="sticky top-14 z-10 -mx-5 bg-paper/90 px-5 pt-3 pb-3 backdrop-blur md:-mx-8 md:px-8">
        <label className="flex h-13 items-center gap-3 rounded-2xl border border-line bg-surface px-4 focus-within:border-ink/40">
          <SearchIcon className="size-5 text-muted" strokeWidth={1.8} />
          <input
            value={q}
            onChange={(e) => commit(e.target.value)}
            placeholder="np. zarzut, doręczenie, art. 33 upea"
            className="h-12 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
          />
          {q && (
            <button
              onClick={() => commit("")}
              aria-label="Wyczyść"
              className="text-muted"
            >
              <X className="size-5" />
            </button>
          )}
        </label>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {(["all", ...ACT_IDS] as const).map((id) => {
            const active = scope === id;
            const count = id === "all" ? res.total : res.groups[id].length;
            return (
              <button
                key={id}
                onClick={() => setScope(id)}
                className={`${id !== "all" ? `act-${id}` : ""} flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-surface text-ink-2"
                }`}
              >
                {id !== "all" && (
                  <Emblem
                    act={id}
                    className={`size-3.5 ${active ? "" : "text-act"}`}
                  />
                )}
                {id === "all" ? "Wszystkie" : ACT_META[id].short}
                {q && !ref && (
                  <span className="tabular-nums opacity-60">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!q && (
        <div className="mt-4">
          <SectionLabel className="mb-3">Spróbuj</SectionLabel>
          <div className="space-y-2">
            {[
              "art. 33 upea",
              "zarzut w sprawie egzekucji",
              "doręczenie",
              "przedawnienie zobowiązania",
              "art. 7 kpa",
            ].map((s) => (
              <button
                key={s}
                onClick={() => commit(s)}
                className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-left text-[15px]"
              >
                {s}
                <ArrowRight className="size-4 text-muted" />
              </button>
            ))}
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-muted">
            Wpisz numer („art. 33”, „33 kpa”), słowo albo całe wyrażenie.
            Wielkość liter i polskie znaki nie mają znaczenia.
          </p>
        </div>
      )}

      {ref && (
        <div className="mt-3 space-y-3">
          <SectionLabel>Przepis</SectionLabel>
          {refHits.length === 0 && (
            <div className="text-muted">Brak w bazie: art. {ref.number}</div>
          )}
          {refHits.map((a) => {
            const ch = data.acts[a.actId as ActId].chapterOf.get(a.id)!;
            return (
              <a
                key={a.id}
                href={href(`art/${a.id}`)}
                className={`act-${a.actId} block rounded-[22px] bg-act-tint p-5 text-act-ink`}
              >
                <div className="flex items-center gap-2 text-[12.5px] font-semibold">
                  <Emblem act={a.actId as ActId} className="size-4 text-act" />{" "}
                  {ACT_META[a.actId as ActId].short}
                  <span className="font-normal opacity-60">
                    · {chapterLabel(ch)}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2.5">
                  <span className="font-serif text-[28px] leading-none font-semibold">
                    {a.label}
                  </span>
                  <span className="text-[16px] font-medium">{a.title}</span>
                </div>
                <p className="law mt-3 line-clamp-3 text-[15px] leading-snug opacity-85">
                  {a.blocks[0]?.type === "para" ? `${a.blocks[0].marker} ` : ""}
                  {a.blocks[0]?.text}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[13.5px] font-semibold">
                  Otwórz przepis <ArrowRight className="size-4" />
                </div>
              </a>
            );
          })}
          {ref.act && (
            <div className="pt-3">
              <SectionLabel className="mb-2">
                Ten sam numer w innych aktach
              </SectionLabel>
              <div className="flex flex-wrap gap-2">
                {ACT_IDS.filter((id) => id !== ref.act)
                  .map((id) => data.acts[id].byNumber.get(ref.number))
                  .filter((a): a is Article => !!a)
                  .map((a) => (
                    <a
                      key={a.id}
                      href={href(`art/${a.id}`)}
                      className={`act-${a.actId} flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[13.5px]`}
                    >
                      <Emblem
                        act={a.actId as ActId}
                        className="size-4 text-act"
                      />
                      <span className="font-semibold">
                        {a.label} {ACT_META[a.actId as ActId].short}
                      </span>
                      <span className="max-w-[9rem] truncate text-muted">
                        {a.title}
                      </span>
                    </a>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {q && !ref && (
        <div className="mt-2 space-y-8">
          {res.total === 0 && (
            <div className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
              Brak w bazie dla „{q}”. Regest nie dopowiada — spróbuj innego
              słowa.
            </div>
          )}
          {ACT_IDS.filter((id) => res.groups[id].length).map((id) => {
            const hits = res.groups[id];
            const show = expanded[id] ? hits : hits.slice(0, 3);
            return (
              <section key={id} className={`act-${id}`}>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-act text-white dark:text-black/80">
                    <Emblem act={id} className="size-4" />
                  </span>
                  <span className="font-serif text-[18px] font-semibold">
                    {ACT_META[id].short}
                  </span>
                  <span className="text-[13px] text-muted tabular-nums">
                    {hits.length} {plural(hits.length, 'trafienie', 'trafienia', 'trafień')}
                  </span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                  {show.map((h) => {
                    const ch = data.acts[id].chapterOf.get(h.article.id)!;
                    return (
                      <button
                        key={h.article.id}
                        onClick={() => go(`art/${h.article.id}`)}
                        className="block w-full border-b border-line px-4 py-3.5 text-left last:border-b-0 active:bg-sunk"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif text-[16px] font-semibold text-act">
                            {h.article.label}
                          </span>
                          <span className="truncate text-[14.5px] font-medium">
                            {h.article.title
                              ? highlight(h.article.title, res.terms)
                              : ""}
                          </span>
                        </div>
                        <p className="law mt-1 text-[14.5px] leading-snug text-ink-2">
                          {h.snippet}
                        </p>
                        <div className="mt-1.5 truncate text-[11.5px] text-muted">
                          {chapterLabel(ch)} · {ch.title}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {hits.length > 3 && !expanded[id] && (
                  <button
                    onClick={() => setExpanded({ ...expanded, [id]: true })}
                    className="mt-2 w-full py-2 text-[13.5px] font-medium text-act"
                  >
                    Pokaż wszystkie {hits.length}
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
