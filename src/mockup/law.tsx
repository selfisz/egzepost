import type { ReactNode } from "react";
import type { Article, ArticleBlock } from "../types";
import { href } from "./ui";

const XREF =
  /(art\.\s*\d+[a-z]*(?:\s*§\s*\d+[a-z]*)?(?:\s*pkt\s*\d+[a-z]*)?)/gi;

/** Cross-references inside the same act become tappable (mockup: same-act only). */
function withRefs(text: string, actId: string): ReactNode[] {
  const parts = text.split(XREF);
  return parts.map((p, i) => {
    if (i % 2 === 0) return p;
    if (/ustawy|ustawie/.test(parts[i + 1]?.slice(0, 40) ?? "")) return p;
    const num = p.match(/art\.\s*(\d+[a-z]*)/i)?.[1];
    return (
      <a key={i} href={href(`art/${actId}:${num}`)} className="xref">
        {p}
      </a>
    );
  });
}

function Block({
  b,
  actId,
  depth,
}: {
  b: ArticleBlock;
  actId: string;
  depth: number;
}) {
  if (b.type === "text") {
    return <p className="mb-3 last:mb-0">{withRefs(b.text, actId)}</p>;
  }
  if (b.type === "para") {
    return (
      <div className="mb-5 grid grid-cols-[2.6rem_1fr] last:mb-0">
        <span className="pt-[1px] font-serif text-[15px] font-semibold text-act tabular-nums">
          {b.marker.replace(/\.$/, "")}
        </span>
        <div>
          {b.text && <p>{withRefs(b.text, actId)}</p>}
          {!!b.children?.length && (
            <div className="mt-2.5 space-y-2">
              {b.children.map((c, i) => (
                <Block key={i} b={c} actId={actId} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  if (b.type === "point") {
    return (
      <div className="grid grid-cols-[2.1rem_1fr]">
        <span className="pt-[3px] font-mono text-[12.5px] font-medium text-muted tabular-nums">
          {b.marker}
        </span>
        <div>
          <p>{withRefs(b.text, actId)}</p>
          {!!b.children?.length && (
            <div className="mt-1.5 space-y-1.5">
              {b.children.map((c, i) => (
                <Block key={i} b={c} actId={actId} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[1.6rem_1fr] text-ink-2">
      <span className="font-serif italic text-muted">{b.marker}</span>
      <p>{withRefs(b.text, actId)}</p>
    </div>
  );
}

export function LawText({
  article,
  size = "lg",
}: {
  article: Article;
  size?: "lg" | "md";
}) {
  return (
    <div
      className={`law text-ink ${size === "lg" ? "text-[18px] leading-[1.62]" : "text-[16px] leading-[1.58]"}`}
    >
      {article.blocks.map((b, i) => (
        <Block key={i} b={b} actId={article.actId} depth={0} />
      ))}
    </div>
  );
}

export type QuotePick = { para?: string; points?: string[] };

/** Verbatim excerpt of selected § / pkt; skipped parts shown as an ellipsis. */
export function LawQuote({
  article,
  picks,
}: {
  article: Article;
  picks: QuotePick[];
}) {
  const blocks: ArticleBlock[] = [];
  for (const pick of picks) {
    const para = article.blocks.find(
      (b) => b.type === "para" && b.marker === pick.para,
    );
    if (!para || para.type !== "para") continue;
    if (!pick.points) {
      blocks.push(para);
      continue;
    }
    const kids = (para.children ?? []).filter(
      (c) => c.type === "point" && pick.points!.includes(c.marker),
    );
    blocks.push({ ...para, children: [...kids] });
  }
  return (
    <div className="law text-[16.5px] leading-[1.58]">
      {blocks.map((b, i) => (
        <QuoteBlock key={i} b={b} />
      ))}
    </div>
  );
}

function QuoteBlock({ b }: { b: ArticleBlock }) {
  if (b.type !== "para") return <p>{b.text}</p>;
  const all = b.children ?? [];
  return (
    <div className="mb-3 grid grid-cols-[2.4rem_1fr] last:mb-0">
      <span className="font-semibold text-act">
        {b.marker.replace(/\.$/, "")}
      </span>
      <div>
        <p>{b.text}</p>
        {all.length > 0 && (
          <div className="mt-1.5 space-y-1">
            <div className="text-muted">[…]</div>
            {all.map((c, i) => (
              <div key={i} className="grid grid-cols-[2rem_1fr]">
                <span className="font-mono text-[12.5px] text-muted">
                  {"marker" in c ? c.marker : ""}
                </span>
                <p>{c.text}</p>
              </div>
            ))}
            <div className="text-muted">[…]</div>
          </div>
        )}
      </div>
    </div>
  );
}
