create extension if not exists pgcrypto;

alter table public.registrations
  add column if not exists athlete_identity_key text null;

create or replace function public.registration_identity_part(value text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(btrim(coalesce(value, '')), '\s+', ' ', 'g'));
$$;

create or replace function public.registration_athlete_identity_key(
  first_name_input text,
  last_name_input text,
  birth_date_input date
)
returns text
language sql
immutable
as $$
  select encode(
    digest(
      public.registration_identity_part(first_name_input)
        || '|'
        || public.registration_identity_part(last_name_input)
        || '|'
        || coalesce(birth_date_input::text, ''),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function public.set_registration_athlete_identity_key()
returns trigger
language plpgsql
as $$
begin
  new.athlete_identity_key := public.registration_athlete_identity_key(
    new.first_name,
    new.last_name,
    new.birth_date
  );
  return new;
end;
$$;

drop trigger if exists registrations_set_athlete_identity_key on public.registrations;
create trigger registrations_set_athlete_identity_key
before insert or update of first_name, last_name, birth_date
on public.registrations
for each row
execute function public.set_registration_athlete_identity_key();

update public.registrations
set athlete_identity_key = public.registration_athlete_identity_key(first_name, last_name, birth_date)
where athlete_identity_key is null;

do $$
begin
  if not exists (
    select 1
    from public.registrations
    where athlete_identity_key is not null
    group by event_id, athlete_identity_key
    having count(*) > 1
  ) then
    execute 'create unique index if not exists registrations_event_athlete_identity_unique_idx
      on public.registrations(event_id, athlete_identity_key)
      where athlete_identity_key is not null';
  else
    raise notice 'Duplicate registrations exist. Run sql/report-duplicate-registrations.sql and resolve duplicates before creating registrations_event_athlete_identity_unique_idx.';
  end if;
end;
$$;

create or replace function public.create_registration_with_limits(registration_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  category_row public.event_categories%rowtype;
  identity_key text;
  occupied_count integer;
  final_status text := 'pending_review';
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
    select count(*)
    into occupied_count
    from public.registrations
    where category_id = category_row.id
      and status in ('pending_review', 'accepted', 'needs_info');

    if occupied_count >= category_row.capacity then
      final_status := 'waitlist';
    end if;
  end if;

  insert into public.registrations (
    event_id,
    category_id,
    status,
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
    final_status,
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
    'confirmation_token', inserted.confirmation_token,
    'created_at', inserted.created_at,
    'message', case
      when inserted.status = 'waitlist'
        then 'Limit miejsc w tej kategorii został wyczerpany. Zgłoszenie zostało dodane do listy rezerwowej.'
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
  category_row public.event_categories%rowtype;
  occupied_count integer;
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

  if status_input in ('pending_review', 'accepted', 'needs_info')
    and registration_row.status not in ('pending_review', 'accepted', 'needs_info') then
    select *
    into category_row
    from public.event_categories
    where id = registration_row.category_id
    for update;

    if category_row.capacity is not null then
      select count(*)
      into occupied_count
      from public.registrations
      where category_id = category_row.id
        and id <> registration_id_input
        and status in ('pending_review', 'accepted', 'needs_info');

      if occupied_count >= category_row.capacity then
        return jsonb_build_object(
          'ok', false,
          'code', 'category_full',
          'error', 'Limit miejsc w tej kategorii został wyczerpany. Nie można zmienić statusu zgłoszenia na zajmujący miejsce.'
        );
      end if;
    end if;
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
