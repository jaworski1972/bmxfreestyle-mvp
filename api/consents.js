const { requireAdmin } = require("../lib/admin-auth");
const { cleanText, getSupabase, json, readBody } = require("../lib/supabase");

function normalizeConsent(row = {}) {
  return {
    id: row.id,
    eventId: row.event_id,
    code: row.code,
    label: row.label,
    body: row.body,
    required: Boolean(row.required),
    guardianOnly: Boolean(row.guardian_only),
    athleteAdultOnly: Boolean(row.athlete_adult_only),
    sortOrder: row.sort_order,
    active: Boolean(row.active),
  };
}

function booleanValue(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === "true" || value === "on" || value === 1 || value === "1";
}

function numberValue(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function consentPayload(body, partial = false) {
  const payload = {};
  [
    ["event_id", "eventId", () => cleanText(body.eventId ?? body.event_id, 80)],
    ["code", "code", () => cleanText(body.code, 80)],
    ["label", "label", () => cleanText(body.label, 220)],
    ["body", "body", () => cleanText(body.body, 4000)],
    ["required", "required", () => booleanValue(body.required, true)],
    ["guardian_only", "guardianOnly", () => booleanValue(body.guardianOnly ?? body.guardian_only, false)],
    ["athlete_adult_only", "athleteAdultOnly", () => booleanValue(body.athleteAdultOnly ?? body.athlete_adult_only, false)],
    ["sort_order", "sortOrder", () => numberValue(body.sortOrder ?? body.sort_order, 0)],
    ["active", "active", () => booleanValue(body.active, true)],
  ].forEach(([column, camel, getter]) => {
    if (!partial || Object.prototype.hasOwnProperty.call(body, column) || Object.prototype.hasOwnProperty.call(body, camel)) {
      payload[column] = getter();
    }
  });

  if (!partial) {
    ["event_id", "code", "label", "body"].forEach((key) => {
      if (!payload[key]) throw new Error("Uzupełnij wymagane pola zgody.");
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
      const eventId = String(request.query?.eventId || "").trim();
      const includeInactive = String(request.query?.includeInactive || "") === "true";
      if (!eventId) {
        json(response, 400, { ok: false, error: "Missing eventId." });
        return;
      }

      let query = supabase
        .from("event_consents")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true });
      if (!includeInactive) query = query.eq("active", true);

      const { data, error } = await query;
      if (error) throw error;
      json(response, 200, { ok: true, consents: (data || []).map(normalizeConsent) });
      return;
    }

    if (!requireAdmin(request)) {
      json(response, 403, { ok: false, error: "Brak dostępu do zarządzania zgodami." });
      return;
    }

    const body = readBody(request);
    if (request.method === "POST") {
      const { data, error } = await supabase
        .from("event_consents")
        .insert(consentPayload(body))
        .select("*")
        .single();
      if (error) throw error;
      json(response, 201, { ok: true, consent: normalizeConsent(data) });
      return;
    }

    const id = cleanText(body.id, 80);
    if (!id) {
      json(response, 400, { ok: false, error: "Missing consent id." });
      return;
    }
    const { data, error } = await supabase
      .from("event_consents")
      .update(consentPayload(body, true))
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    json(response, 200, { ok: true, consent: normalizeConsent(data) });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się obsłużyć zgód." });
  }
};
