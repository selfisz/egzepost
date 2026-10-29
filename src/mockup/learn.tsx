import {
  ArrowRight,
  Check,
  Flame,
  Lock,
  Play,
  Target,
  X,
} from "lucide-react";
import type { ActId, Chapter, MockData } from "./data";
import { ACT_IDS, articleRange } from "./data";
import { ACT_META, Emblem } from "./identity";
import type { QuotePick } from "./law";
import { LawQuote } from "./law";
import { href, SectionLabel } from "./ui";

/** Mock progress: index of the current stage (chapter) per act. */
const CURRENT: Record<ActId, number> = { upea: 3, kpa: 5, ordynacja: 0 };
const OFFSETS = [0, 56, 84, 56, 0, -56, -84, -56];

/** Mock progress inside the current stage: share of its articles already seen. */
const CURRENT_SEEN = 0.27;

function przepisy(n: number) {
  const d = n % 10;
  const t = n % 100;
  if (n === 1) return "przepis";
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? "przepisy" : "przepisów";
}

export function LearnHome({ data, actId }: { data: MockData; actId: ActId }) {
  const act = data.acts[actId];
  const cur = CURRENT[actId];
  const done = cur;
  const pct = done / act.chapters.length;
  let nodeIdx = 0;
  return (
    <div className="px-5 pt-2 md:px-8 md:pt-8">
      <div className="flex items-end justify-between">
        <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight">
          Nauka
        </h1>
        <div className="mb-1 flex items-center gap-3 text-[13px] font-semibold tabular-nums">
          <span className="flex items-center gap-1 text-gold">
            <Flame className="size-4" fill="currentColor" /> 4 dni
          </span>
          <span className="flex items-center gap-1 text-ink-2">
            <Target className="size-4" /> 8/12
          </span>
        </div>
      </div>

      <a
        href={href("nauka/karta/1")}
        className="mt-4 block overflow-hidden rounded-[24px] bg-hero p-5 text-hero-fg ring-1 ring-gold/15"
      >
        <div className="text-[12px] font-semibold tracking-[0.14em] text-gold uppercase">
          Trening na dziś
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <div className="font-serif text-[24px] leading-tight font-semibold">
            12 kart · ok. 6 min
          </div>
        </div>
        <div className="mt-1 text-[13.5px] opacity-65">
          8 powtórek + 4 nowe · układa się sam
        </div>
        <div className="mt-4 flex gap-1.5">
          {(
            [
              "upea",
              "upea",
              "kpa",
              "upea",
              "kpa",
              "ordynacja",
              "upea",
              "kpa",
              "upea",
              "kpa",
              "upea",
              "ordynacja",
            ] as ActId[]
          ).map((id, i) => (
            <span
              key={i}
              className={`act-${id} h-1.5 flex-1 rounded-full bg-act`}
            />
          ))}
        </div>
        <div className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-gold text-[15px] font-semibold text-black">
          <Play className="size-4 fill-current" /> Zacznij trening
        </div>
      </a>

      <SectionLabel className="mt-8 mb-3">Ścieżka kursu</SectionLabel>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-sunk p-1">
        {ACT_IDS.map((id) => (
          <a
            key={id}
            href={href(`nauka?akt=${id}`)}
            className={`act-${id} flex items-center justify-center gap-1.5 rounded-xl py-2 text-[13.5px] font-semibold ${
              id === actId ? "bg-surface text-act shadow-sm" : "text-muted"
            }`}
          >
            <Emblem act={id} className="size-4" />
            {ACT_META[id].short}
          </a>
        ))}
      </div>

      <div className={`act-${actId} mt-3 flex items-center gap-3 px-1`}>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
          <div
            className="h-full rounded-full bg-act"
            style={{ width: `${Math.max(pct * 100, 2)}%` }}
          />
        </div>
        <span className="text-[12.5px] font-medium text-muted tabular-nums">
          {done === 0
            ? "Start od podstaw"
            : `Etap ${cur + 1} z ${act.chapters.length}`}{" "}
          · {Math.round(pct * 100)}%
        </span>
      </div>

      <div className={`act-${actId} mt-6`}>
        {act.divisions.map((d, di) => {
          const divDone = d.chapters.filter((c) => c.index < cur).length;
          return (
            <section key={di} className="mb-6">
              <div className="flex items-center gap-3 rounded-2xl bg-act-tint px-4 py-3 text-act-ink">
                <span className="font-mono text-[11.5px] font-semibold">
                  DZIAŁ {d.no}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">
                  {d.title}
                </span>
                <span className="text-[12px] tabular-nums opacity-70">
                  {divDone}/{d.chapters.length}
                </span>
              </div>
              <div className="flex flex-col items-center py-4">
                {d.chapters.map((c) => {
                  const off = OFFSETS[nodeIdx++ % OFFSETS.length];
                  const state =
                    c.index < cur
                      ? "done"
                      : c.index === cur
                        ? "current"
                        : "locked";
                  return (
                    <PathNode key={c.index} ch={c} state={state} offset={off} />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PathNode({
  ch,
  state,
  offset,
}: {
  ch: Chapter;
  state: "done" | "current" | "locked";
  offset: number;
}) {
  return (
    <div
      className="flex w-full flex-col items-center py-2.5"
      style={{ transform: `translateX(${offset}px)` }}
    >
      {state === "current" && (
        <div className="relative mb-3 rounded-xl bg-ink px-3 py-2 text-center text-paper shadow-lg">
          <div className="text-[11px] font-semibold tracking-wider text-gold uppercase">
            Teraz
          </div>
          <div className="text-[13px] font-semibold tabular-nums">
            {Math.round(ch.articles.length * CURRENT_SEEN)} z{" "}
            {ch.articles.length} przepisów
          </div>
          <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-ink" />
        </div>
      )}
      <a
        href={state === "locked" ? undefined : href("nauka/karta/1")}
        className={`grid size-[68px] place-items-center rounded-full border-b-[5px] transition active:translate-y-0.5 ${
          state === "done"
            ? "border-black/20 bg-act text-white dark:text-black/80"
            : state === "current"
              ? "pulse border-black/20 bg-act text-white dark:text-black/80"
              : "border-line bg-sunk text-muted"
        }`}
      >
        {state === "done" ? (
          <Check className="size-7" strokeWidth={2.6} />
        ) : state === "current" ? (
          <Play className="size-6 fill-current" />
        ) : (
          <Lock className="size-5" strokeWidth={2} />
        )}
      </a>
      <div
        className={`mt-2 w-40 text-center ${state === "locked" ? "text-muted" : ""}`}
      >
        <div className="line-clamp-2 text-[13px] leading-tight font-medium">
          {ch.title}
        </div>
        <div className="mt-0.5 text-[11px] text-muted tabular-nums">
          {articleRange(ch)} · {ch.articles.length}{" "}
          {przepisy(ch.articles.length)}
        </div>
      </div>
    </div>
  );
}

type CardDef = {
  kind: "scenario" | "quiz";
  articleId: string;
  picks: QuotePick[];
  cite: string;
  question: string;
  options?: string[];
  correct?: number;
};

const CARDS: CardDef[] = [
  {
    kind: "scenario",
    articleId: "upea:33",
    picks: [{ para: "§ 1." }, { para: "§ 2.", points: ["4)"] }],
    cite: "art. 33 § 1 i § 2 pkt 4 u.p.e.a.",
    question:
      "Zobowiązanemu nie doręczono upomnienia, a egzekucję wszczęto. Jaki środek mu przysługuje i do kogo go wnosi?",
  },
  {
    kind: "quiz",
    articleId: "kpa:35",
    picks: [{ para: "§ 3." }],
    cite: "art. 35 § 3 Kpa",
    question:
      "W jakim terminie organ powinien załatwić sprawę wymagającą postępowania wyjaśniającego (nieskomplikowaną)?",
    options: [
      "Niezwłocznie",
      "W ciągu 14 dni",
      "Nie później niż w ciągu miesiąca",
      "W ciągu dwóch miesięcy",
    ],
    correct: 2,
  },
];

export function LearnCard({
  data,
  n,
  revealed,
  choice,
}: {
  data: MockData;
  n: number;
  revealed: boolean;
  choice: number | null;
}) {
  const card = CARDS[n - 1] ?? CARDS[0];
  const article = data.byId.get(card.articleId)!;
  const actId = article.actId as ActId;
  const step = n + 3;
  const nextHref =
    n < CARDS.length ? href(`nauka/karta/${n + 1}`) : href("nauka");
  return (
    <div className={`act-${actId} flex min-h-dvh flex-col px-5 md:px-8`}>
      <div className="flex h-14 items-center gap-3">
        <a
          href={href("nauka")}
          aria-label="Zakończ"
          className="-ml-2 grid size-10 place-items-center rounded-full text-muted"
        >
          <X className="size-6" strokeWidth={1.8} />
        </a>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-sunk">
          <div
            className="h-full rounded-full bg-gold"
            style={{ width: `${(step / 12) * 100}%` }}
          />
        </div>
        <span className="text-[13px] font-semibold text-muted tabular-nums">
          {step}/12
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] font-semibold">
        <span className="rounded-full bg-act-tint px-2.5 py-1 text-act-ink">
          {card.kind === "scenario" ? "Scenariusz" : "Quiz"}
        </span>
        <span className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-ink-2">
          <Emblem act={actId} className="size-3.5 text-act" />{" "}
          {ACT_META[actId].short}
        </span>
        <span className="rounded-full border border-dashed border-gold/60 px-2.5 py-1 text-gold">
          przykład
        </span>
      </div>

      <div className="mt-4 text-[12.5px] text-muted">
        {data.acts[actId].chapterOf.get(article.id)!.title}
      </div>
      <h1 className="mt-1 font-serif text-[23px] leading-[1.3] font-semibold tracking-tight">
        {card.question}
      </h1>

      {card.kind === "quiz" && (
        <div className="mt-6 space-y-2.5">
          {card.options!.map((o, i) => {
            const isCorrect = i === card.correct;
            const isChosen = i === choice;
            const cls = !revealed
              ? "border-line bg-surface"
              : isCorrect
                ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100"
                : isChosen
                  ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                  : "border-line bg-surface opacity-50";
            return (
              <a
                key={i}
                href={href(`nauka/karta/${n}?odp=1&wybor=${i}`)}
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-[15.5px] font-medium ${cls}`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-current/20 font-mono text-[12px]">
                  {revealed && isCorrect ? (
                    <Check className="size-4" strokeWidth={3} />
                  ) : (
                    "ABCD"[i]
                  )}
                </span>
                {o}
              </a>
            );
          })}
        </div>
      )}

      {card.kind === "scenario" && !revealed && (
        <div className="mt-6 rounded-2xl border border-dashed border-line p-5 text-[14px] leading-relaxed text-muted">
          Odpowiedz w myślach albo na głos. Potem odsłoń przepis i oceń się
          uczciwie — od tego zależy, kiedy karta wróci.
        </div>
      )}

      {revealed && (
        <div className="mt-6">
          <SectionLabel className="mb-2">Odpowiedź z ustawy</SectionLabel>
          <div className="rounded-2xl border border-line bg-surface p-4 pl-5 shadow-[inset_4px_0_0_var(--act)]">
            <LawQuote article={article} picks={card.picks} />
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="text-[12.5px] font-semibold text-act">
                {card.cite}
              </span>
              <a
                href={href(`art/${article.id}`)}
                className="flex shrink-0 items-center gap-1 text-[13px] font-semibold"
              >
                Cały artykuł <ArrowRight className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1" />
      <div className="sticky bottom-0 -mx-5 bg-paper/90 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] backdrop-blur md:-mx-8 md:px-8">
        {!revealed && card.kind === "scenario" && (
          <a
            href={href(`nauka/karta/${n}?odp=1`)}
            className="flex h-14 items-center justify-center rounded-2xl bg-ink text-[16px] font-semibold text-paper"
          >
            Pokaż odpowiedź
          </a>
        )}
        {!revealed && card.kind === "quiz" && (
          <div className="flex h-14 items-center justify-center rounded-2xl bg-sunk text-[15px] font-semibold text-muted">
            Wybierz odpowiedź
          </div>
        )}
        {revealed && card.kind === "scenario" && (
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Nie wiem", "za 10 min", "bg-sunk text-ink"],
              ["Częściowo", "jutro", "bg-gold-tint text-ink"],
              ["Umiem", "za 4 dni", "bg-ink text-paper"],
            ].map(([l, s, c]) => (
              <a
                key={l}
                href={nextHref}
                className={`flex h-14 flex-col items-center justify-center rounded-2xl ${c}`}
              >
                <span className="text-[15px] font-semibold">{l}</span>
                <span className="text-[11px] opacity-60">{s}</span>
              </a>
            ))}
          </div>
        )}
        {revealed && card.kind === "quiz" && (
          <a
            href={nextHref}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink text-[16px] font-semibold text-paper"
          >
            Dalej <ArrowRight className="size-4" />
          </a>
        )}
      </div>
    </div>
  );
}
