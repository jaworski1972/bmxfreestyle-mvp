const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 5178);
const root = __dirname;
const registrations = [];
const mockSessions = new Set();

const mockEvents = [
  {
    id: "seed-event",
    slug: "puchar-polski-bmx-freestyle-runda-1",
    name: "Puchar Polski BMX Freestyle — Runda 1",
    type: "polish_cup",
    roundNumber: 1,
    startsAt: "2027-05-24T09:00:00+02:00",
    endsAt: "2027-05-25T18:00:00+02:00",
    city: "Warszawa",
    venue: "Skatepark Warszawa",
    description: "Pierwsza runda Pucharu Polski BMX Freestyle w sezonie 2027.",
    status: "registration_open",
    registrationStartsAt: null,
    registrationEndsAt: null,
    capacityTotal: 120,
    rulesUrl: "",
    rulesBody: "",
    organizerMessage: "Zapisy są otwarte. Organizator potwierdzi przyjęcie zgłoszenia po weryfikacji danych.",
    settings: { juniorMaxAge: 15, requireLicenseForPro: true },
  },
  {
    id: "closed-event",
    slug: "test-zamkniete-zapisy",
    name: "Test BMX Freestyle — zamknięte zapisy",
    type: "other",
    roundNumber: null,
    startsAt: "2027-06-14T09:00:00+02:00",
    endsAt: "2027-06-14T18:00:00+02:00",
    city: "Łódź",
    venue: "Skatepark Łódź",
    description: "Wydarzenie testowe do sprawdzenia ekranu zamkniętych zapisów.",
    status: "registration_closed",
    registrationStartsAt: null,
    registrationEndsAt: null,
    capacityTotal: 20,
    rulesUrl: "",
    rulesBody: "",
    organizerMessage: "Zapisy na to wydarzenie są zamknięte.",
    settings: { juniorMaxAge: 15, requireLicenseForPro: true },
  },
];

const mockCategories = [
  { id: "seed-category-pro", eventId: "seed-event", code: "PRO", name: "PRO", description: "Dla zawodników z licencją PZKol, UCI lub federacji krajowej.", sortOrder: 1, capacity: 40, isActive: true, genderScope: "open", ageMin: 16, ageMax: null, requiresLicense: true },
  { id: "seed-category-amator", eventId: "seed-event", code: "AMATOR", name: "AMATOR", description: "Otwarta kategoria dla riderów bez licencji.", sortOrder: 2, capacity: 50, isActive: true, genderScope: "open", ageMin: 16, ageMax: null, requiresLicense: false },
  { id: "seed-category-junior", eventId: "seed-event", code: "JUNIOR", name: "JUNIOR", description: "Dla młodszych zawodników. Granica wieku wynika z ustawień wydarzenia.", sortOrder: 3, capacity: 30, isActive: true, genderScope: "open", ageMin: null, ageMax: 15, requiresLicense: false },
  { id: "closed-category-amator", eventId: "closed-event", code: "AMATOR", name: "AMATOR", description: "Kategoria testowa.", sortOrder: 1, capacity: 20, isActive: true, genderScope: "open", ageMin: 16, ageMax: null, requiresLicense: false },
];

