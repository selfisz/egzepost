# Bank pytań — raport jakości

Wygenerowano regułowo (bez AI) z danych `2026-10-29T12:00:17.167Z`. Plik tworzy `npm run build:questions` — nie edytuj ręcznie.

**1813** pytań po walidacji · **555** kandydatów odrzuconych · 120/134 rozdziałów (etapów) ma pytania.

## Liczby

| Typ | Pytań |
|---|---:|
| Który artykuł? | 1024 |
| Definicje legalne | 29 |
| Wyliczenia | 203 |
| Wyjątki i wyłączenia | 115 |
| Obowiązki i uprawnienia | 138 |
| Terminy | 278 |
| Kolejność czynności | 3 |
| Porównania | 4 |
| Przesłanki | 19 |

| Akt | Pytań |
|---|---:|
| u.p.e.a. | 591 |
| Kpa | 388 |
| Op | 834 |

| Format | Pytań |
|---|---:|
| single | 1669 |
| multiple | 140 |
| flashcard | 4 |

| Trudność | Pytań |
|---|---:|
| poziom 1 | 77 |
| poziom 2 | 1480 |
| poziom 3 | 256 |

## Odrzucone kandydatury (powód)

Generator pomija przepis zamiast tworzyć słabe pytanie. Walidator sprawdza: strukturę, istnienie podstawy prawnej, zgodność każdej opcji z cytatem (poprawna — występuje w przepisie; dystraktor — udowodnione, że nie występuje), jednoznaczność (brak podpowiedzi w treści, brak dublujących się opcji), duplikaty, liczbę odpowiedzi i sensowność (długości, artefakty importu PDF).

| Typ: powód | Liczba |
|---|---:|
| which-article: brak jednoznacznego zdania | 117 |
| which-article: rozdział ma < 4 artykuły | 73 |
| enumeration: za mało samodzielnych punktów | 61 |
| which-article: artykuł odsyłający / bez treści merytorycznej | 51 |
| duty-right: brak czynności podmiotu (np. „może być”) | 31 |
| enumeration: za mało dystraktorów spoza listy | 25 |
| exception: wyjątek za krótki / za długi | 21 |
| exception: ogólna klauzula „chyba że przepisy stanowią inaczej” | 20 |
| definition: definicja za długa na opcję | 19 |
| definition: definicja zdradza pojęcie (wariant odwrotny) | 13 |
| exception: artefakt importu | 11 |
| deadline: artefakt importu | 10 |
| definition: definicja przez odesłanie do innej ustawy | 9 |
| enumeration: lista otwarta i zbyt długa na fiszkę | 9 |
| definition: definicja z wyliczeniem | 7 |
| deadline: kilka terminów w jednej jednostce | 7 |
| conditions: za mało samodzielnych punktów | 7 |
| duty-right: kilka norm modalnych w jednostce | 6 |
| enumeration: artefakt importu | 6 |
| enumeration: upoważnienie do rozporządzenia | 6 |
| enumeration: wprowadzenie za długie | 5 |
| definition: artefakt importu | 4 |
| definition: definicja przez samo odesłanie | 3 |
| definition: definicja rozszerzająca („również”) | 3 |
| exception: kilka wyjątków w jednostce | 3 |
| exception: za mało dystraktorów spoza listy | 3 |
| deadline: walidacja: jednoznaczność | 3 |
| definition: za mało weryfikowalnych dystraktorów | 2 |
| deadline: zdanie za długie | 2 |
| exception: za mało dystraktorów | 2 |
| conditions: artefakt importu | 2 |
| enumeration: wprowadzenie wyliczenia zbyt ogólne | 2 |
| exception: za mało samodzielnych punktów | 2 |
| conditions: wprowadzenie za długie | 2 |
| deadline: walidacja: duplikat | 2 |
| deadline: walidacja: zgodność z tekstem | 2 |
| exception: zdanie za długie | 1 |
| conditions: lista otwarta i zbyt długa na fiszkę | 1 |
| conditions: za mało dystraktorów spoza listy | 1 |
| which-article: walidacja: jednoznaczność | 1 |

