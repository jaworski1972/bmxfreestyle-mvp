-- Zamiast listy rezerwowej: po zapełnieniu kategorii tworzymy kolejną grupę
-- (Grupa 1, Grupa 2, ...) z tym samym limitem miejsc co pierwsza grupa.
-- Status "waitlist" pozostaje w bazie tylko dla historycznych rekordów
-- sprzed tej zmiany — nowe zgłoszenia już go nie dostają.

alter table public.registrations
  add column if not exists group_number integer not null default 1;

comment on column public.registrations.group_number is
  'Numer grupy startowej w ramach kategorii (1, 2, 3...). Zamiast listy rezerwowej po zapełnieniu grupy 1 kolejni zawodnicy trafiają do grupy 2 itd.';

create index if not exists registrations_category_group_idx
  on public.registrations(category_id, group_number);

-- ---------------------------------------------------------------------
-- create_registration_with_limits: teraz przydziela group_number zamiast
-- ustawiać status na 'waitlist'. Status zawsze zostaje 'pending_review'
-- (o ile kategoria nie jest jednoznacznie zamknięta gdzie indziej w logice).
-- ---------------------------------------------------------------------
create or replace function public.create_registration_with_limits(registration_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  category_row public.event_categories%rowtype;
  identity_key text;
  group_num integer := 1;
  group_count integer;
  inserted public.registrations%rowtype;
begin
  select *
  into category_row
  from public.event_categories
  where id = (registration_payload->>'category_id')::uuid
  for update;

  if category_row.id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'category_not_available',
      'error', 'Nie znaleziono wybranej kategorii.'
    );
  end if;

  identity_key := public.registration_athlete_identity_key(
    registration_payload->>'first_name',
    registration_payload->>'last_name',
    (registration_payload->>'birth_date')::date
  );

  if exists (
    select 1
    from public.registrations
    where event_id = (registration_payload->>'event_id')::uuid
      and athlete_identity_key = identity_key
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'duplicate_registration',
      'error', 'Ten zawodnik jest już zapisany na wybrane zawody. Nie wysyłaj ponownego zgłoszenia. W razie potrzeby zmiany danych skontaktuj się z organizatorem.'
    );
  end if;

  if category_row.capacity is not null then
    loop
      select count(*)
      into group_count
      from public.registrations
      where category_id = category_row.id
        and group_number = group_num
        and status in ('pending_review', 'accepted', 'needs_info');

      exit when group_count < category_row.capacity;
      group_num := group_num + 1;
    end loop;
  end if;

  insert into public.registrations (
    event_id,
    category_id,
    status,
    group_number,
    confirmation_token,
    athlete_identity_key,
    first_name,
    last_name,
    birth_date,
    email,
    phone,
    city,
    country,
    gender,
    club_team,
    license_type,
    license_number,
    uci_id,
    federation_country,
    guardian_required,
    guardian_full_name,
    guardian_email,
    guardian_phone,
    guardian_relationship,
    consents,
    source
  ) values (
    (registration_payload->>'event_id')::uuid,
    category_row.id,
    'pending_review',
    group_num,
    coalesce((registration_payload->>'confirmation_token')::uuid, gen_random_uuid()),
    identity_key,
    registration_payload->>'first_name',
    registration_payload->>'last_name',
    (registration_payload->>'birth_date')::date,
    registration_payload->>'email',
    registration_payload->>'phone',
    nullif(registration_payload->>'city', ''),
    coalesce(nullif(registration_payload->>'country', ''), 'Polska'),
    nullif(registration_payload->>'gender', ''),
    nullif(registration_payload->>'club_team', ''),
    nullif(registration_payload->>'license_type', ''),
    nullif(registration_payload->>'license_number', ''),
    nullif(registration_payload->>'uci_id', ''),
    nullif(registration_payload->>'federation_country', ''),
    coalesce((registration_payload->>'guardian_required')::boolean, false),
    nullif(registration_payload->>'guardian_full_name', ''),
    nullif(registration_payload->>'guardian_email', ''),
    nullif(registration_payload->>'guardian_phone', ''),
    nullif(registration_payload->>'guardian_relationship', ''),
    coalesce(registration_payload->'consents', '[]'::jsonb),
    coalesce(nullif(registration_payload->>'source', ''), 'public')
  )
  returning * into inserted;

  return jsonb_build_object(
    'ok', true,
    'id', inserted.id,
    'status', inserted.status,
    'group_number', inserted.group_number,
    'confirmation_token', inserted.confirmation_token,
    'created_at', inserted.created_at,
    'message', case
      when inserted.group_number > 1
        then format('Zgłoszenie zostało przyjęte do systemu (Grupa %s) i oczekuje na weryfikację organizatora.', inserted.group_number)
      else 'Zgłoszenie zostało przyjęte do systemu i oczekuje na weryfikację organizatora.'
    end
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'code', 'duplicate_registration',
      'error', 'Ten zawodnik jest już zapisany na wybrane zawody. Nie wysyłaj ponownego zgłoszenia. W razie potrzeby zmiany danych skontaktuj się z organizatorem.'
    );
end;
$$;

-- ---------------------------------------------------------------------
-- update_registration_status_with_limits: usunięta blokada "category_full".
-- Grupa jest przydzielana raz, przy tworzeniu zgłoszenia. Zmiana statusu
-- (np. rejected -> accepted) już nie jest blokowana limitem — organizator
-- ma pełną kontrolę i widzi w panelu ile osób jest w danej grupie.
-- ---------------------------------------------------------------------
create or replace function public.update_registration_status_with_limits(
  registration_id_input uuid,
  status_input text,
  status_note_input text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  registration_row public.registrations%rowtype;
begin
  if status_input not in ('pending_review', 'accepted', 'needs_info', 'rejected', 'waitlist') then
    return jsonb_build_object('ok', false, 'code', 'invalid_status', 'error', 'Invalid registration status.');
  end if;

  select *
  into registration_row
  from public.registrations
  where id = registration_id_input
  for update;

  if registration_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'registration_not_found', 'error', 'Nie znaleziono zgłoszenia.');
  end if;

  update public.registrations
  set
    status = status_input,
    status_note = nullif(status_note_input, ''),
    updated_at = now()
  where id = registration_id_input;

  return jsonb_build_object('ok', true, 'id', registration_id_input, 'status', status_input);
end;
$$;
