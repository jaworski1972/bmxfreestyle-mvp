create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null references public.events(id) on delete set null,
  registration_id uuid null references public.registrations(id) on delete set null,
  recipient_name text null,
  recipient_phone text null,
  recipient_type text null,
  category_code text null,
  registration_status text null,
  checkin_status text null,
  message text not null,
  provider text null,
  provider_message_id text null,
  send_status text not null,
  error_message text null,
  sent_by text null,
  sent_at timestamptz null,
  created_at timestamptz not null default now()
);

alter table public.sms_logs
  add column if not exists recipient_name text,
  add column if not exists category_code text,
  add column if not exists registration_status text,
  add column if not exists checkin_status text,
  add column if not exists sent_by text;

alter table public.sms_logs
  drop constraint if exists sms_logs_send_status_check,
  drop constraint if exists sms_logs_recipient_type_check;

alter table public.sms_logs
  add constraint sms_logs_send_status_check
    check (send_status in ('queued', 'sent', 'failed', 'dry_run', 'skipped')),
  add constraint sms_logs_recipient_type_check
    check (recipient_type is null or recipient_type in ('athlete', 'guardian'));

create index if not exists sms_logs_registration_id_idx on public.sms_logs(registration_id);
create index if not exists sms_logs_event_id_idx on public.sms_logs(event_id);
create index if not exists sms_logs_send_status_idx on public.sms_logs(send_status);
create index if not exists sms_logs_created_at_idx on public.sms_logs(created_at desc);