## Próbki (po jednej na typ i wariant)

**Który artykuł? · probe · single · poziom 2** — `which-article:upea:111f`

> Który artykuł u.p.e.a. (Rozdział 7 — Egzekucja z nieruchomości) zawiera ten przepis?
>
> „§ 2. Postąpienie nie może wynosić mniej niż jeden procent ceny wywołania, z zaokrągleniem wzwyż do pełnych złotych.”

- ▫️ Art. 111r · Zażalenie na postanowienie
- ▫️ Art. 110b · Inni uczestnicy
- ▫️ Art. 110j · Sprawozdania zarządcy
- ✅ Art. 111f · Postąpienie

Odpowiedź: **Art. 111f · Postąpienie**

Podstawa: art. 111f § 2 u.p.e.a. — „Postąpienie nie może wynosić mniej niż jeden procent ceny wywołania, z zaokrągleniem wzwyż do pełnych złotych.”

---

**Definicje legalne · term · single · poziom 1** — `definition:term:upea:1a:pkt 13`

> Które pojęcie ze słowniczka (Art. 1a pkt 13 u.p.e.a.) oznacza: „podmiot uprawniony do żądania wykonania obowiązku lub jego zabezpieczenia w administracyjnym postępowaniu egzekucyjnym lub zabezpieczającym”?

- ✅ wierzycielu
- ▫️ rencie socjalnej — _„rencie socjalnej” zdefiniowano inaczej (Art. 1a pkt 10b u.p.e.a.)._
- ▫️ państwie członkowskim — _„państwie członkowskim” zdefiniowano inaczej (Art. 1a pkt 8c u.p.e.a.)._
- ▫️ poborcy skarbowym — _„poborcy skarbowym” zdefiniowano inaczej (Art. 1a pkt 9 u.p.e.a.)._

Odpowiedź: **wierzycielu**

Podstawa: art. 1a pkt 13 u.p.e.a. — „wierzycielu – rozumie się przez to podmiot uprawniony do żądania wykonania obowiązku lub jego zabezpieczenia w administracyjnym postępowaniu egzekucyjnym lub zabezpieczającym;”

---

**Definicje legalne · meaning · single · poziom 2** — `definition:meaning:upea:1a:pkt 13`

> Ilekroć w u.p.e.a. jest mowa o „wierzycielu”, rozumie się przez to:

- ▫️ rentę socjalną lub rentę socjalną z dodatkiem dopełniającym — _To definicja pojęcia „rencie socjalnej” (Art. 1a pkt 10b u.p.e.a.)._
- ✅ podmiot uprawniony do żądania wykonania obowiązku lub jego zabezpieczenia w administracyjnym postępowaniu egzekucyjnym lub zabezpieczającym
- ▫️ niepodejmowanie lub odstąpienie od egzekucji z całości lub części składników majątkowych zobowiązanego — _To definicja pojęcia „zwolnieniu spod egzekucji” (Art. 1a pkt 21 u.p.e.a.)._
- ▫️ państwo będące członkiem Unii Europejskiej inne niż Rzeczpospolita Polska — _To definicja pojęcia „państwie członkowskim” (Art. 1a pkt 8c u.p.e.a.)._

Odpowiedź: **podmiot uprawniony do żądania wykonania obowiązku lub jego zabezpieczenia w administracyjnym postępowaniu egzekucyjnym lub zabezpieczającym**

Podstawa: art. 1a pkt 13 u.p.e.a. — „wierzycielu – rozumie się przez to podmiot uprawniony do żądania wykonania obowiązku lub jego zabezpieczenia w administracyjnym postępowaniu egzekucyjnym lub zabezpieczającym;”

---

**Wyliczenia · not-listed · single · poziom 2** — `enumeration:not-listed:upea:53:§ 1`

> Czego NIE wymienia art. 53 § 1 u.p.e.a.?
>
> „Jeżeli przepisy ustawy nie stanowią inaczej, egzekutor sporządza protokół z czynności egzekucyjnych, który zawiera:”

