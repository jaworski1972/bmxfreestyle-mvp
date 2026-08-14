const START_LIST_SELECT = [
  "id",
  "event_id",
  "category_id",
  "status",
  "checkin_status",
  "checked_in_at",
  "start_order",
  "bib_number",
  "first_name",
  "last_name",
  "birth_date",
  "email",
  "phone",
  "city",
  "country",
  "club_team",
  "guardian_required",
  "guardian_full_name",
  "guardian_phone",
  "created_at",
  "updated_at",
  "events(name,slug,city,venue,starts_at)",
  "event_categories(code,name)",
].join(",");

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

function normalizeStartListRow(registration) {
  const event = registration.events || {};
  const category = registration.event_categories || {};
  return {
    id: registration.id,
    eventId: registration.event_id,
    categoryId: registration.category_id,
    status: registration.status,
    checkinStatus: registration.checkin_status || "not_checked_in",
    checkedInAt: registration.checked_in_at,
    startOrder: registration.start_order,
    bibNumber: registration.bib_number,
    firstName: registration.first_name,
    lastName: registration.last_name,
    fullName: [registration.first_name, registration.last_name].filter(Boolean).join(" "),
    birthDate: registration.birth_date,
    age: ageAtEvent(registration.birth_date, event.starts_at),
    email: registration.email,
    phone: registration.phone,
    city: registration.city,
    country: registration.country,
    clubTeam: registration.club_team,
    guardianRequired: Boolean(registration.guardian_required),
    guardianFullName: registration.guardian_full_name,
    guardianPhone: registration.guardian_phone,
    createdAt: registration.created_at,
    updatedAt: registration.updated_at,
    event: {
      name: event.name,
      slug: event.slug,
      city: event.city,
      venue: event.venue,
      startsAt: event.starts_at,
    },
    category: {
      code: category.code,
      label: categoryLabel(category.code || category.name),
      name: category.name,
    },
  };
}

function startListCsv(rows) {
  const header = [
    "Kolejność",
    "Numer startowy",
    "Wydarzenie",
    "Kategoria",
    "Status zgłoszenia",
    "Check-in",
    "Check-in czas",
    "Imię",
    "Nazwisko",
    "Data urodzenia",
    "Wiek",
    "Miasto",
    "Kraj",
    "Klub/team",
    "Telefon",
    "Email",
    "Opiekun wymagany",
    "Opiekun",
    "Telefon opiekuna",
  ];

  const body = rows.map((row) => [
    row.startOrder,
    row.bibNumber,
    row.event?.name,
    row.category?.label || categoryLabel(row.category?.code),
    row.status,
    row.checkinStatus,
    row.checkedInAt,
    row.firstName,
    row.lastName,
    row.birthDate,
    row.age,
    row.city,
    row.country,
    row.clubTeam,
    row.phone,
    row.email,
    row.guardianRequired ? "tak" : "nie",
    row.guardianFullName,
    row.guardianPhone,
  ]);

  return [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");
}

module.exports = {
  START_LIST_SELECT,
  categoryLabel,
  normalizeStartListRow,
  startListCsv,
};
