# `src/learn` — silnik nauki (bez AI)

Regułowy generator pytań z oficjalnego tekstu ustaw + SRS i postęp. Bez Reacta, bez sieci, bez zależności.

```
src/learn/
  index.ts        publiczne API (tylko to importuje UI)
  model.ts        typy: Question, SourceRef, Stage, LearnState…
  session.ts      „Ucz się teraz”, ścieżka rozdział po rozdziale
  progress.ts     zapis odpowiedzi, błędy, mastery per akt/dział/rozdział/typ
  srs.ts          SM-2 (4 przyciski jak w Anki)
  grading.ts      ocena odpowiedzi testowych
  bank.ts         ładowanie public/data/questions*.json
  storage.ts      localStorage `regest:learn:v1`
  generator/      build-time: ekstraktory, dystraktory, walidator (nie w API)
  tests/          node:test na prawdziwych danych
```

## Dane

`npm run build:questions` czyta `public/data/{index,upea,kpa,ordynacja}.json` i zapisuje:

- `public/data/questions.json` — indeks: akty, etapy (rozdziały), statystyki, lista plików,
- `public/data/questions-<akt>.json` — pytania danego aktu (jedno pytanie na linię),
- `public/data/QUESTIONS.md` — raport jakości (liczby, odrzucenia z powodami, próbki).

Po każdym `npm run import:acts` / `import:titles` trzeba uruchomić `npm run build:questions`
(test `bank is up to date` pilnuje, żeby commitowany bank odpowiadał danym).

## API (dla adaptera UI)

```ts
import {
  loadQuestionBank, loadLearnState, saveLearnState,
  buildSession, gradeAnswer, flashcardOutcome, recordAnswer,
  guidedPath, currentStage, progressBy, mistakes,
} from '../learn'

const bank = await loadQuestionBank(`${import.meta.env.BASE_URL}data/`)
let state = loadLearnState()

// „Ucz się teraz” — bez wyboru zakresu; filtry opcjonalne
const plan = buildSession(bank, state, { mode: 'mixed', size: 12 })
// plan.stage = bieżący rozdział ścieżki; plan.items = [{ question, reason: 'retry'|'review'|'new', presentAs }]

// test (single / multiple)
const r = gradeAnswer(item.question, ['b'])           // { correct, correctIds, missed, wrong }
state = recordAnswer(state, item.question, { correct: r.correct, selected: ['b'] })

// fiszka (samoocena)
state = recordAnswer(state, item.question, flashcardOutcome('good'))

saveLearnState(state)
```

| Funkcja | Do czego |
|---|---|
| `buildSession(bank, state, opts)` | Sesja: najpierw błędne (`retry`), potem zaległe powtórki (`review`), potem nowe z bieżącego rozdziału (`new`). `opts.mode`: `flashcards` (wszystko jako fiszki) / `test` (tylko zamknięte) / `mixed`. `opts.maxDifficulty` 1–3. `opts.filter`: `actId`, `chapter` (dział), `stageId` (rozdział), `types`. |
| `currentStage(bank, state, opts)` | Rozdział, na którym jest uczący się: pierwszy w kolejności ustawy, który nie jest ukończony. Brak testu poziomującego i pomijania. |
| `guidedPath(bank, state, actId)` | Wszystkie rozdziały aktu ze statusem `empty` / `new` / `in-progress` / `completed`. |
| `stageProgress(stage, state)` | Ukończony = każde pytanie odpowiedziane i ≥ 80 % ostatnich odpowiedzi poprawnych. |
| `progressBy(bank, state, 'act' \| 'chapter' \| 'stage' \| 'type')` | Opanowanie (`mastered` = 2× z rzędu poprawnie) w grupach. |
| `mistakes(bank, state)` | Pytania z ostatnią błędną odpowiedzią („Powtórz błędy”). |
| `gradeAnswer(q, selectedIds)` | Single: dokładnie jedna dobra; multiple: dokładnie zbiór dobrych. |
| `recordAnswer(state, q, { correct, grade?, selected? })` | Czysta funkcja → nowy stan (SM-2 + log ≤ 2000 wpisów). |
| `loadLearnState()` / `saveLearnState(state)` | `localStorage['regest:learn:v1']`; stary `egzepost:user:v1` nietknięty. |

### Pytanie

```ts
type Question = {
  id: string                 // stabilne: typ:wariant:artykuł:jednostka
  type: 'definition' | 'deadline' | 'conditions' | 'enumeration' | 'exception'
      | 'duty-right' | 'which-article' | 'comparison' | 'order'
  format: 'single' | 'multiple' | 'flashcard'
  difficulty: 1 | 2 | 3
  stageId: string            // rozdział
  prompt: string
  context?: string           // cytat; „▢” = luka, o którą pytamy
  options?: { id, text, correct, note? }[]   // note = dlaczego źle, z podstawą
  answer: string             // tył fiszki / feedback
  sources: SourceRef[]       // [0] = podstawa główna
}
type SourceRef = { actId, articleId, articleNumber, unit: '§ 2 pkt 3', citation: 'art. 33 § 2 pkt 3 u.p.e.a.', quote }
```

„Przejdź do przepisu”: `sources[0].actId` + `sources[0].articleNumber` (+ `unit` do podświetlenia).

## Testy

`npm test` (= `tsx --test`, wbudowany `node:test`, bez nowych zależności).
