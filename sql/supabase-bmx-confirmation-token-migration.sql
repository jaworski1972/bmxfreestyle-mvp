create extension if not exists pgcrypto;

alter table public.registrations
  add column if not exists confirmation_token uuid,
  add column if not exists confirmed_at timestamptz;

update public.registrations
set confirmation_token = gen_random_uuid()
where confirmation_token is null;

alter table public.registrations
  alter column confirmation_token set default gen_random_uuid();

create unique index if not exists registrations_confirmation_token_idx
  on public.registrations(confirmation_token);

create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null references public.events(id) on delete set null,
  registration_id uuid null references public.registrations(id) on delete set null,
  recipient_phone text null,
  recipient_type text null,
  message text not null,
  send_status text not null,
  provider text null,
  provider_message_id text null,
  error_message text null,
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint sms_logs_send_status_check check (send_status in ('sent', 'failed', 'dry_run', 'skipped')),
  constraint sms_logs_recipient_type_check check (recipient_type is null or recipient_type in ('athlete', 'guardian'))
);

create index if not exists sms_logs_registration_id_idx on public.sms_logs(registration_id);
create index if not exists sms_logs_event_id_idx on public.sms_logs(event_id);
create index if not exists sms_logs_created_at_idx on public.sms_logs(created_at desc);
