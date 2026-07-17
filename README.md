# BMX Freestyle Polska

MVP systemu zapisów dla BMX Freestyle Polska działający docelowo pod domeną `https://www.bmxseries.pl`.

Projekt obejmuje publiczny formularz zapisów, panel organizatora, statusy zgłoszeń, check-in, listy startowe, eksport CSV oraz podstawowe zarządzanie konfiguracją zawodów: wydarzeniami, kategoriami i zgodami.

## Lokalnie

```bash
npm install
npm run check
npm run dev
```

Domyślny adres lokalny:

```text
http://127.0.0.1:5178
```

Jeżeli port jest zajęty:

```bash
PORT=5179 npm run dev
```

Lokalnie działa mock API w `dev-server.js`. Mock trzyma dane w pamięci, więc wydarzenia, kategorie, zgody i zgłoszenia dodane lokalnie znikają po restarcie serwera.

Lokalne konto mock admina:

- login: `admin`
- hasło: `admin`

To konto działa tylko w lokalnym mocku. Produkcja i staging wymagają `ADMIN_LOGIN` oraz `ADMIN_PASSWORD`.

## Publiczne Ścieżki

- `/` — strona startowa.
- `/zawody` — lista wydarzeń.
- `/zawody/:slug` — szczegóły wydarzenia.
- `/zapisy/puchar-polski-bmx-freestyle-runda-1` — formularz zapisów dla wydarzenia testowego.
- `/potwierdz?token=...` — publiczne potwierdzenie zgłoszenia z kodem QR do okazania przy check-inie.
- `/regulamin` — ogólny regulamin zawodów BMX Series.
- `/faq` — pełne FAQ dla zawodników i opiekunów.

## Ścieżki Admina

- `/admin` — logowanie i dashboard.
- `/admin/zgloszenia` — lista zgłoszeń, filtry, szczegóły, zmiana statusów i eksport CSV.
- `/checkin` — operacyjna odprawa zaakceptowanych zawodników.
- `/admin/listy-startowe` — kolejność startowa, opcjonalne numery i eksport CSV.
- `/admin/zawody` — dodawanie i edycja wydarzeń.
- `/admin/kategorie` — dodawanie, edycja i dezaktywacja kategorii wydarzenia.
- `/admin/zgody` — dodawanie, edycja i dezaktywacja zgód wydarzenia.

## Statusy I Okno Zapisów

Publiczny formularz pozwala wysłać zgłoszenie tylko wtedy, gdy wydarzenie ma status:

```text
registration_open
```

Jeżeli status to `planned`, `registration_closed`, `cancelled` albo `finished`, formularz pokazuje komunikat i blokuje wysyłkę. Backend `POST /api/register` waliduje to ponownie.

Jeżeli wydarzenie ma ustawione `registration_starts_at` i/lub `registration_ends_at`, formularz oraz backend sprawdzają, czy aktualna data mieści się w oknie zapisów. Poza tym oknem wysyłka jest blokowana nawet przy statusie `registration_open`.

Nowe zgłoszenie dostaje status:

```text
pending_review
```

Organizator może później zmienić status na `accepted`, `needs_info`, `rejected` albo `waitlist` i dopisać notatkę statusową.

## Check-in I Listy Startowe

Check-in działa dla zgłoszeń ze statusem `accepted` oraz technicznie także `waitlist`. Widok `/checkin` pokazuje domyślnie zaakceptowanych zawodników w wybranym wydarzeniu i kategorii.

Statusy check-in:

```text
not_checked_in
checked_in
absent
```

Widok `/admin/listy-startowe` pozwala ustawić `start_order`, opcjonalny `bib_number`, automatycznie nadać kolejność po dacie zgłoszenia, alfabetycznie albo losowo i pobrać CSV listy startowej.

Endpointy:

- `GET /api/start-list?eventId=&categoryId=` — lista zaakceptowanych zawodników.
- `PATCH /api/checkin` — zmiana statusu check-inu przez admina.
- `PATCH /api/start-order` — zapis kolejności startowej przez admina.
- `GET /api/start-list-export?eventId=&categoryId=` — CSV listy startowej.

## Deployment Na Vercel

Projekt jest przygotowany jako statyczny frontend z endpointami serverless w katalogu `api/`.

Ważne pliki:

- `index.html` i `app.js` — publiczna aplikacja.
- `admin.html` i `admin.js` — panel organizatora.
- `api/` — endpointy serverless dla Vercel.
- `vercel.json` — rewrites dla odświeżania tras frontendowych.

`vercel.json` kieruje:

- `/zawody/*` i `/zapisy/*` do `index.html`,
- `/admin` i `/admin/*` do `admin.html`,
- `/checkin` do `checkin.html`.

Endpointy `/api/*` nie są przepisywane do frontendu i pozostają funkcjami serverless Vercel.

Minimalny proces wdrożenia:

1. Wypchnij repo do GitHuba albo podłącz katalog w Vercel CLI.
2. Utwórz projekt Vercel.
3. Ustaw zmienne środowiskowe z sekcji poniżej.
4. Wdróż staging.
5. Uruchom checklistę z `DEPLOYMENT_CHECKLIST.md`.
6. Po pozytywnym smoke-teście podepnij `bmxseries.pl`.
7. Ustaw `APP_URL=https://www.bmxseries.pl` i wykonaj ponowny deploy.

## Zmienne Środowiskowe

Przykład bez sekretów jest w `.env.example`.

Wymagane na stagingu i produkcji:

