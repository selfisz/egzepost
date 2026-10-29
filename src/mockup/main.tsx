import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ActOverview, BrowseList, ChapterView, Home, Reader } from "./browse";
import type { ActId, MockData } from "./data";
import { ACT_IDS, loadMockData } from "./data";
import { ACT_META } from "./identity";
import { LearnCard, LearnHome } from "./learn";
import { SearchScreen } from "./search";
import type { Tab } from "./ui";
import { Shell, TopBar, useRoute, useTheme } from "./ui";
import "./mockup.css";

function asAct(v: string | null | undefined): ActId {
  return ACT_IDS.includes(v as ActId) ? (v as ActId) : "upea";
}

function App() {
  const route = useRoute();
  const { isDark, toggle } = useTheme(route);
  const [data, setData] = useState<MockData>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    loadMockData().then(setData, (e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data)
    return (
      <div className="grid min-h-dvh place-items-center font-serif text-[22px] text-muted">
        Regest…
      </div>
    );

  const [p0, p1, p2, p3] = route.parts;
  const bar = { isDark, onTheme: toggle };
  let tab: Tab = "start";
  let top = <TopBar brand {...bar} />;
  let body = <Home data={data} />;
  let hideTabs = false;

  if (p0 === "przegladaj") {
    tab = "przegladaj";
    body = <BrowseList data={data} />;
  } else if (p0 === "akt" && p2 === "r") {
    tab = "przegladaj";
    const act = asAct(p1);
    top = <TopBar back={`akt/${act}`} title={ACT_META[act].short} {...bar} />;
    body = <ChapterView data={data} actId={act} index={Number(p3)} />;
  } else if (p0 === "akt") {
    tab = "przegladaj";
    top = <TopBar back="przegladaj" title="" {...bar} />;
    body = <ActOverview data={data} actId={asAct(p1)} />;
  } else if (p0 === "art") {
    tab = "przegladaj";
    const a = data.byId.get(p1 ?? "");
    const act = asAct(a?.actId);
    const ch = a && data.acts[act].chapterOf.get(a.id);
    top = (
      <TopBar
        back={ch ? `akt/${act}/r/${ch.index}` : "przegladaj"}
        title=""
        {...bar}
      />
    );
    body = (
      <Reader
        data={data}
        articleId={p1 ?? ""}
        chapterMode={route.query.get("tryb") === "rozdzial"}
      />
    );
  } else if (p0 === "szukaj") {
    tab = "szukaj";
    body = (
      <SearchScreen
        key={route.query.get("q") ?? ""}
        data={data}
        initial={route.query.get("q") ?? ""}
      />
    );
  } else if (p0 === "nauka" && p1 === "karta") {
    tab = "nauka";
    hideTabs = true;
    const w = route.query.get("wybor");
    return (
      <Shell tab={tab} hideTabs {...{ isDark, onTheme: toggle }}>
        <LearnCard
          data={data}
          n={Number(p2) || 1}
          revealed={route.query.has("odp")}
          choice={w === null ? null : Number(w)}
        />
      </Shell>
    );
  } else if (p0 === "nauka") {
    tab = "nauka";
    body = <LearnHome data={data} actId={asAct(route.query.get("akt"))} />;
  }

  return (
    <Shell tab={tab} hideTabs={hideTabs} isDark={isDark} onTheme={toggle}>
      {top}
      {body}
    </Shell>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
