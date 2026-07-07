# BMX Freestyle Polska

MVP systemu zapisów dla BMX Freestyle Polska działający pod domeną `https://bmxfreestyle.pl`.

Projekt obejmuje publiczny formularz zapisów, panel organizatora, statusy zgłoszeń, eksport CSV oraz podstawowe zarządzanie konfiguracją zawodów: wydarzeniami, kategoriami i zgodami.

## Uruchomienie lokalne

```bash
npm install
npm run check
npm run dev
```

Domyślny adres lokalny:

```text
http://127.0.0.1:5178
```

Jeżeli port jest zajęty, można uruchomić podgląd na innym porcie:

```bash
PORT=5179 npm run dev
```

## Lokalne logowanie admina

Mock API w `dev-server.js` ma lokalne konto organizatora:

- login: `admin`
- hasło: `admin`

Lokalny mock trzyma dane w pamięci. Wydarzenia, kategorie, zgody i zgłoszenia dodane lokalnie znikają po restarcie serwera.

## Publiczne ścieżki

- `/` — strona startowa.
- `/zawody` — lista wydarzeń.
- `/zawody/:slug` — szczegóły wydarzenia.
- `/zapisy/puchar-polski-bmx-freestyle-runda-1` — formularz zapisów dla wydarzenia testowego.
- `/regulamin` — miejsce na regulamin i dokumenty.
- `/faq` — podstawowe FAQ.

## Ścieżki admina

- `/admin` — logowanie i dashboard.
- `/admin/zgloszenia` — lista zgłoszeń, filtry, szczegóły, zmiana statusów i eksport CSV.
- `/admin/zawody` — dodawanie i edycja wydarzeń.
- `/admin/kategorie` — dodawanie, edycja i dezaktywacja kategorii wydarzenia.
- `/admin/zgody` — dodawanie, edycja i dezaktywacja zgód wydarzenia.

## Status zapisów

Publiczny formularz pozwala wysłać zgłoszenie tylko wtedy, gdy wydarzenie ma status:

```text
registration_open
```

Jeżeli status to `planned`, `registration_closed`, `cancelled` albo `finished`, formularz pokazuje komunikat i blokuje wysyłkę. Backend `POST /api/register` waliduje to ponownie, więc nie da się ominąć blokady przez ręczne wysłanie requestu.

## Okno zapisów

Wydarzenie może mieć ustawione:

- `registration_starts_at`
- `registration_ends_at`

Jeżeli te pola istnieją, formularz i backend sprawdzają, czy aktualna data mieści się w oknie zapisów. Poza tym oknem wysyłka jest blokowana nawet przy statusie `registration_open`.

## Status zgłoszenia

Nowe zgłoszenie dostaje status:

```text
pending_review
```

Oznacza to, że zgłoszenie zostało przyjęte do systemu, ale organizator musi je zweryfikować. Panel pozwala zmienić status na `accepted`, `needs_info`, `rejected` albo `waitlist` i zapisać notatkę statusową. Jeżeli Resend jest skonfigurowany, system próbuje wysłać mail statusowy.

## Supabase i produkcja

Pliki w `api/` są przygotowane pod serverless/Vercel i używają Supabase przez `SUPABASE_SERVICE_ROLE_KEY`. Lokalny `dev-server.js` używa mock API.

Aby przełączyć produkcję na prawdziwe Supabase, ustaw zmienne środowiskowe:

- `APP_URL=https://bmxfreestyle.pl`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `MAIL_REPLY_TO`
- `ADMIN_NOTIFICATION_EMAIL`
- `ADMIN_LOGIN`
- `ADMIN_PASSWORD`
- `ADMIN_AUTH_SECRET`

Brak konfiguracji Resend nie blokuje rejestracji ani zmiany statusu. API zwróci wtedy informację, że mail został pominięty.

## Migracja i seed

1. Uruchom migrację:

```sql
sql/supabase-bmx-schema.sql
```

2. Uruchom seed:

```sql
sql/supabase-bmx-seed.sql
```

Schema zawiera tabele:

- `events`
- `event_categories`
- `event_consents`
- `registrations`

Seed dodaje wydarzenie testowe `Puchar Polski BMX Freestyle — Runda 1`, kategorie `PRO`, `AMATOR`, `JUNIOR` oraz wymagane zgody, w tym wymaganą zgodę na wizerunek.

Kody kategorii nie są ograniczone wyłącznie do `PRO`, `AMATOR`, `JUNIOR`, więc w przyszłości można dodać kolejne kategorie bez przebudowy schematu. MVP nie aktywuje osobnych kategorii kobiet.

## Poza MVP

Na tym etapie projekt nie obejmuje:

- wyników,
- rankingów,
- numerów startowych,
- panelu sędziego,
- płatności,
- SMS,
- osobnej subdomeny do zapisów.
