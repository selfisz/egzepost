# Regest

PWA do szybkiego lookupu i nauki na **u.p.e.a.**, **Kpa** oraz **Ordynacji podatkowej (Op)**.  
Tagline: *Przepisy do pracy. Nauka bez zgadywania.*  
Treść tylko z zaimportowanego tekstu jednolitego + Twoich tagów — bez dopowiadania przepisów.

**GitHub Pages:** https://selfisz.github.io/egzepost/ — setup: [`docs/GITHUB_PAGES.md`](docs/GITHUB_PAGES.md)  
(Repo / Pages path stays `egzepost`; product name is **Regest**.)

## Uruchomienie

```bash
npm install
npm run import:acts   # PDF w data/source/ → public/data/
npm run import:titles # Legalis Art. N [Tytuł] → article.title
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

Trzy moduły (dolne zakładki na telefonie, lewy pasek na desktopie) + osobny ekran Start:

- **Start** — szukajka, „Trening na dziś”, „Czytaj dalej”, akty, Twoje tagi
- **Przeglądaj** — okładki aktów → mapa ustawy (Działy/Rozdziały) → rozdział → czytnik (artykuł *lub* cały rozdział; cytat, podstawa, tag, „Do nauki”)
- **Szukaj** — Cmd/Ctrl+K; numer („art. 33 upea”) albo fraza; wyniki grupowane per akt, tagi użytkownika, „brak w bazie”
- **Nauka** — ścieżka kursu per akt (etap = rozdział), „Trening na dziś” układa się sam (SRS); ekrany korzystają z adaptera `src/lib/learn-adapter.ts`
- **Moje** (ikona w nagłówku) — słownik żargonu, porównanie aktów, ustawienia, eksport/import JSON
- Motyw jasny/ciemny, PWA (offline cache); trasy w hashu (`#/art/upea:33`) działają pod `/egzepost/`

Dane użytkownika: `localStorage` (`egzepost:user:v1`).
