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

ISAP PDF (`…Lj.pdf`) bywa blokowany przez Incapsula. Skrypt korzysta z **API ELI** (`api.sejm.gov.pl`):

| Akt | Źródło MVP |
|-----|------------|
| u.p.e.a. | tekst jednolity PDF ELI (np. DU/2026/1311) → `pdftotext` |
| Kpa | tekst jednolity PDF ELI (np. DU/2025/1691) → `pdftotext` |

Wymaga `pdftotext` (poppler-utils). Offline: pliki w `scripts/raw/` + `IMPORT_SOURCE=local npm run import:acts`.

Status ostatniego importu: `public/data/IMPORT.md`.

## Funkcje MVP

- **Szukaj** — Cmd/Ctrl+K, filtry aktów/tagów, ranking tag-first, „brak w bazie”
- **Nauka** — cloze / tag→przepis / który artykuł?, SRS 1/2/3, Spacja
- **Tagi / Baza** — tagi in-place, słownik, eksport/import JSON
- Karty artykułów: hierarchia §/pkt, podświetlenie składni prawa, podgląd odesłań
- Motyw jasny/ciemny, PWA (offline cache)

Dane użytkownika: `localStorage` (`egzepost:user:v1`).
