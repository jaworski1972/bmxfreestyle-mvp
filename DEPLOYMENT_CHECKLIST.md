# Deployment Checklist

Checklist for staging or production deployment on Vercel with real Supabase and Resend.

## Before Deploy

- Confirm `npm run check` passes locally.
- Confirm `vercel.json` rewrites are present for public routes and admin routes.
- Confirm no real `.env` file or secrets are committed.
- Create a Supabase project.
- Run `sql/supabase-bmx-schema.sql` in Supabase SQL Editor.
- Run `sql/supabase-bmx-seed.sql` in Supabase SQL Editor.
- Copy `SUPABASE_URL`.
- Copy the Supabase service role key as `SUPABASE_SERVICE_ROLE_KEY`.
- Do not use the Supabase anon key for serverless API writes.
- Create a Resend API key.
- Configure `MAIL_FROM`, `MAIL_REPLY_TO`, and `ADMIN_NOTIFICATION_EMAIL`.
- Set `APP_URL` to the staging Vercel URL first, then to `https://www.bmxseries.pl` for production.
- Set production admin credentials with `ADMIN_LOGIN`, `ADMIN_PASSWORD`, and `ADMIN_AUTH_SECRET`.

## Required Vercel Environment Variables

- `APP_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `MAIL_REPLY_TO`
- `ADMIN_NOTIFICATION_EMAIL`
- `ADMIN_LOGIN`
- `ADMIN_PASSWORD`
- `ADMIN_AUTH_SECRET`

## Public Smoke Tests

- Open `/`.
- Open `/zawody`.
- Open `/zawody/puchar-polski-bmx-freestyle-runda-1`.
- Open `/zapisy/puchar-polski-bmx-freestyle-runda-1`.
- Confirm the form loads the event from Supabase.
- Confirm the form loads active categories from Supabase.
- Confirm the form loads active consents from Supabase.
- Submit a PRO registration with license data.
- Submit an AMATOR registration without license data.
- Submit a JUNIOR registration with guardian data.
- Confirm PRO without license data is rejected.
- Confirm an over-age JUNIOR is rejected.
- Confirm missing required consents are rejected.
- Confirm duplicate registration is rejected.
- Confirm a non-`registration_open` event blocks registration.
- Confirm an event outside `registration_starts_at` / `registration_ends_at` blocks registration.

## Admin Smoke Tests

- Open `/admin` and confirm login is required.
- Log in with production/staging admin credentials.
- Open `/admin/zgloszenia`.
- Confirm real registrations from Supabase load.
- Open registration details.
- Change registration status.
- Save a status note.
- Export CSV.
- Open `/admin/zawody`.
- Edit an event.
- Open `/admin/kategorie`.
- Edit a category.
- Deactivate a category and confirm it is hidden from the public form.
- Open `/admin/zgody`.
- Edit a consent.
- Deactivate a consent and confirm it is hidden from the public form.

## Mail Smoke Tests

- Confirm registration confirmation e-mail arrives after a public registration.
- Confirm status-change e-mail arrives after admin status update.
- Confirm e-mail for a minor goes to the guardian e-mail address.
- Confirm all e-mail links use `APP_URL`.
- On staging, confirm links use the staging Vercel URL.
- On production, confirm links use `https://www.bmxseries.pl`.

## Domain Cutover

- Add `bmxseries.pl` to the Vercel project.
- Configure DNS according to Vercel instructions.
- Verify HTTPS certificate in Vercel.
- Change production `APP_URL` to `https://www.bmxseries.pl`.
- Verify Resend sending domain if using `zapisy@bmxseries.pl`.
- Re-run public, admin, and mail smoke tests after DNS is live.
