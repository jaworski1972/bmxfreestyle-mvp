with upserted_event as (
  insert into public.events (
    slug,
    name,
    type,
    round_number,
    starts_at,
    ends_at,
    city,
    venue,
    description,
    status,
    registration_starts_at,
    registration_ends_at,
    capacity_total,
    rules_url,
    organizer_message,
    settings
  ) values (
    'puchar-polski-bmx-freestyle-runda-1',
    'Puchar Polski BMX Freestyle — Runda 1',
    'polish_cup',
    1,
    '2027-05-24 09:00:00+02',
    '2027-05-25 18:00:00+02',
    'Warszawa',
    'Skatepark Warszawa',
    'Pierwsza runda Pucharu Polski BMX Freestyle w sezonie 2027.',
    'registration_open',
    '2027-03-01 10:00:00+01',
    '2027-05-20 23:59:00+02',
    120,
    'https://www.bmxseries.pl/regulamin',
    'Zapisy są otwarte. Organizator potwierdzi przyjęcie zgłoszenia po weryfikacji danych.',
    '{"juniorMaxAge":15,"requireLicenseForPro":true}'::jsonb
  )
  on conflict (slug) do update set
    name = excluded.name,
    type = excluded.type,
    round_number = excluded.round_number,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    city = excluded.city,
    venue = excluded.venue,
    description = excluded.description,
    status = excluded.status,
    registration_starts_at = excluded.registration_starts_at,
    registration_ends_at = excluded.registration_ends_at,
    capacity_total = excluded.capacity_total,
    rules_url = excluded.rules_url,
    organizer_message = excluded.organizer_message,
    settings = excluded.settings,
    updated_at = now()
  returning id
)
insert into public.event_categories (
  event_id,
  code,
  name,
  description,
  sort_order,
  capacity,
  is_active,
  gender_scope,
  age_min,
  age_max,
  requires_license
)
select
  upserted_event.id,
  category.code,
  category.name,
  category.description,
  category.sort_order,
  category.capacity,
  true,
  'open',
  category.age_min,
  category.age_max,
  category.requires_license
from upserted_event
cross join (
  values
    ('PRO', 'PRO', 'Kategoria dla zawodników z licencją PZKol, UCI lub federacji krajowej.', 1, 40, 16, null, true),
    ('AMATOR', 'AMATOR', 'Otwarta kategoria dla zawodników bez licencji.', 2, 50, 16, null, false),
    ('JUNIOR', 'JUNIOR', 'Kategoria dla młodszych zawodników. Granica wieku wynika z ustawień wydarzenia.', 3, 30, null, 15, false)
) as category(code, name, description, sort_order, capacity, age_min, age_max, requires_license)
on conflict (event_id, code, gender_scope) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  capacity = excluded.capacity,
  age_min = excluded.age_min,
  age_max = excluded.age_max,
  requires_license = excluded.requires_license,
  is_active = excluded.is_active,
  updated_at = now();

with event_ref as (
  select id from public.events where slug = 'puchar-polski-bmx-freestyle-runda-1'
)
insert into public.event_consents (
  event_id,
  code,
  label,
  body,
  required,
  guardian_only,
  athlete_adult_only,
  sort_order,
  active
)
select
  event_ref.id,
  consent.code,
  consent.label,
  consent.body,
  consent.required,
  consent.guardian_only,
  consent.athlete_adult_only,
  consent.sort_order,
  true
from event_ref
cross join (
  values
    ('rules_acceptance', 'Akceptacja regulaminu', 'Potwierdzam zapoznanie się z regulaminem zawodów BMX Freestyle Polska i akceptuję jego postanowienia.', true, false, false, 1),
    ('health_statement', 'Oświadczenie o stanie zdrowia', 'Oświadczam, że zawodnik nie ma przeciwwskazań zdrowotnych do udziału w zawodach BMX Freestyle.', true, false, false, 2),
    ('gdpr', 'Zgoda RODO', 'Potwierdzam zapoznanie się z informacją o przetwarzaniu danych osobowych na potrzeby organizacji zawodów.', true, false, false, 3),
    ('image', 'Zgoda na wizerunek', 'Wyrażam zgodę na wykorzystanie wizerunku zawodnika w materiałach informacyjnych i promocyjnych organizatora.', true, false, false, 4),
    ('guardian_participation', 'Zgoda opiekuna dla niepełnoletnich', 'Jako rodzic lub opiekun prawny wyrażam zgodę na udział niepełnoletniego zawodnika w zawodach.', true, true, false, 5)
) as consent(code, label, body, required, guardian_only, athlete_adult_only, sort_order)
on conflict (event_id, code) do update set
  label = excluded.label,
  body = excluded.body,
  required = excluded.required,
  guardian_only = excluded.guardian_only,
  athlete_adult_only = excluded.athlete_adult_only,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();
