-- Run before enforcing the unique registration identity index.
-- Duplicates here require a manual organizer decision. This query does not change data.

create extension if not exists pgcrypto;

select
  event_id,
  encode(
    digest(
      lower(regexp_replace(btrim(coalesce(first_name, '')), '\s+', ' ', 'g'))
        || '|'
        || lower(regexp_replace(btrim(coalesce(last_name, '')), '\s+', ' ', 'g'))
        || '|'
        || birth_date::text,
      'sha256'
    ),
    'hex'
  ) as athlete_identity_key,
  min(first_name) as sample_first_name,
  min(last_name) as sample_last_name,
  birth_date,
  count(*) as duplicate_count,
  array_agg(id order by created_at asc) as registration_ids,
  array_agg(status order by created_at asc) as statuses
from public.registrations
group by
  event_id,
  encode(
    digest(
      lower(regexp_replace(btrim(coalesce(first_name, '')), '\s+', ' ', 'g'))
        || '|'
        || lower(regexp_replace(btrim(coalesce(last_name, '')), '\s+', ' ', 'g'))
        || '|'
        || birth_date::text,
      'sha256'
    ),
    'hex'
  ),
  birth_date
having count(*) > 1
order by duplicate_count desc, birth_date asc;