- ▫️ zgłoszone przez obecnych wnioski i oświadczenia
- ✅ inne dane niezbędne do prowadzenia łącznie egzekucji do rzeczy albo prawa majątkowego
- ▫️ podpis egzekutora
- ▫️ imiona i nazwiska osób uczestniczących w czynności

Odpowiedź: **inne dane niezbędne do prowadzenia łącznie egzekucji do rzeczy albo prawa majątkowego**

Podstawa: art. 53 § 1 u.p.e.a. — „Jeżeli przepisy ustawy nie stanowią inaczej, egzekutor sporządza protokół z czynności egzekucyjnych, który zawiera: oznaczenie miejsca, czasu i rodzaju czynności; imiona i nazwiska osób uczestniczących w czynności; sprawozdanie z przebiegu czynności; zgłoszone…”

---

**Wyliczenia · multiple · multiple · poziom 3** — `enumeration:multiple:ordynacja:64:§ 1`

> Art. 64 § 1 Op: zaznacz wszystkie elementy, które wymienia ten przepis.
>
> „Zobowiązania podatkowe oraz zaległości podatkowe wraz z odsetkami za zwłokę w podatkach stanowiących dochód budżetu państwa podlegają, na wniosek podatnika, potrąceniu z wzajemnej, bezspornej i wymagalnej wierzytelności podatnika wobec Skarbu Państwa z tytułu:”

- ✅ odszkodowania uzyskanego na podstawie przepisów o uznaniu za nieważne orzeczeń wydanych wobec osób represjonowanych za działalność na rzecz bytu Państwa Polskiego
- ▫️ odszkodowania orzeczonego w decyzji wydanej przez wójta, burmistrza (prezydenta miasta), starostę lub marszałka województwa — _Tego art. 64 § 1 Op nie wymienia — pochodzi z art. 65 § 1 pkt 4 Op._
- ▫️ nadania NSP na podstawie fałszywych lub fikcyjnych danych — _Tego art. 64 § 1 Op nie wymienia — pochodzi z art. 86i § 2 pkt 2 Op._
- ✅ odszkodowania za niesłuszne skazanie, tymczasowe aresztowanie lub zatrzymanie, uzyskanego na podstawie przepisów Kodeksu postępowania karnego
- ✅ odszkodowania orzeczonego w decyzji organu administracji rządowej
- ▫️ przeniesienia własności rzeczy lub praw majątkowych — _Tego art. 64 § 1 Op nie wymienia — pochodzi z art. 59 § 1 pkt 6 Op._

Odpowiedź: **odszkodowania za niesłuszne skazanie, tymczasowe aresztowanie lub zatrzymanie, uzyskanego na podstawie przepisów Kodeksu postępowania karnego; odszkodowania uzyskanego na podstawie przepisów o uznaniu za nieważne orzeczeń wydanych wobec osób represjonowanych za działalność na rzecz bytu Państwa Polskiego; odszkodowania orzeczonego w decyzji organu administracji rządowej**

Podstawa: art. 64 § 1 Op — „Zobowiązania podatkowe oraz zaległości podatkowe wraz z odsetkami za zwłokę w podatkach stanowiących dochód budżetu państwa podlegają, na wniosek podatnika, potrąceniu z wzajemnej, bezspornej i wymagalnej wierzytelności podatnika wobec Skarbu Państwa z tytułu:…”

---

**Wyjątki i wyłączenia · clause · single · poziom 2** — `exception:clause:kpa:22:§ 1 pkt 1`

> Jakie zastrzeżenie („z wyjątkiem …”) zawiera art. 22 § 1 pkt 1 Kpa?
>
> „między organami jednostek samorządu terytorialnego, z wyjątkiem ▢, a w razie braku takiego organu – sąd administracyjny;”

