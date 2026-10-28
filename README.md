# Egze Post

PWA do szybkiego lookupu i nauki na **u.p.e.a.** oraz **Kpa**. Treść tylko z zaimportowanego tekstu jednolitego + Twoich tagów — bez dopowiadania przepisów.

## Uruchomienie

```bash
npm install
npm run import:acts   # pobiera tekst jednolity z API ELI Sejmu → public/data/
npm run dev           # http://localhost:5173
```

Produkcja:

```bash
npm run build
npm run preview
```

## Import aktów

Domyślnie: oficjalne PDF tekstu jednolitego w `data/source/` → `pdftotext`:

| Plik | Akt |
|------|-----|
| `upea-D19660151Lj.pdf` | u.p.e.a. |
| `kpa-D19600168Lj.pdf` | Kpa |

Wymaga `pdftotext` (poppler-utils). ELI fallback: `IMPORT_SOURCE=eli npm run import:acts`.

Status: `public/data/IMPORT.md`.

## Funkcje MVP (F1)

- **Przeglądaj** (start) — drzewo Dział→Rozdział, czytnik: art. po art. *lub* scroll rozdziału
- **Szukaj** — Cmd/Ctrl+K, lista → czytnik, tag-first, „brak w bazie”
- **Ucz się** — fiszki / SRS (moduły tematyczne w F3)
- **Moje** — tagi, eksport/import JSON
- Motyw jasny/ciemny, PWA (offline cache)

Dane użytkownika: `localStorage` (`egzepost:user:v1`).
