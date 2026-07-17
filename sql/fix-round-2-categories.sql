do $$
declare
  round_1_id uuid;
  round_2_id uuid;
  missing_codes text[];
begin
  select id
  into round_1_id
  from public.events
  where slug = 'puchar-polski-bmx-freestyle-runda-1';

  select id
  into round_2_id
  from public.events
  where slug = 'puchar-polski-bmx-freestyle-runda-2';

  if round_1_id is null then
    raise exception 'Missing source event: puchar-polski-bmx-freestyle-runda-1';
  end if;

  if round_2_id is null then
    raise exception 'Missing target event: puchar-polski-bmx-freestyle-runda-2';
  end if;

  select array_agg(code order by code)
  into missing_codes
  from (
    values ('PRO'), ('AMATOR'), ('JUNIOR')
  ) as required(code)
  where not exists (
    select 1
    from public.event_categories source_category
    where source_category.event_id = round_1_id
      and source_category.code = required.code
      and source_category.gender_scope = 'open'
  );

  if missing_codes is not null then
    raise exception 'Missing source categories for round 1: %', array_to_string(missing_codes, ', ');
  end if;

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
    round_2_id,
    source_category.code,
    source_category.name,
    source_category.description,
    case source_category.code
      when 'PRO' then 1
      when 'AMATOR' then 2
      when 'JUNIOR' then 3
      else source_category.sort_order
    end,
    source_category.capacity,
    true,
    source_category.gender_scope,
    source_category.age_min,
    source_category.age_max,
    source_category.requires_license
  from public.event_categories source_category
  where source_category.event_id = round_1_id
    and source_category.code in ('PRO', 'AMATOR', 'JUNIOR')
    and source_category.gender_scope = 'open'
  on conflict (event_id, code, gender_scope) do update set
    name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    capacity = excluded.capacity,
    is_active = true,
    age_min = excluded.age_min,
    age_max = excluded.age_max,
    requires_license = excluded.requires_license,
    updated_at = now();

  update public.events
  set
    rules_url = 'https://www.bmxseries.pl/regulamin',
    updated_at = now()
  where rules_url is distinct from 'https://www.bmxseries.pl/regulamin';
end $$;

select
  event.slug,
  category.code,
  category.name,
  category.sort_order,
  category.is_active,
  category.capacity,
  category.requires_license,
  category.age_min,
  category.age_max
from public.events event
left join public.event_categories category on category.event_id = event.id
where event.slug in (
  'puchar-polski-bmx-freestyle-runda-1',
  'puchar-polski-bmx-freestyle-runda-2'
)
order by event.slug, category.sort_order, category.code;

select slug, rules_url
from public.events
order by starts_at;
