alter table public.registrations
  add column if not exists checkin_status text not null default 'not_checked_in',
  add column if not exists checked_in_at timestamptz null,
  add column if not exists start_order integer null,
  add column if not exists bib_number text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'registrations_checkin_status_check'
      and conrelid = 'public.registrations'::regclass
  ) then
    alter table public.registrations
      add constraint registrations_checkin_status_check
      check (checkin_status in ('not_checked_in', 'checked_in', 'absent'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'registrations_start_order_check'
      and conrelid = 'public.registrations'::regclass
  ) then
    alter table public.registrations
      add constraint registrations_start_order_check
      check (start_order is null or start_order > 0);
  end if;
end $$;

create index if not exists registrations_checkin_idx
  on public.registrations(event_id, category_id, checkin_status);

create index if not exists registrations_start_order_idx
  on public.registrations(event_id, category_id, start_order);
