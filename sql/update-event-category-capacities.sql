-- Idempotent update for BMX Series category limits.
-- Applies to existing event categories by event slug and category code. No UUIDs are hardcoded.

update public.event_categories category
set
  capacity = case
    when upper(category.code) = 'PRO' then null
    when upper(category.code) = 'AMATOR' then 30
    when upper(category.code) = 'JUNIOR' then 20
    else category.capacity
  end,
  updated_at = now()
from public.events event
where category.event_id = event.id
  and event.slug in (
    'puchar-polski-bmx-freestyle-runda-1',
    'puchar-polski-bmx-freestyle-runda-2'
  )
  and upper(category.code) in ('PRO', 'AMATOR', 'JUNIOR');