const mockConsents = [
  { id: "seed-consent-rules", eventId: "seed-event", code: "rules_acceptance", label: "Akceptacja regulaminu", body: "Potwierdzam zapoznanie się z regulaminem zawodów BMX Freestyle Polska i akceptuję jego postanowienia.", required: true, guardianOnly: false, athleteAdultOnly: false, sortOrder: 1, active: true },
  { id: "seed-consent-health", eventId: "seed-event", code: "health_statement", label: "Oświadczenie o stanie zdrowia", body: "Oświadczam, że zawodnik nie ma przeciwwskazań zdrowotnych do udziału w zawodach BMX Freestyle.", required: true, guardianOnly: false, athleteAdultOnly: false, sortOrder: 2, active: true },
  { id: "seed-consent-gdpr", eventId: "seed-event", code: "gdpr", label: "Zgoda RODO", body: "Potwierdzam zapoznanie się z informacją o przetwarzaniu danych osobowych na potrzeby organizacji zawodów.", required: true, guardianOnly: false, athleteAdultOnly: false, sortOrder: 3, active: true },
  { id: "seed-consent-image", eventId: "seed-event", code: "image", label: "Zgoda na wizerunek", body: "Wyrażam zgodę na wykorzystanie wizerunku zawodnika w materiałach informacyjnych i promocyjnych organizatora.", required: true, guardianOnly: false, athleteAdultOnly: false, sortOrder: 4, active: true },
  { id: "seed-consent-guardian", eventId: "seed-event", code: "guardian_participation", label: "Zgoda opiekuna dla niepełnoletnich", body: "Jako rodzic lub opiekun prawny wyrażam zgodę na udział niepełnoletniego zawodnika w zawodach.", required: true, guardianOnly: true, athleteAdultOnly: false, sortOrder: 5, active: true },
];

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function fileForUrl(url) {
  const pathname = decodeURIComponent(new URL(url, `http://127.0.0.1:${port}`).pathname);
  if (pathname.includes(".")) return pathname.slice(1);
  if (pathname.startsWith("/admin")) return "admin.html";
  if (pathname === "/checkin") return "checkin.html";
  if (pathname.startsWith("/api/")) return "";
  return "index.html";
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function sendCsv(response, filename, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  response.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
  response.end(csv);
}

function tokenFromRequest(request) {
  const auth = String(request.headers.authorization || "").trim();
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return String(request.headers["x-bmx-auth-token"] || "").trim();
}

function hasAdminSession(request) {
  return mockSessions.has(tokenFromRequest(request));
}

function readJsonBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        resolve({});
      }
    });
  });
}

