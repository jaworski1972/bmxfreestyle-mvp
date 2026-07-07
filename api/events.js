const { requireAdmin } = require("../lib/admin-auth");
const { cleanText, getSupabase, json, readBody } = require("../lib/supabase");

const EVENT_TYPES = new Set(["polish_cup", "polish_championship", "other"]);
const EVENT_STATUSES = new Set(["planned", "registration_open", "registration_closed", "cancelled", "finished"]);

function normalizeEvent(row = {}) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type,
    roundNumber: row.round_number,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    city: row.city,
    venue: row.venue,
    description: row.description || "",
    status: row.status,
    registrationStartsAt: row.registration_starts_at,
    registrationEndsAt: row.registration_ends_at,
    capacityTotal: row.capacity_total,
    rulesUrl: row.rules_url,
    rulesBody: row.rules_body,
    organizerMessage: row.organizer_message,
    settings: row.settings || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function nullableText(value, maxLength = 4000) {
  const text = cleanText(value, maxLength);
  return text || null;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nullableDate(value) {
  const text = cleanText(value, 80);
  return text || null;
}

function eventPayload(body, partial = false) {
  const settings = typeof body.settings === "object" && body.settings !== null ? body.settings : {};
  const payload = {};

  [
    ["slug", () => cleanText(body.slug, 160)],
    ["name", () => cleanText(body.name, 220)],
    ["type", () => cleanText(body.type, 80)],
    ["round_number", () => nullableNumber(body.roundNumber ?? body.round_number)],
    ["starts_at", () => nullableDate(body.startsAt ?? body.starts_at)],
    ["ends_at", () => nullableDate(body.endsAt ?? body.ends_at)],
    ["city", () => cleanText(body.city, 120)],
    ["venue", () => cleanText(body.venue, 180)],
    ["description", () => nullableText(body.description, 3000)],
    ["status", () => cleanText(body.status, 80)],
    ["registration_starts_at", () => nullableDate(body.registrationStartsAt ?? body.registration_starts_at)],
    ["registration_ends_at", () => nullableDate(body.registrationEndsAt ?? body.registration_ends_at)],
    ["capacity_total", () => nullableNumber(body.capacityTotal ?? body.capacity_total)],
    ["rules_url", () => nullableText(body.rulesUrl ?? body.rules_url, 600)],
    ["rules_body", () => nullableText(body.rulesBody ?? body.rules_body, 8000)],
    ["organizer_message", () => nullableText(body.organizerMessage ?? body.organizer_message, 3000)],
    ["settings", () => ({
      juniorMaxAge: nullableNumber(settings.juniorMaxAge ?? body.juniorMaxAge) ?? 15,
      requireLicenseForPro: Boolean(settings.requireLicenseForPro ?? body.requireLicenseForPro ?? true),
    })],
  ].forEach(([key, getter]) => {
    if (!partial || Object.prototype.hasOwnProperty.call(body, key) || Object.prototype.hasOwnProperty.call(body, key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()))) {
      payload[key] = getter();
    }
  });

  if (payload.type && !EVENT_TYPES.has(payload.type)) throw new Error("Nieprawidłowy typ wydarzenia.");
  if (payload.status && !EVENT_STATUSES.has(payload.status)) throw new Error("Nieprawidłowy status wydarzenia.");
  if (!partial) {
    ["slug", "name", "type", "starts_at", "city", "venue", "status"].forEach((key) => {
      if (!payload[key]) throw new Error("Uzupełnij wymagane pola wydarzenia.");
    });
  }

  payload.updated_at = new Date().toISOString();
  return payload;
}

module.exports = async function handler(request, response) {
  if (!["GET", "POST", "PATCH"].includes(request.method)) {
    json(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  try {
    const supabase = getSupabase();
    if (request.method === "GET") {
      const slug = String(request.query?.slug || "").trim();
      let query = supabase.from("events").select("*").order("starts_at", { ascending: true });

      if (slug) query = query.eq("slug", slug).limit(1);

      const { data, error } = await query;
      if (error) throw error;

      if (slug) {
        json(response, 200, { ok: true, event: data?.[0] ? normalizeEvent(data[0]) : null });
        return;
      }

      json(response, 200, { ok: true, events: (data || []).map(normalizeEvent) });
      return;
    }

    if (!requireAdmin(request)) {
      json(response, 403, { ok: false, error: "Brak dostępu do zarządzania wydarzeniami." });
      return;
    }

    const body = readBody(request);
    if (request.method === "POST") {
      const { data, error } = await supabase
        .from("events")
        .insert(eventPayload(body))
        .select("*")
        .single();
      if (error) throw error;
      json(response, 201, { ok: true, event: normalizeEvent(data) });
      return;
    }

    const id = cleanText(body.id, 80);
    if (!id) {
      json(response, 400, { ok: false, error: "Missing event id." });
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .update(eventPayload(body, true))
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    json(response, 200, { ok: true, event: normalizeEvent(data) });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się obsłużyć zawodów." });
  }
};
