const { randomUUID } = require("crypto");
const { cleanText, getSupabase, json, readBody } = require("../lib/supabase");
const { normalizePolishPhone } = require("../lib/phone-normalization");
const { confirmationUrl, sendRegistrationReceivedEmail } = require("../lib/mail");
const { enabled, sendSmsNotification } = require("../lib/sms");

function requiredString(body, key) {
  return cleanText(body[key], 220);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function parseDate(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageAtDate(birthDateValue, targetDateValue) {
  const birthDate = parseDate(birthDateValue);
  const targetDatePart = String(targetDateValue || "").slice(0, 10);
  const targetDate = parseDate(targetDatePart) || new Date(targetDateValue || Date.now());
  if (!birthDate || Number.isNaN(targetDate.getTime())) return null;

  let age = targetDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = targetDate.getUTCMonth() - birthDate.getUTCMonth();
  const dayDiff = targetDate.getUTCDate() - birthDate.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age;
}

function normalizeConsentInput(consents) {
  if (Array.isArray(consents)) return consents;
  if (!consents || typeof consents !== "object") return [];
  return Object.entries(consents).map(([code, value]) => (
    typeof value === "object"
      ? { code, ...value }
      : { code, accepted: Boolean(value) }
  ));
}

function consentAcceptedMap(consents) {
  return new Map(normalizeConsentInput(consents).map((consent) => [
    String(consent.code || "").trim(),
    Boolean(consent.accepted),
  ]));
}

function relevantConsent(consent, minor) {
  if (consent.guardian_only && !minor) return false;
  if (consent.athlete_adult_only && minor) return false;
  return consent.active !== false;
}

function registrationClosedReason(event, now = new Date()) {
  if (event.status !== "registration_open") return "Zapisy na to wydarzenie nie są obecnie otwarte.";

  const startsAt = event.registration_starts_at ? new Date(event.registration_starts_at) : null;
  const endsAt = event.registration_ends_at ? new Date(event.registration_ends_at) : null;

  if (startsAt && !Number.isNaN(startsAt.getTime()) && now < startsAt) {
    return "Zapisy na to wydarzenie jeszcze się nie rozpoczęły.";
  }
  if (endsAt && !Number.isNaN(endsAt.getTime()) && now > endsAt) {
    return "Termin zapisów na to wydarzenie już minął.";
  }
  return "";
}

function buildStoredConsents(eventConsents, submittedConsents, minor) {
  const accepted = consentAcceptedMap(submittedConsents);
  const acceptedAt = new Date().toISOString();
  return eventConsents
    .filter((consent) => relevantConsent(consent, minor))
    .map((consent) => ({
      code: consent.code,
      accepted: Boolean(accepted.get(consent.code)),
      acceptedAt: accepted.get(consent.code) ? acceptedAt : null,
      acceptedBy: minor ? "guardian" : "athlete",
      required: Boolean(consent.required),
    }));
}

async function fetchEvent(supabase, body) {
  const eventId = cleanText(body.eventId, 80);
  const eventSlug = cleanText(body.eventSlug, 160);
  let query = supabase.from("events").select("*");
  if (eventId) query = query.eq("id", eventId);
  else if (eventSlug) query = query.eq("slug", eventSlug);
  else return null;

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

async function fetchCategory(supabase, eventId, body) {
  const categoryId = cleanText(body.categoryId, 80);
  const categoryCode = cleanText(body.categoryCode, 40).toUpperCase();
  let query = supabase
    .from("event_categories")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_active", true);

  if (categoryId) query = query.eq("id", categoryId);
  else if (categoryCode) query = query.eq("code", categoryCode);
  else return null;

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

function categoryAgeValidationError(category, age) {
  const code = String(category?.code || "").toUpperCase();
  if (code === "JUNIOR" && age >= 15) {
    return {
      code: "junior_age_mismatch",
      error: "Kategoria JUNIOR U15 jest przeznaczona dla zawodników, którzy w dniu zawodów nie ukończyli 15 lat. Wybierz kategorię AMATOR.",
    };
  }
  if (code === "AMATOR" && age < 15) {
    return {
      code: "amator_age_mismatch",
      error: "Zawodnik poniżej 15. roku życia powinien zostać zgłoszony do kategorii JUNIOR U15.",
    };
  }
  return null;
}

async function fetchConsents(supabase, eventId) {
  const { data, error } = await supabase
    .from("event_consents")
    .select("*")
    .eq("event_id", eventId)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function findDuplicate(supabase, eventId, payload) {
  const { data, error } = await supabase
    .from("registrations")
    .select("id,email,phone,first_name,last_name,birth_date,status")
    .eq("event_id", eventId)
    .eq("birth_date", payload.birth_date)
    .limit(50);

  if (error) throw error;

  const firstName = payload.first_name.toLowerCase();
  const lastName = payload.last_name.toLowerCase();
  return (data || []).find((registration) => (
    String(registration.first_name || "").trim().toLowerCase() === firstName
    && String(registration.last_name || "").trim().toLowerCase() === lastName
    && (
      normalizeEmail(registration.email) === normalizeEmail(payload.email)
      || String(registration.phone || "") === String(payload.phone || "")
    )
    && !["rejected"].includes(registration.status)
  )) || null;
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    json(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  try {
    const body = readBody(request);
    const required = ["firstName", "lastName", "birthDate", "email", "phone", "city", "country"];
    const missing = required.filter((key) => !requiredString(body, key));

    if (!requiredString(body, "eventId") && !requiredString(body, "eventSlug")) missing.push("eventId");
    if (!requiredString(body, "categoryId") && !requiredString(body, "categoryCode")) missing.push("categoryId");
    if (missing.length) {
      json(response, 400, {
        ok: false,
        code: "missing_required_fields",
        error: "Brakuje wymaganych pól zgłoszenia.",
        missing,
      });
      return;
    }

    if (!parseDate(body.birthDate)) {
      json(response, 400, {
        ok: false,
        code: "invalid_birth_date",
        error: "Podaj poprawną datę urodzenia.",
      });
      return;
    }

    const phone = normalizePolishPhone(body.phone);
    if (!phone.isValid) {
      json(response, 400, {
        ok: false,
        code: "invalid_phone",
        error: "Podaj prawidłowy numer telefonu.",
        reason: phone.reason,
      });
      return;
    }

    const supabase = getSupabase();
    const event = await fetchEvent(supabase, body);
    if (!event) {
      json(response, 404, { ok: false, code: "event_not_found", error: "Nie znaleziono wybranego wydarzenia." });
      return;
    }

    const closedReason = registrationClosedReason(event);
    if (closedReason) {
      json(response, 409, {
        ok: false,
        code: "registration_closed",
        error: closedReason,
      });
      return;
    }

    const eventAge = ageAtDate(body.birthDate, event.starts_at);
    if (eventAge === null || eventAge < 0) {
      json(response, 400, {
        ok: false,
        code: "invalid_birth_date",
        error: "Nie udało się obliczyć wieku zawodnika dla daty wydarzenia.",
      });
      return;
    }

    const category = await fetchCategory(supabase, event.id, body);
    if (!category) {
      json(response, 400, {
        ok: false,
        code: "category_not_available",
        error: "Nie znaleziono wybranej kategorii.",
      });
      return;
    }

    const minor = eventAge < 18;
    const categoryAgeError = categoryAgeValidationError(category, eventAge);
    if (categoryAgeError) {
      json(response, 400, { ok: false, ...categoryAgeError });
      return;
    }

    if ((category.requires_license || String(category.code || "").toUpperCase() === "PRO") && !requiredString(body, "licenseNumber")) {
      json(response, 400, {
        ok: false,
        code: "license_required",
        error: "Podaj UCI ID lub numer licencji.",
        missing: ["licenseNumber"],
      });
      return;
    }

    const normalizedGuardianPhone = minor ? normalizePolishPhone(body.guardianPhone) : { normalizedPhone: null, isValid: true };
    const missingGuardian = [];
    if (minor) {
      ["guardianFullName", "guardianEmail", "guardianPhone", "guardianRelationship"].forEach((key) => {
        if (!requiredString(body, key)) missingGuardian.push(key);
      });
      if (!normalizedGuardianPhone.isValid) missingGuardian.push("guardianPhone");
    }

    if (missingGuardian.length) {
      json(response, 400, {
        ok: false,
        code: "guardian_required",
        error: "Dla osoby niepełnoletniej wymagane są kompletne dane opiekuna.",
        missing: [...new Set(missingGuardian)],
      });
      return;
    }

    const eventConsents = await fetchConsents(supabase, event.id);
    const storedConsents = buildStoredConsents(eventConsents, body.consents, minor);
    const missingConsents = storedConsents
      .filter((consent) => consent.required && !consent.accepted)
      .map((consent) => consent.code);

    if (missingConsents.length) {
      json(response, 400, {
        ok: false,
        code: "missing_required_consents",
        error: "Zaznacz wszystkie wymagane zgody i oświadczenia.",
        missing: missingConsents,
      });
      return;
    }

    const registration = {
      event_id: event.id,
      category_id: category.id,
      status: "pending_review",
      confirmation_token: randomUUID(),
      first_name: requiredString(body, "firstName"),
      last_name: requiredString(body, "lastName"),
      birth_date: requiredString(body, "birthDate"),
      email: normalizeEmail(body.email),
      phone: phone.normalizedPhone,
      city: cleanText(body.city, 120) || null,
      country: cleanText(body.country, 80) || "Polska",
      gender: cleanText(body.gender, 40) || null,
      club_team: cleanText(body.clubTeam, 160) || null,
      license_type: cleanText(body.licenseType, 80) || null,
      license_number: cleanText(body.licenseNumber, 120) || null,
      uci_id: cleanText(body.uciId, 120) || null,
      federation_country: cleanText(body.federationCountry, 80) || null,
      guardian_required: minor,
      guardian_full_name: cleanText(body.guardianFullName, 180) || null,
      guardian_email: normalizeEmail(body.guardianEmail) || null,
      guardian_phone: normalizedGuardianPhone.normalizedPhone,
      guardian_relationship: cleanText(body.guardianRelationship, 80) || null,
      consents: storedConsents,
      source: "public",
    };

    const duplicate = await findDuplicate(supabase, event.id, registration);
    if (duplicate) {
      json(response, 409, {
        ok: false,
        code: "duplicate_registration",
        error: "Wygląda na to, że takie zgłoszenie zostało już wysłane na to wydarzenie.",
        duplicateId: duplicate.id,
      });
      return;
    }

    const { data, error } = await supabase
      .from("registrations")
      .insert(registration)
      .select("id,status,confirmation_token,created_at")
      .single();

    if (error) throw error;

    let email = { sent: false, skipped: true };
    try {
      email = await sendRegistrationReceivedEmail({
        event,
        category,
        registration: { ...registration, id: data.id },
      });
    } catch (emailError) {
      console.error("BMX Freestyle registration email failed", emailError);
      email = { sent: false, skipped: true, error: emailError.message };
    }

    const storedRegistration = { ...registration, id: data.id, confirmation_token: data.confirmation_token };
    const confirmUrl = confirmationUrl(data.confirmation_token);
    const smsMessage = `BMX Series: zgłoszenie przyjęte do systemu. Status: oczekuje na weryfikację. Potwierdzenie i QR: ${confirmUrl}`;
    const sms = await sendSmsNotification({
      supabase,
      event,
      registration: storedRegistration,
      message: smsMessage,
      reason: "registration_disabled",
      force: enabled("SEND_SMS_ON_REGISTRATION"),
    });

    json(response, 201, {
      ok: true,
      registration: data,
      status: data.status,
      email,
      sms,
      message: "Zgłoszenie zostało przyjęte do systemu i oczekuje na weryfikację organizatora.",
    });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się zapisać zgłoszenia." });
  }
};