- ▫️ samorządowych kolegiów odwoławczych — _To zastrzeżenie z art. 18 pkt 1 Kpa._
- ▫️ ustaleń zawartych w protokole z przebiegu mediacji — _To zastrzeżenie z art. 96j § 3 Kpa._
- ✅ przypadków określonych w pkt 2–4 – wspólny dla nich organ wyższego stopnia
- ▫️ spraw określonych w pkt 2 – sejmik województwa — _To zastrzeżenie z art. 229 pkt 5 Kpa._

Odpowiedź: **z wyjątkiem przypadków określonych w pkt 2–4 – wspólny dla nich organ wyższego stopnia**

Podstawa: art. 22 § 1 pkt 1 Kpa — „między organami jednostek samorządu terytorialnego, z wyjątkiem przypadków określonych w pkt 2–4 – wspólny dla nich organ wyższego stopnia, a w razie braku takiego organu – sąd administracyjny;”

---

**Obowiązki i uprawnienia · kind · single · poziom 1** — `duty-right:kind:ordynacja:274a:§ 1`

> Art. 274a § 1 Op: czy ten przepis nakłada na podmiot obowiązek, czy przyznaje mu uprawnienie?
>
> „Organ podatkowy ▢ zażądać złożenia wyjaśnień w sprawie przyczyn niezłożenia deklaracji lub sprawozdania finansowego lub wezwać do ich złożenia, jeżeli nie zostały złożone mimo takiego obowiązku.”

- ▫️ Obowiązek
- ✅ Uprawnienie

Odpowiedź: **Uprawnienie („może”)**

Podstawa: art. 274a § 1 Op — „Organ podatkowy może zażądać złożenia wyjaśnień w sprawie przyczyn niezłożenia deklaracji lub sprawozdania finansowego lub wezwać do ich złożenia, jeżeli nie zostały złożone mimo takiego obowiązku.”

---

**Obowiązki i uprawnienia · actor · single · poziom 2** — `duty-right:actor:ordynacja:57:§ 6`

> Art. 57 § 6 Op: komu przepis przyznaje to uprawnienie?
>
> „▢ może odstąpić od ustalenia opłaty prolongacyjnej, jeżeli wydanie decyzji, o której mowa w § 1, następuje w związku z postępowaniem układowym lub na podstawie odrębnych ustaw.”

- ▫️ Strona — _Art. 57 § 6 Op nie wymienia tego podmiotu._
- ▫️ Inkasent — _Art. 57 § 6 Op nie wymienia tego podmiotu._
- ✅ Organ podatkowy
- ▫️ Podatnik — _Art. 57 § 6 Op nie wymienia tego podmiotu._

Odpowiedź: **Organ podatkowy**

Podstawa: art. 57 § 6 Op — „Organ podatkowy może odstąpić od ustalenia opłaty prolongacyjnej, jeżeli wydanie decyzji, o której mowa w § 1, następuje w związku z postępowaniem układowym lub na podstawie odrębnych ustaw.”

---

**Terminy · value · single · poziom 2** — `deadline:value:ordynacja:67a:§ 2`

> Jaki termin przewiduje Art. 67a § 2 Op?
>
> „… W przypadku wniosku o umorzenie w całości lub w części zaległości podatkowych, odsetek za zwłokę lub opłaty prolongacyjnej sprawę uznaje się za załatwioną milcząco w sposób w całości uwzględniający żądanie wnioskodawcy, jeżeli w terminie ▢ od dnia złożenia wniosku o umorzenie w całości lub w części zaległości podatkowych, odsetek za zwłokę lub opłaty prolongacyjnej organ podatkowy nie wydał decyzji lub postanowienia kończącego postępowanie w tej sprawie.”

- ▫️ 30 dni — _Art. 67a § 2 Op przewiduje 60 dni, nie 30 dni._
- ✅ 60 dni
- ▫️ 3 dni — _Art. 67a § 2 Op przewiduje 60 dni, nie 3 dni._
- ▫️ 14 dni — _Art. 67a § 2 Op przewiduje 60 dni, nie 14 dni._

Odpowiedź: **60 dni**

