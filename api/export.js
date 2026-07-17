const { getSupabase, json } = require("../lib/supabase");
const { requireAdmin } = require("../lib/admin-auth");

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function ageAtEvent(birthDateValue, eventStartValue) {
  const birthDate = new Date(`${birthDateValue}T12:00:00Z`);
  const eventDate = new Date(eventStartValue || Date.now());
  if (Number.isNaN(birthDate.getTime()) || Number.isNaN(eventDate.getTime())) return "";
  let age = eventDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = eventDate.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && eventDate.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}

function categoryLabel(code) {
  return String(code || "").toUpperCase() === "JUNIOR" ? "JUNIOR U15" : String(code || "").toUpperCase();
}

function genderLabel(gender) {
  return {
    female: "Kobieta",
    male: "Mężczyzna",
  }[String(gender || "").toLowerCase()] || "";
}

module.exports = async function handler(request, response) {
  try {
    if (!requireAdmin(request)) {
      json(response, 403, { ok: false, error: "Brak dostępu do eksportu." });
      return;
    }

    if (request.method !== "GET") {
      json(response, 405, { ok: false, error: "Method not allowed." });
      return;
    }

    const eventId = String(request.query?.eventId || "").trim();
    const categoryCode = String(request.query?.category || "").trim().toUpperCase();
    const status = String(request.query?.status || "").trim();
    const gender = String(request.query?.gender || "").trim().toLowerCase();
    let query = getSupabase()
      .from("registrations")
      .select("*, event_categories(code,name), events(name,slug,starts_at)")
      .order("created_at", { ascending: false });

    if (eventId) query = query.eq("event_id", eventId);
    if (categoryCode) query = query.eq("event_categories.code", categoryCode);
    if (status) query = query.eq("status", status);
    if (["female", "male"].includes(gender)) query = query.eq("gender", gender);

    const { data, error } = await query;
    if (error) throw error;

    const header = [
      "Wydarzenie",
      "Kategoria",
      "Status",
      "Imię",
      "Nazwisko",
      "Data urodzenia",
      "Wiek w dniu wydarzenia",
      "Email",
      "Telefon",
      "Płeć",
      "Miasto",
      "Kraj",
      "Klub/team",
      "UCI ID / numer licencji",
      "Opiekun wymagany",
      "Opiekun",
      "Email opiekuna",
      "Telefon opiekuna",
      "Relacja opiekuna",
      "Data zgłoszenia",
      "Data aktualizacji",
      "Notatka statusu",
    ];

    const rows = (data || []).map((registration) => [
      registration.events?.name,
      categoryLabel(registration.event_categories?.code),
      registration.status,
      registration.first_name,
      registration.last_name,
      registration.birth_date,
      ageAtEvent(registration.birth_date, registration.events?.starts_at),
      registration.email,
      registration.phone,
      genderLabel(registration.gender),
      registration.city,
      registration.country,
      registration.club_team,
      registration.license_number,
      registration.guardian_required ? "tak" : "nie",
      registration.guardian_full_name,
      registration.guardian_email,
      registration.guardian_phone,
      registration.guardian_relationship,
      registration.created_at,
      registration.updated_at,
      registration.status_note,
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", "attachment; filename=\"bmx-freestyle-zgloszenia.csv\"");
    response.end(csv);
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się przygotować eksportu." });
  }
};
