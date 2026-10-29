import type { ActId } from "./data";

export const ACT_META: Record<
  ActId,
  { short: string; name: string; nick: string; color: string; year: string }
> = {
  upea: {
    short: "u.p.e.a.",
    name: "Postępowanie egzekucyjne w administracji",
    nick: "Egzekucja",
    color: "Cynober",
    year: "1966",
  },
  kpa: {
    short: "Kpa",
    name: "Kodeks postępowania administracyjnego",
    nick: "Procedura",
    color: "Granat",
    year: "1960",
  },
  ordynacja: {
    short: "Op",
    name: "Ordynacja podatkowa",
    nick: "Podatki",
    color: "Butelkowa zieleń",
    year: "1997",
  },
};

/** Geometric emblems: pieczęć (u.p.e.a.), kolumnada (Kpa), księga rachunkowa (Op). */
export function Emblem({
  act,
  className = "size-6",
}: {
  act: ActId;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  if (act === "upea")
    return (
      <svg {...common}>
        <circle cx="16" cy="16" r="12" />
        <circle cx="16" cy="16" r="7" />
        <path d="M16 4v3M16 25v3M4 16h3M25 16h3" />
        <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" />
      </svg>
    );
  if (act === "kpa")
    return (
      <svg {...common}>
        <path d="M4 11 16 4l12 7" />
        <path d="M6 11h20" />
        <path d="M9 14v10M16 14v10M23 14v10" />
        <path d="M5 27h22" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="6" y="4" width="20" height="24" rx="3" />
      <path d="M11 11h10M11 16h10M11 21h5" />
      <path d="m18 21 1.8 1.8L23 19.5" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid size-7 place-items-center rounded-[9px] bg-ink text-paper">
        <span className="font-serif text-[17px] leading-none font-semibold">
          §
        </span>
      </span>
      <span className="font-serif text-[21px] font-semibold tracking-tight">
        Regest
      </span>
    </span>
  );
}