Podstawa: art. 67a § 2 Op — „Umorzenie zaległości podatkowej powoduje również umorzenie odsetek za zwłokę w całości lub w takiej części, w jakiej została umorzona zaległość podatkowa. <§ 3. W przypadku wniosku o umorzenie w całości lub w części zaległości podatkowych, odsetek za zwłokę lu…”

---

**Terminy · start · single · poziom 3** — `deadline:start:kpa:145b:§ 2`

> Od jakiego zdarzenia liczy się termin 1 miesiąc w art. 145b § 2 Kpa?
>
> „W sytuacji określonej w § 1 skargę o wznowienie wnosi się w terminie jednego miesiąca ▢.”

- ▫️ od dnia wszczęcia postępowania — _Tak liczy się termin w art. 35 § 3a Kpa._
- ✅ od dnia uprawomocnienia się orzeczenia sądu
- ▫️ od dnia doręczenia mu żądania — _Tak liczy się termin w art. 106 § 3 Kpa._
- ▫️ od dnia doręczenia lub ogłoszenia decyzji — _Tak liczy się termin w art. 111 § 1a Kpa._

Odpowiedź: **od dnia uprawomocnienia się orzeczenia sądu**

Podstawa: art. 145b § 2 Kpa — „W sytuacji określonej w § 1 skargę o wznowienie wnosi się w terminie jednego miesiąca od dnia uprawomocnienia się orzeczenia sądu.”

---

**Wyjątki i wyłączenia · not-listed · single · poziom 2** — `exception:not-listed:upea:8a:§ 1`

> Czego NIE wymienia art. 8a § 1 u.p.e.a.?
>
> „Jeżeli zobowiązanym jest rolnik prowadzący gospodarstwo rolne, egzekucji nie podlegają również:”

- ✅ imiona i nazwiska osób uczestniczących w czynności
- ▫️ stado podstawowe zwierząt futerkowych oraz zwierzęta futerkowe, co do których hodowca zawarł umowę kontraktacyjną na dostawę skór z tych zwierząt
- ▫️ zaliczki kontraktacyjne
- ▫️ jedna jałówka lub cieliczka w przypadku braku krowy

Odpowiedź: **imiona i nazwiska osób uczestniczących w czynności**

Podstawa: art. 8a § 1 u.p.e.a. — „Jeżeli zobowiązanym jest rolnik prowadzący gospodarstwo rolne, egzekucji nie podlegają również: jeden koń wraz z uprzężą, jedna krowa, dwie kozy, jeden tryk i dwie owce, jedna maciora oraz dziesięć sztuk drobiu; jedna jałówka lub cieliczka w przypadku braku kr…”

---

**Wyjątki i wyłączenia · multiple · multiple · poziom 3** — `exception:multiple:ordynacja:282a:§ 2`

> Art. 282a § 2 Op: zaznacz wszystkie wyłączenia, które wymienia ten przepis.
>
> „Przepisu § 1 nie stosuje się, jeżeli kontrola podatkowa jest niezbędna dla przeprowadzenia postępowania w:”

- ✅ związku z uchyleniem lub stwierdzeniem nieważności decyzji przez sąd administracyjny
- ✅ sprawie stwierdzenia nadpłaty
- ▫️ wskazanie zakresu kontroli — _Tego art. 282a § 2 Op nie wymienia — pochodzi z art. 282b § 4 pkt 4 Op._
- ▫️ wskazanie państw członkowskich Unii Europejskiej oraz innych terytoriów, których może dotyczyć schemat podatkowy — _Tego art. 282a § 2 Op nie wymienia — pochodzi z art. 86f § 1 pkt 6 Op._
- ▫️ oznaczenie organu, datę i miejsce wystawienia — _Tego art. 282a § 2 Op nie wymienia — pochodzi z art. 283 § 2 pkt 1 Op._
- ✅ sprawie stwierdzenia nieważności, stwierdzenia wygaśnięcia, uchylenia lub zmiany decyzji ostatecznej lub wznowienia postępowania w sprawie zakończonej decyzją ostateczną

