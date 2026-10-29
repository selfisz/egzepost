# Egze Post

PWA do szybkiego lookupu i nauki na **u.p.e.a.**, **Kpa** oraz **Ordynacji podatkowej (Op)**. Treść tylko z zaimportowanego tekstu jednolitego + Twoich tagów — bez dopowiadania przepisów.

**GitHub Pages:** https://selfisz.github.io/egzepost/ — setup: [`docs/GITHUB_PAGES.md`](docs/GITHUB_PAGES.md)

## Uruchomienie

```bash
npm install
npm run import:acts   # PDF w data/source/ → public/data/
npm run dev           # http://localhost:5173
```

Produkcja / Pages:

```bash
npm run build         # base /
npm run build:pages   # base /egzepost/  (GitHub Pages)
npm run preview
```

## Import aktów

Domyślnie: oficjalne PDF tekstu jednolitego w `data/source/` → `pdftotext`:

| Plik | Akt |
|------|-----|
| `upea-D19660151Lj.pdf` | u.p.e.a. |
| `kpa-D19600168Lj.pdf` | Kpa |
| `ordynacja-D19970926Lj.pdf` | Ordynacja podatkowa (Op) |

Wymaga `pdftotext` (poppler-utils). ELI fallback: `IMPORT_SOURCE=eli npm run import:acts`.

Status: `public/data/IMPORT.md`.

## Funkcje

- **Przeglądaj** (start) — drzewo Dział→Rozdział, czytnik: art. po art. *lub* scroll rozdziału
- **Szukaj** — Cmd/Ctrl+K, lista → czytnik, tag-first, „brak w bazie”
- **Ucz się** — moduły + SRS
- **Moje** — słownik żargonu, porównanie aktów, ustawienia, eksport/import JSON
- Motyw jasny/ciemny, PWA (offline cache)

Dane użytkownika: `localStorage` (`egzepost:user:v1`).