function ageAtDate(birthDateValue, targetDateValue) {
  const birthDate = new Date(`${birthDateValue}T12:00:00`);
  const targetDate = new Date(targetDateValue);
  if (Number.isNaN(birthDate.getTime()) || Number.isNaN(targetDate.getTime())) return null;
  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = targetDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

function ageAtEvent(registration) {
  const event = mockEvents.find((item) => item.id === registration.event_id);
  return ageAtDate(registration.birth_date, event?.startsAt || registration.created_at);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function consentAcceptedMap(consents) {
  return new Map((Array.isArray(consents) ? consents : []).map((consent) => [consent.code, Boolean(consent.accepted)]));
}

function booleanValue(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === "true" || value === "on" || value === 1 || value === "1";
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nullableText(value) {
  const text = normalizeText(value);
  return text || null;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function eventPayload(body, existing = {}) {
  const rawSettings = body.settings && typeof body.settings === "object" ? body.settings : {};
  return {
    ...existing,
    id: existing.id || body.id || makeId("event"),
    slug: normalizeText(body.slug) || existing.slug,
    name: normalizeText(body.name) || existing.name,
    type: normalizeText(body.type) || existing.type || "other",
    roundNumber: nullableNumber(body.roundNumber ?? body.round_number),
    startsAt: normalizeText(body.startsAt ?? body.starts_at) || existing.startsAt,
    endsAt: nullableText(body.endsAt ?? body.ends_at),
    city: normalizeText(body.city) || existing.city,
    venue: normalizeText(body.venue) || existing.venue,
    description: nullableText(body.description),
    status: normalizeText(body.status) || existing.status || "planned",
    registrationStartsAt: nullableText(body.registrationStartsAt ?? body.registration_starts_at),
    registrationEndsAt: nullableText(body.registrationEndsAt ?? body.registration_ends_at),
    capacityTotal: nullableNumber(body.capacityTotal ?? body.capacity_total),
    rulesUrl: nullableText(body.rulesUrl ?? body.rules_url),
    rulesBody: nullableText(body.rulesBody ?? body.rules_body),
    organizerMessage: nullableText(body.organizerMessage ?? body.organizer_message),
    settings: {
      juniorMaxAge: nullableNumber(rawSettings.juniorMaxAge ?? body.juniorMaxAge) ?? existing.settings?.juniorMaxAge ?? 15,
      requireLicenseForPro: booleanValue(rawSettings.requireLicenseForPro ?? body.requireLicenseForPro, existing.settings?.requireLicenseForPro ?? true),
    },
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function categoryPayload(body, existing = {}) {
  return {
    ...existing,
    id: existing.id || body.id || makeId("category"),
    eventId: normalizeText(body.eventId ?? body.event_id) || existing.eventId,
    code: normalizeText(body.code).toUpperCase() || existing.code,
    name: normalizeText(body.name) || existing.name,
    description: nullableText(body.description),
    sortOrder: nullableNumber(body.sortOrder ?? body.sort_order) ?? existing.sortOrder ?? 0,
    capacity: nullableNumber(body.capacity),
    isActive: booleanValue(body.isActive ?? body.is_active, existing.isActive ?? true),
    genderScope: normalizeText(body.genderScope ?? body.gender_scope) || existing.genderScope || "open",
    ageMin: nullableNumber(body.ageMin ?? body.age_min),
    ageMax: nullableNumber(body.ageMax ?? body.age_max),
    requiresLicense: booleanValue(body.requiresLicense ?? body.requires_license, existing.requiresLicense ?? false),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function consentPayload(body, existing = {}) {
  return {
    ...existing,
    id: existing.id || body.id || makeId("consent"),
    eventId: normalizeText(body.eventId ?? body.event_id) || existing.eventId,
    code: normalizeText(body.code) || existing.code,
    label: normalizeText(body.label) || existing.label,
    body: normalizeText(body.body) || existing.body,
    required: booleanValue(body.required, existing.required ?? true),
    guardianOnly: booleanValue(body.guardianOnly ?? body.guardian_only, existing.guardianOnly ?? false),
    athleteAdultOnly: booleanValue(body.athleteAdultOnly ?? body.athlete_adult_only, existing.athleteAdultOnly ?? false),
    sortOrder: nullableNumber(body.sortOrder ?? body.sort_order) ?? existing.sortOrder ?? 0,
    active: booleanValue(body.active, existing.active ?? true),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function registrationClosedReason(event, now = new Date()) {
  if (event.status !== "registration_open") return "Zapisy na to wydarzenie nie są obecnie otwarte.";
  const startDate = event.registrationStartsAt ? new Date(event.registrationStartsAt) : null;
  const endDate = event.registrationEndsAt ? new Date(event.registrationEndsAt) : null;
  if (startDate && !Number.isNaN(startDate.getTime()) && now < startDate) return "Zapisy na to wydarzenie jeszcze się nie rozpoczęły.";
  if (endDate && !Number.isNaN(endDate.getTime()) && now > endDate) return "Termin zapisów na to wydarzenie już minął.";
  return "";
}

async function handleMockApi(request, response) {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);

  if (url.pathname === "/api/admin-auth") {
    if (request.method === "POST") {
      const body = await readJsonBody(request);
      if (String(body.login || "").trim().toLowerCase() === "admin" && String(body.password || "") === "admin") {
        const token = `local-admin-${Date.now()}`;
        mockSessions.add(token);
        sendJson(response, 200, {
          ok: true,
          token,
          expiresAt: Date.now() + 12 * 60 * 60 * 1000,
          user: { login: "admin", role: "organizer", access: "admin", label: "Lokalny organizator" },
        });
        return true;
      }
      sendJson(response, 403, { ok: false, error: "Nieprawidłowy login lub hasło. Lokalnie użyj admin / admin." });
      return true;
    }

    if (request.method === "GET") {
      if (!hasAdminSession(request)) {
        sendJson(response, 401, { ok: false, error: "Sesja wygasła. Zaloguj się ponownie." });
        return true;
      }
      sendJson(response, 200, {
        ok: true,
        expiresAt: Date.now() + 12 * 60 * 60 * 1000,
        user: { login: "admin", role: "organizer", access: "admin", label: "Lokalny organizator" },
      });
      return true;
    }
  }

  if (request.method === "GET" && url.pathname === "/api/events") {
    const slug = url.searchParams.get("slug");
    if (slug) {
      sendJson(response, 200, { ok: true, event: mockEvents.find((event) => event.slug === slug) || null });
      return true;
    }
    sendJson(response, 200, { ok: true, events: mockEvents });
    return true;
  }

  if (["POST", "PATCH"].includes(request.method) && url.pathname === "/api/events") {
    if (!hasAdminSession(request)) {
      sendJson(response, 403, { ok: false, error: "Brak dostępu do zarządzania wydarzeniami." });
      return true;
    }

    const body = await readJsonBody(request);
    if (request.method === "POST") {
      const event = eventPayload(body);
      if (!event.slug || !event.name || !event.startsAt || !event.city || !event.venue) {
        sendJson(response, 400, { ok: false, error: "Uzupełnij wymagane pola wydarzenia." });
        return true;
      }
      mockEvents.push(event);
      sendJson(response, 201, { ok: true, event });
      return true;
    }

    const index = mockEvents.findIndex((event) => event.id === body.id);
    if (index < 0) {
      sendJson(response, 404, { ok: false, error: "Nie znaleziono wydarzenia." });
      return true;
    }
    mockEvents[index] = eventPayload(body, mockEvents[index]);
    sendJson(response, 200, { ok: true, event: mockEvents[index] });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/categories") {
    const eventId = url.searchParams.get("eventId");
    const includeInactive = url.searchParams.get("includeInactive") === "true";
    sendJson(response, 200, { ok: true, categories: mockCategories.filter((category) => category.eventId === eventId && (includeInactive || category.isActive)) });
    return true;
  }

  if (["POST", "PATCH"].includes(request.method) && url.pathname === "/api/categories") {
    if (!hasAdminSession(request)) {
      sendJson(response, 403, { ok: false, error: "Brak dostępu do zarządzania kategoriami." });
      return true;
    }

    const body = await readJsonBody(request);
    if (request.method === "POST") {
      const category = categoryPayload(body);
      if (!category.eventId || !category.code || !category.name) {
        sendJson(response, 400, { ok: false, error: "Uzupełnij wymagane pola kategorii." });
        return true;
      }
      mockCategories.push(category);
      sendJson(response, 201, { ok: true, category });
      return true;
    }

    const index = mockCategories.findIndex((category) => category.id === body.id);
    if (index < 0) {
      sendJson(response, 404, { ok: false, error: "Nie znaleziono kategorii." });
      return true;
    }
    mockCategories[index] = categoryPayload(body, mockCategories[index]);
    sendJson(response, 200, { ok: true, category: mockCategories[index] });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/consents") {
    const eventId = url.searchParams.get("eventId");
    const includeInactive = url.searchParams.get("includeInactive") === "true";
    sendJson(response, 200, { ok: true, consents: mockConsents.filter((consent) => consent.eventId === eventId && (includeInactive || consent.active)) });
    return true;
  }

  if (["POST", "PATCH"].includes(request.method) && url.pathname === "/api/consents") {
    if (!hasAdminSession(request)) {
      sendJson(response, 403, { ok: false, error: "Brak dostępu do zarządzania zgodami." });
      return true;
    }

    const body = await readJsonBody(request);
    if (request.method === "POST") {
      const consent = consentPayload(body);
      if (!consent.eventId || !consent.code || !consent.label || !consent.body) {
        sendJson(response, 400, { ok: false, error: "Uzupełnij wymagane pola zgody." });
        return true;
      }
      mockConsents.push(consent);
      sendJson(response, 201, { ok: true, consent });
      return true;
    }

    const index = mockConsents.findIndex((consent) => consent.id === body.id);
    if (index < 0) {
      sendJson(response, 404, { ok: false, error: "Nie znaleziono zgody." });
      return true;
    }
    mockConsents[index] = consentPayload(body, mockConsents[index]);
    sendJson(response, 200, { ok: true, consent: mockConsents[index] });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/register") {
    const body = await readJsonBody(request);
    const event = mockEvents.find((item) => item.id === body.eventId || item.slug === body.eventSlug);
    const category = mockCategories.find((item) => item.id === body.categoryId || (item.eventId === event?.id && item.code === body.categoryCode));

    if (!event) {
      sendJson(response, 404, { ok: false, code: "event_not_found", error: "Nie znaleziono wybranego wydarzenia." });
      return true;
    }
    const closedReason = registrationClosedReason(event);
    if (closedReason) {
      sendJson(response, 409, { ok: false, code: "registration_closed", error: closedReason });
      return true;
    }
    if (!category) {
      sendJson(response, 400, { ok: false, code: "category_not_found", error: "Nie znaleziono wybranej kategorii." });
      return true;
    }

    const required = ["firstName", "lastName", "birthDate", "email", "phone", "city", "country"];
    const missing = required.filter((key) => !normalizeText(body[key]));
    if (missing.length) {
      sendJson(response, 400, { ok: false, code: "missing_required_fields", error: "Brakuje wymaganych pól zgłoszenia.", missing });
      return true;
    }

    const age = ageAtDate(body.birthDate, event.startsAt);
    const minor = Number.isFinite(age) && age < 18;
    const juniorMaxAge = Number(category.ageMax ?? event.settings.juniorMaxAge ?? 15);
    if (category.code === "JUNIOR" && age > juniorMaxAge) {
      sendJson(response, 400, { ok: false, code: "junior_age_mismatch", error: `Kategoria JUNIOR jest dostępna dla zawodników, którzy w dniu startu wydarzenia mają maksymalnie ${juniorMaxAge} lat.` });
      return true;
    }

    if (category.requiresLicense && (!body.licenseType || !body.licenseNumber || !body.federationCountry)) {
      sendJson(response, 400, { ok: false, code: "license_required", error: "Kategoria PRO wymaga typu licencji, numeru licencji i kraju federacji." });
      return true;
    }

    if (minor && (!body.guardianFullName || !body.guardianEmail || !body.guardianPhone || !body.guardianRelationship)) {
      sendJson(response, 400, { ok: false, code: "guardian_required", error: "Dla osoby niepełnoletniej wymagane są kompletne dane opiekuna." });
      return true;
    }

    const accepted = consentAcceptedMap(body.consents);
    const missingConsents = mockConsents
      .filter((consent) => consent.eventId === event.id && consent.active)
      .filter((consent) => !(consent.guardianOnly && !minor))
      .filter((consent) => consent.required && !accepted.get(consent.code))
      .map((consent) => consent.code);
    if (missingConsents.length) {
      sendJson(response, 400, { ok: false, code: "missing_required_consents", error: "Zaznacz wszystkie wymagane zgody i oświadczenia.", missing: missingConsents });
      return true;
    }

    const duplicate = registrations.find((registration) => (
      registration.event_id === event.id
      && registration.birth_date === body.birthDate
      && registration.first_name.toLowerCase() === normalizeText(body.firstName).toLowerCase()
      && registration.last_name.toLowerCase() === normalizeText(body.lastName).toLowerCase()
      && (registration.email === normalizeEmail(body.email) || registration.phone === normalizeText(body.phone))
    ));
    if (duplicate) {
      sendJson(response, 409, { ok: false, code: "duplicate_registration", error: "Wygląda na to, że takie zgłoszenie zostało już wysłane na to wydarzenie." });
      return true;
    }

    const registration = {
      id: `local-${Date.now()}`,
      event_id: event.id,
      category_id: category.id,
      status: "pending_review",
      first_name: normalizeText(body.firstName),
      last_name: normalizeText(body.lastName),
      birth_date: body.birthDate,
      email: normalizeEmail(body.email),
      phone: normalizeText(body.phone),
      city: normalizeText(body.city),
      country: normalizeText(body.country),
      gender: normalizeText(body.gender),
      club_team: normalizeText(body.clubTeam),
      license_type: normalizeText(body.licenseType),
      license_number: normalizeText(body.licenseNumber),
      uci_id: normalizeText(body.uciId),
      federation_country: normalizeText(body.federationCountry),
      guardian_required: minor,
      guardian_full_name: normalizeText(body.guardianFullName),
      guardian_email: normalizeEmail(body.guardianEmail),
      guardian_phone: normalizeText(body.guardianPhone),
      guardian_relationship: normalizeText(body.guardianRelationship),
      consents: Array.isArray(body.consents) ? body.consents.map((consent) => ({
        code: consent.code,
        accepted: Boolean(consent.accepted),
        acceptedAt: consent.accepted ? new Date().toISOString() : null,
        acceptedBy: minor ? "guardian" : "athlete",
      })) : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    registrations.push(registration);
    sendJson(response, 201, { ok: true, registration, status: registration.status, email: { sent: false, skipped: true }, message: "Zgłoszenie zostało przyjęte do systemu i oczekuje na weryfikację organizatora." });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/registrations") {
    if (!hasAdminSession(request)) {
      sendJson(response, 403, { ok: false, error: "Brak dostępu do zgłoszeń." });
      return true;
    }
    sendJson(response, 200, {
      ok: true,
      registrations: registrations.map((registration) => ({
        ...registration,
        events: mockEvents.find((event) => event.id === registration.event_id),
        event_categories: mockCategories.find((category) => category.id === registration.category_id),
      })),
    });
    return true;
  }

  if (request.method === "PATCH" && url.pathname === "/api/registrations") {
    if (!hasAdminSession(request)) {
      sendJson(response, 403, { ok: false, error: "Brak dostępu do zgłoszeń." });
      return true;
    }

    const body = await readJsonBody(request);
    const allowed = new Set(["pending_review", "accepted", "needs_info", "rejected", "waitlist"]);
    const registration = registrations.find((item) => item.id === body.id);
    if (!registration) {
      sendJson(response, 404, { ok: false, error: "Nie znaleziono zgłoszenia." });
      return true;
    }
    if (!allowed.has(body.status)) {
      sendJson(response, 400, { ok: false, error: "Nieprawidłowy status zgłoszenia." });
      return true;
    }

    registration.status = body.status;
    registration.status_note = normalizeText(body.statusNote) || null;
    registration.updated_at = new Date().toISOString();
    sendJson(response, 200, {
      ok: true,
      registration: {
        ...registration,
        events: mockEvents.find((event) => event.id === registration.event_id),
        event_categories: mockCategories.find((category) => category.id === registration.category_id),
      },
      email: { sent: false, skipped: true },
    });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/export") {
    if (!hasAdminSession(request)) {
      sendJson(response, 403, { ok: false, error: "Brak dostępu do eksportu." });
      return true;
    }

    const eventId = url.searchParams.get("eventId") || "";
    const category = url.searchParams.get("category") || "";
    const status = url.searchParams.get("status") || "";
    const rows = registrations
      .filter((registration) => !eventId || registration.event_id === eventId)
      .filter((registration) => {
        const cat = mockCategories.find((item) => item.id === registration.category_id);
        return !category || cat?.code === category;
      })
      .filter((registration) => !status || registration.status === status)
      .map((registration) => {
        const event = mockEvents.find((item) => item.id === registration.event_id) || {};
        const cat = mockCategories.find((item) => item.id === registration.category_id) || {};
        return [
          event.name,
          cat.code,
          registration.status,
          registration.first_name,
          registration.last_name,
          registration.birth_date,
          ageAtEvent(registration),
          registration.city,
          registration.country,
          registration.club_team,
          registration.email,
          registration.phone,
          registration.gender,
          registration.license_type,
          registration.license_number,
          registration.uci_id,
          registration.federation_country,
          registration.guardian_required ? "tak" : "nie",
          registration.guardian_full_name,
          registration.guardian_email,
          registration.guardian_phone,
          registration.guardian_relationship,
          registration.created_at,
          registration.updated_at,
          registration.status_note,
        ];
      });

    sendCsv(response, "bmx-freestyle-zgloszenia.csv", [[
      "Wydarzenie",
      "Kategoria",
      "Status",
      "Imię",
      "Nazwisko",
      "Data urodzenia",
      "Wiek w dniu wydarzenia",
      "Miasto",
      "Kraj",
      "Klub/team",
      "E-mail zawodnika",
      "Telefon zawodnika",
      "Płeć",
      "Typ licencji",
      "Numer licencji",
      "UCI ID",
      "Kraj federacji",
      "Czy wymagany opiekun",
      "Imię i nazwisko opiekuna",
      "E-mail opiekuna",
      "Telefon opiekuna",
      "Relacja opiekuna",
      "Data zgłoszenia",
      "Data aktualizacji",
      "Notatka statusu",
    ], ...rows]);
    return true;
  }

  return false;
}

const server = http.createServer(async (request, response) => {
  if (request.url.startsWith("/api/") && await handleMockApi(request, response)) return;

  const file = fileForUrl(request.url);
  if (!file) {
    response.writeHead(501, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: false, error: "Local API is available on Vercel/serverless runtime." }));
    return;
  }

  const safePath = path.normalize(file).replace(/^(\.\.[/\\])+/, "");
  const absolutePath = path.join(root, safePath);

  fs.readFile(absolutePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(absolutePath)] || "application/octet-stream",
    });
    response.end(data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`BMX Freestyle Polska local preview: http://127.0.0.1:${port}`);
});
