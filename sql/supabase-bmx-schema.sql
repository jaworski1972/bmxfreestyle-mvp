create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type text not null,
  round_number integer null,
  starts_at timestamptz not null,
  ends_at timestamptz null,
  city text not null,
  venue text not null,
  description text null,
  status text not null default 'planned',
  registration_starts_at timestamptz null,
  registration_ends_at timestamptz null,
  capacity_total integer null check (capacity_total is null or capacity_total >= 0),
  rules_url text null,
  rules_body text null,
  organizer_message text null,
  settings jsonb not null default '{"juniorMaxAge":15,"requireLicenseForPro":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_type_check check (type in ('polish_cup', 'polish_championship', 'other')),
  constraint events_status_check check (status in ('planned', 'registration_open', 'registration_closed', 'cancelled', 'finished'))
);

create table if not exists public.event_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  code text not null,
  name text not null,
  description text null,
  sort_order integer not null default 0,
  capacity integer null check (capacity is null or capacity >= 0),
  is_active boolean not null default true,
  gender_scope text not null default 'open',
  age_min integer null check (age_min is null or age_min >= 0),
  age_max integer null check (age_max is null or age_max >= 0),
  requires_license boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_categories_code_check check (length(trim(code)) > 0),
  constraint event_categories_gender_scope_check check (gender_scope in ('open', 'men', 'women', 'girls')),
  constraint event_categories_age_range_check check (age_min is null or age_max is null or age_min <= age_max),
  unique (event_id, code, gender_scope)
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category_id uuid not null references public.event_categories(id) on delete restrict,
  status text not null default 'new',
  status_note text null,
  confirmation_token uuid not null default gen_random_uuid(),
  confirmed_at timestamptz null,
  first_name text not null,
  last_name text not null,
  birth_date date not null,
  email text not null,
  phone text not null,
  city text null,
  country text not null default 'Polska',
  gender text null,
  club_team text null,
  license_type text null,
  license_number text null,
  uci_id text null,
  federation_country text null,
  guardian_required boolean not null default false,
  guardian_full_name text null,
  guardian_email text null,
  guardian_phone text null,
  guardian_relationship text null,
  consents jsonb not null default '{}'::jsonb,
  source text not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registrations_status_check check (status in ('new', 'pending_review', 'accepted', 'needs_info', 'rejected', 'waitlist')),
  constraint registrations_source_check check (source in ('public', 'admin')),
  constraint registrations_guardian_required_check check (
    guardian_required = false
    or (
      nullif(trim(guardian_full_name), '') is not null
      and nullif(trim(guardian_email), '') is not null
      and nullif(trim(guardian_phone), '') is not null
    )
  )
);

create table if not exists public.event_consents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  code text not null,
  label text not null,
  body text not null,
  required boolean not null default true,
  guardian_only boolean not null default false,
  athlete_adult_only boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, code)
);

create index if not exists events_slug_idx on public.events(slug);
alter table public.event_categories drop constraint if exists event_categories_code_check;
alter table public.event_categories add constraint event_categories_code_check check (length(trim(code)) > 0);
create index if not exists events_status_idx on public.events(status);
create index if not exists events_starts_at_idx on public.events(starts_at);
create index if not exists event_categories_event_id_idx on public.event_categories(event_id);
create index if not exists event_categories_code_idx on public.event_categories(code);
create index if not exists registrations_event_id_idx on public.registrations(event_id);
create index if not exists registrations_category_id_idx on public.registrations(category_id);
create index if not exists registrations_status_idx on public.registrations(status);
create index if not exists registrations_email_idx on public.registrations(email);
create index if not exists registrations_created_at_idx on public.registrations(created_at desc);
create unique index if not exists registrations_confirmation_token_idx on public.registrations(confirmation_token);
create index if not exists event_consents_event_id_idx on public.event_consents(event_id);
create index if not exists event_consents_code_idx on public.event_consents(code);