Odpowiedź: **sprawie stwierdzenia nieważności, stwierdzenia wygaśnięcia, uchylenia lub zmiany decyzji ostatecznej lub wznowienia postępowania w sprawie zakończonej decyzją ostateczną; związku z uchyleniem lub stwierdzeniem nieważności decyzji przez sąd administracyjny; sprawie stwierdzenia nadpłaty**

Podstawa: art. 282a § 2 Op — „Przepisu § 1 nie stosuje się, jeżeli kontrola podatkowa jest niezbędna dla przeprowadzenia postępowania w: sprawie stwierdzenia nieważności, stwierdzenia wygaśnięcia, uchylenia lub zmiany decyzji ostatecznej lub wznowienia postępowania w sprawie zakończonej de…”

---

**Kolejność czynności · sequence · single · poziom 3** — `order:kpa-odwolanie`

> Odwołanie od decyzji (Kpa): w jakiej kolejności następują czynności?
>
> A. Przesłanie odwołania wraz z aktami sprawy organowi odwoławczemu
> B. Wniesienie odwołania za pośrednictwem organu, który wydał decyzję
> C. Doręczenie decyzji stronie

- ✅ C → B → A
- ▫️ A → C → B
- ▫️ B → C → A
- ▫️ C → A → B

Odpowiedź: **Doręczenie decyzji stronie → Wniesienie odwołania za pośrednictwem organu, który wydał decyzję → Przesłanie odwołania wraz z aktami sprawy organowi odwoławczemu**

Podstawa: art. 129 § 1 Kpa — „Odwołanie wnosi się do właściwego organu odwoławczego za pośrednictwem organu, który wydał decyzję.”; art. 129 § 2 Kpa — „Odwołanie wnosi się w terminie czternastu dni od dnia doręczenia decyzji stronie, a gdy decyzja została ogłoszona ustnie – od dnia jej ogłoszenia stronie.”; art. 133 Kpa — „Organ administracji publicznej, który wydał decyzję, obowiązany jest przesłać odwołanie wraz z aktami sprawy organowi odwoławczemu w terminie siedmiu dni od dnia, w którym otrzymał odwołanie, jeżeli w tym terminie nie wydał nowej decyzji w myśl art. 132.”

---

**Porównania · deadline · single · poziom 3** — `comparison:zazalenie-termin-upea`

> Porównaj termin do wniesienia zażalenia na postanowienie (egzekucja vs Kpa): u.p.e.a. i Kpa.

- ▫️ u.p.e.a.: 7 dni; Kpa: 3 dni
- ▫️ u.p.e.a.: 3 dni; Kpa: 14 dni
- ✅ u.p.e.a.: 7 dni; Kpa: 7 dni
- ▫️ u.p.e.a.: 14 dni; Kpa: 7 dni

Odpowiedź: **u.p.e.a.: 7 dni; Kpa: 7 dni (art. 17 § 1 u.p.e.a.; art. 141 § 2 Kpa)**

Podstawa: art. 17 § 1 u.p.e.a. — „O ile przepisy niniejszej ustawy nie stanowią inaczej, rozstrzygnięcie i zajmowane przez organ egzekucyjny lub wierzyciela stanowisko w sprawach dotyczących postępowania egzekucyjnego następuje w formie postanowienia. Na postanowienie to służy zażalenie, jeżel…”; art. 141 § 2 Kpa — „Zażalenia wnosi się w terminie siedmiu dni od dnia doręczenia postanowienia stronie, a gdy postanowienie zostało ogłoszone ustnie – od dnia jego ogłoszenia stronie.”

---

**Przesłanki · multiple · multiple · poziom 3** — `conditions:multiple:upea:64c:§ 3`

> Art. 64c § 3 u.p.e.a.: zaznacz wszystkie przesłanki / przypadki, które wymienia ten przepis.
>
> „Wierzyciel pokrywa koszty egzekucyjne, jeżeli:”