- `APP_URL` — bazowy adres używany w linkach mailowych, np. stagingowy URL Vercel albo `https://www.bmxseries.pl`.
- `SUPABASE_URL` — URL projektu Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` — service role key Supabase używany wyłącznie w serverless API.
- `RESEND_API_KEY` — API key do wysyłki maili przez Resend.
- `MAIL_FROM` — nadawca, np. `BMX Freestyle Polska <zapisy@bmxseries.pl>`.
- `MAIL_REPLY_TO` — adres odpowiedzi.
- `ADMIN_NOTIFICATION_EMAIL` — adres organizatora do przyszłych powiadomień admina.
- `ADMIN_LOGIN` — produkcyjny login organizatora.
- `ADMIN_PASSWORD` — mocne produkcyjne hasło organizatora.
- `ADMIN_AUTH_SECRET` — długi losowy sekret do podpisywania sesji admina.

Opcjonalne SMS:

- `SMS_PROVIDER` — obsługiwany provider, obecnie `smsapi`.
- `SMS_API_TOKEN` — token providera SMS.
- `SMS_FROM` — zatwierdzona nazwa nadawcy SMSAPI.
- `SMS_DRY_RUN` — `true` symuluje wysyłkę i loguje próbę bez kontaktu z providerem.
- `SEND_SMS_ON_REGISTRATION` — `true` włącza SMS po utworzeniu zgłoszenia.
- `SEND_SMS_ON_ACCEPTED` — `true` włącza SMS po zmianie statusu na `accepted`.

Domyślnie SMS-y są wyłączone. Brak konfiguracji SMS nie blokuje zapisów ani zmiany statusu.

Kod używa nazw `ADMIN_LOGIN`, `ADMIN_PASSWORD` i `ADMIN_AUTH_SECRET`. Nie używa `ADMIN_USERNAME` ani `ADMIN_SESSION_SECRET`.

Nie commituj prawdziwego `.env`. Service role key nie może trafić do kodu publicznego frontendu.

## Supabase

Produkcja i staging korzystają z Supabase. Lokalny `dev-server.js` jest tylko mockiem do pracy lokalnej.

Konfiguracja:

1. Utwórz nowy projekt Supabase.
2. Wejdź w SQL Editor.
3. Uruchom `sql/supabase-bmx-schema.sql`.
4. Uruchom `sql/supabase-bmx-seed.sql`.
5. Przy aktualizacji istniejącej bazy uruchom dodatkowo `sql/supabase-bmx-checkin-migration.sql`.
6. Uruchom `sql/supabase-bmx-confirmation-token-migration.sql`, aby uzupełnić tokeny potwierdzeń i dodać tabelę `sms_logs`.
7. Skopiuj project URL jako `SUPABASE_URL`.
8. Skopiuj service role key jako `SUPABASE_SERVICE_ROLE_KEY`.
9. Nie używaj anon key zamiast service role key w backendzie.

Schema tworzy:

- `events`
- `event_categories`
- `event_consents`
- `registrations`
- `sms_logs`

Migracja check-in dodaje do `registrations` pola `checkin_status`, `checked_in_at`, `start_order` i `bib_number` oraz indeksy dla filtrowania po wydarzeniu, kategorii, statusie check-in i kolejności startowej.

Migracja potwierdzeń uzupełnia `confirmation_token` dla starych zgłoszeń, zakłada unikalny indeks tokena i tworzy `sms_logs` dla prób wysyłki SMS.

Seed dodaje wydarzenie `Puchar Polski BMX Freestyle — Runda 1`, kategorie `PRO`, `AMATOR`, `JUNIOR` oraz wymagane zgody, w tym zgodę na wizerunek.

Kody kategorii nie są ograniczone wyłącznie do trzech kategorii MVP, więc kolejne kategorie można dodać później bez przebudowy schematu.

## Resend

Konfiguracja maili:

1. Utwórz API key w Resend.
2. Ustaw `RESEND_API_KEY` w Vercel.
3. Ustaw `MAIL_FROM`.
4. Ustaw `MAIL_REPLY_TO`.
5. Ustaw `ADMIN_NOTIFICATION_EMAIL`.
6. Zweryfikuj domenę wysyłkową w Resend, jeżeli wysyłasz z adresu w domenie `bmxseries.pl`.

Brak konfiguracji Resend nie blokuje rejestracji ani zmiany statusu. API zwróci wtedy informację, że mail został pominięty. Na stagingu warto jednak sprawdzić pełny przepływ mailowy.

Linki w mailach korzystają z `APP_URL`:

- staging: `APP_URL=https://ADRES-STAGINGU-VERCEL`
- produkcja: `APP_URL=https://www.bmxseries.pl`

## Smoke Testy

Pełna lista testów po deploymencie jest w:

```text
DEPLOYMENT_CHECKLIST.md
```

Minimum przed podpięciem domeny:

- publiczne trasy ładują się po bezpośrednim wejściu i odświeżeniu,
- formularz pobiera wydarzenie, kategorie i zgody z Supabase,
- zgłoszenie PRO, AMATOR i JUNIOR działa zgodnie z walidacją,
- panel admina wymaga logowania,
- zmiana statusu i eksport CSV działają,
- check-in wymaga logowania, pokazuje zaakceptowanych zawodników i zapisuje obecność,
- listy startowe zapisują kolejność oraz eksportują CSV,
- maile rejestracyjne i statusowe dochodzą,
- linki w mailach prowadzą do adresu z `APP_URL`.

## Poza MVP

Na tym etapie projekt nie obejmuje:

- wyników,
- rankingów,
- panelu sędziego,
- płatności,
- osobnej subdomeny do zapisów.
