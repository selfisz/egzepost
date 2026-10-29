import {
  BookOpen,
  ChevronLeft,
  GraduationCap,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Wordmark } from "./identity";

export type Route = { parts: string[]; query: URLSearchParams };

function parseHash(): Route {
  const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const [path, qs = ""] = raw.split("?");
  return {
    parts: path.split("/").filter(Boolean),
    query: new URLSearchParams(qs),
  };
}

export function useRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function href(path: string) {
  return `#/${path.replace(/^\//, "")}`;
}

export function go(path: string) {
  location.hash = href(path);
}

export function useTheme(route: Route) {
  const forced = route.query.get("motyw");
  const [dark, setDark] = useState(
    () => localStorage.getItem("regest-mock-theme") === "dark",
  );
  const isDark = forced ? forced === "ciemny" : dark;
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document
      .querySelectorAll("meta[name=theme-color]")
      .forEach((m) =>
        m.setAttribute("content", isDark ? "#0c0c0e" : "#f6f4ef"),
      );
  }, [isDark]);
  const toggle = () => {
    localStorage.setItem("regest-mock-theme", isDark ? "light" : "dark");
    setDark(!isDark);
    if (forced) {
      const q = new URLSearchParams(route.query);
      q.delete("motyw");
      const s = q.toString();
      location.hash = href(route.parts.join("/") + (s ? `?${s}` : ""));
    }
  };
  return { isDark, toggle };
}

export type Tab = "start" | "przegladaj" | "szukaj" | "nauka";

const TABS: {
  id: Exclude<Tab, "start">;
  label: string;
  icon: typeof BookOpen;
}[] = [
  { id: "przegladaj", label: "Przeglądaj", icon: BookOpen },
  { id: "szukaj", label: "Szukaj", icon: Search },
  { id: "nauka", label: "Nauka", icon: GraduationCap },
];

export function Shell({
  tab,
  children,
  isDark,
  onTheme,
  hideTabs,
}: {
  tab: Tab;
  children: ReactNode;
  isDark: boolean;
  onTheme: () => void;
  hideTabs?: boolean;
}) {
  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line px-5 py-6 md:flex">
        <a href={href("")}>
          <Wordmark />
        </a>
        <nav className="mt-10 flex flex-col gap-1">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={href(t.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
                tab === t.id ? "bg-ink text-paper" : "text-ink-2 hover:bg-sunk"
              }`}
            >
              <t.icon className="size-[18px]" strokeWidth={1.8} />
              {t.label}
            </a>
          ))}
        </nav>
        <button
          onClick={onTheme}
          className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-sunk"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {isDark ? "Tryb jasny" : "Tryb ciemny"}
        </button>
      </aside>
      <div className="min-w-0 flex-1">
        <div
          className={`mx-auto max-w-3xl ${hideTabs ? "" : "pb-28 md:pb-10"}`}
        >
          {children}
        </div>
      </div>
      {!hideTabs && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/85 pb-[max(env(safe-area-inset-bottom),10px)] backdrop-blur-xl md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-3 px-4 pt-2">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <a
                  key={t.id}
                  href={href(t.id)}
                  className={`flex flex-col items-center gap-1 py-1 text-[11px] font-medium tracking-wide ${
                    active ? "text-ink" : "text-muted"
                  }`}
                >
                  <span
                    className={`grid h-8 w-14 place-items-center rounded-full transition ${active ? "bg-ink text-paper" : ""}`}
                  >
                    <t.icon
                      className="size-[19px]"
                      strokeWidth={active ? 2.1 : 1.7}
                    />
                  </span>
                  {t.label}
                </a>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export function TopBar({
  back,
  title,
  right,
  brand,
  isDark,
  onTheme,
}: {
  back?: string;
  title?: ReactNode;
  right?: ReactNode;
  brand?: boolean;
  isDark: boolean;
  onTheme: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-paper/85 px-4 backdrop-blur-xl md:px-8">
      {back !== undefined && (
        <a
          href={href(back)}
          aria-label="Wstecz"
          className="-ml-2 grid size-10 place-items-center rounded-full text-ink hover:bg-sunk"
        >
          <ChevronLeft className="size-6" strokeWidth={1.8} />
        </a>
      )}
      {brand ? (
        <a href={href("")} className="md:hidden">
          <Wordmark />
        </a>
      ) : (
        <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">
          {title}
        </div>
      )}
      <div className="ml-auto flex items-center gap-1">
        {right}
        <button
          onClick={onTheme}
          aria-label="Zmień motyw"
          className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-sunk md:hidden"
        >
          {isDark ? (
            <Sun className="size-[19px]" strokeWidth={1.8} />
          ) : (
            <Moon className="size-[19px]" strokeWidth={1.8} />
          )}
        </button>
      </div>
    </header>
  );
}

export function SectionLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[11px] font-semibold tracking-[0.14em] text-muted uppercase ${className}`}
    >
      {children}
    </div>
  );
}

export function Ring({
  value,
  size = 44,
  stroke = 4,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="currentColor"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
      />
    </svg>
  );
}