- ▫️ spisanie przez pracownika obsługującego organ egzekucyjny protokołu zawierającego oświadczenie zobowiązanego o posiadanym majątku i źródłach dochodu — _Tego art. 64c § 3 u.p.e.a. nie wymienia — pochodzi z art. 64 § 10 pkt 1a u.p.e.a.._
- ✅ spowodował niezgodne z prawem wszczęcie lub prowadzenie egzekucji administracyjnej
- ▫️ zmianie danych dotyczących zobowiązanego, o których mowa w art. 27 § 1 pkt 2, w zakresie niezbędnym do prowadzenia egzekucji administracyjnej — _Tego art. 64c § 3 u.p.e.a. nie wymienia — pochodzi z art. 32a § 4 pkt 6 u.p.e.a.._
- ✅ organ egzekucyjny nie przystąpił do egzekucji administracyjnej na podstawie art. 29 § 2 pkt 1 i 3
- ▫️ wygaśnięcie obowiązku w całości albo w części — _Tego art. 64c § 3 u.p.e.a. nie wymienia — pochodzi z art. 33 § 2 pkt 5 u.p.e.a.._
- ✅ nie mogą być wyegzekwowane od zobowiązanego

Odpowiedź: **organ egzekucyjny nie przystąpił do egzekucji administracyjnej na podstawie art. 29 § 2 pkt 1 i 3; nie mogą być wyegzekwowane od zobowiązanego; spowodował niezgodne z prawem wszczęcie lub prowadzenie egzekucji administracyjnej**

Podstawa: art. 64c § 3 u.p.e.a. — „Wierzyciel pokrywa koszty egzekucyjne, jeżeli: nie mogą być wyegzekwowane od zobowiązanego; spowodował niezgodne z prawem wszczęcie lub prowadzenie egzekucji administracyjnej; organ egzekucyjny nie przystąpił do egzekucji administracyjnej na podstawie art. 29 …”

---

**Przesłanki · not-listed · single · poziom 2** — `conditions:not-listed:upea:59:§ 1`

> Czego NIE wymienia art. 59 § 1 u.p.e.a.?
>
> „Postępowanie egzekucyjne umarza się w całości albo w części w przypadku:”

- ▫️ niewykonalności obowiązku o charakterze niepieniężnym
- ✅ imienia i nazwiska oraz adresu do korespondencji przedstawiciela ustawowego zobowiązanego
- ▫️ niespełnienia w tytule wykonawczym wymogów określonych w art. 27
- ▫️ gdy z wnioskiem o umorzenie postępowania egzekucyjnego wystąpi wierzyciel

Odpowiedź: **imienia i nazwiska oraz adresu do korespondencji przedstawiciela ustawowego zobowiązanego**

Podstawa: art. 59 § 1 u.p.e.a. — „Postępowanie egzekucyjne umarza się w całości albo w części w przypadku: niedopuszczalności egzekucji administracyjnej, w tym ze względu na zobowiązanego; niewykonalności obowiązku o charakterze niepieniężnym; niespełnienia w tytule wykonawczym wymogów określo…”

---

**Wyliczenia · recall · flashcard · poziom 3** — `enumeration:recall:ordynacja:172:§ 2`

> Wymień elementy z art. 172 § 2 Op (lista przykładowa).
>
> „W szczególności sporządza się protokół:”

Odpowiedź:

- 1) przyjęcia wniesionego ustnie podania
- 2) przesłuchania strony, świadka i biegłego
- 3) oględzin i ekspertyz dokonywanych przy udziale pracownika organu podatkowego
- 4) ustnego ogłoszenia postanowienia
- 5) rozprawy

Podstawa: art. 172 § 2 Op — „W szczególności sporządza się protokół: przyjęcia wniesionego ustnie podania; przesłuchania strony, świadka i biegłego; oględzin i ekspertyz dokonywanych przy udziale pracownika organu podatkowego; ustnego ogłoszenia postanowienia; rozprawy.”

---

_Odrzuceń z detalem: 555. Pełna lista: `npm run build:questions -- --rejected`._
