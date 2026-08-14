const { requireAdmin } = require("../lib/admin-auth");
const { cleanText, getSupabase, json, readBody } = require("../lib/supabase");
const { availabilityForCategory, capacityDisplay } = require("../lib/registration-limits");

function normalizeCategory(row = {}, availability = {}) {
  const category = {
    id: row.id,
    eventId: row.event_id,
    code: row.code,
    name: row.name,
    description: row.description || "",
    sortOrder: row.sort_order,
    capacity: row.capacity,
    isActive: Boolean(row.is_active),
    genderScope: row.gender_scope || "open",
    ageMin: row.age_min,
    ageMax: row.age_max,
    requiresLicense: Boolean(row.requires_license),
  };
  return {
    ...category,
    occupiedCount: availability.occupiedCount ?? 0,
    waitlistCount: availability.waitlistCount ?? 0,
    availableCount: availability.availableCount ?? null,
    isUnlimited: availability.isUnlimited ?? category.capacity === null,
    isFull: availability.isFull ?? false,
    capacityLabel: capacityDisplay({ ...category, ...availability }),
  };
}

function nullableText(value, maxLength = 2000) {
  const text = cleanText(value, maxLength);
  return text || null;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function booleanValue(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === "true" || value === "on" || value === 1 || value === "1";
}

function categoryPayload(body, partial = false) {
  const payload = {};
  [
    ["event_id", "eventId", () => cleanText(body.eventId ?? body.event_id, 80)],
    ["code", "code", () => cleanText(body.code, 40).toUpperCase()],
    ["name", "name", () => cleanText(body.name, 120)],
    ["description", "description", () => nullableText(body.description, 2000)],
    ["sort_order", "sortOrder", () => nullableNumber(body.sortOrder ?? body.sort_order) ?? 0],
    ["capacity", "capacity", () => nullableNumber(body.capacity)],
    ["is_active", "isActive", () => booleanValue(body.isActive ?? body.is_active, true)],
    ["gender_scope", "genderScope", () => cleanText(body.genderScope ?? body.gender_scope, 40) || "open"],
    ["age_min", "ageMin", () => nullableNumber(body.ageMin ?? body.age_min)],
    ["age_max", "ageMax", () => nullableNumber(body.ageMax ?? body.age_max)],
    ["requires_license", "requiresLicense", () => booleanValue(body.requiresLicense ?? body.requires_license, false)],
  ].forEach(([column, camel, getter]) => {
    if (!partial || Object.prototype.hasOwnProperty.call(body, column) || Object.prototype.hasOwnProperty.call(body, camel)) {
      payload[column] = getter();
    }
  });

  if (!partial) {
    ["event_id", "code", "name"].forEach((key) => {
      if (!payload[key]) throw new Error("Uzupełnij wymagane pola kategorii.");
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
        .from("event_categories")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);

      const { data, error } = await query;
      if (error) throw error;

      const { data: registrations, error: registrationsError } = await supabase
        .from("registrations")
        .select("id,category_id,status")
        .eq("event_id", eventId);
      if (registrationsError) throw registrationsError;

      json(response, 200, {
        ok: true,
        categories: (data || []).map((category) => {
          const availability = availabilityForCategory(category, registrations || []);
          return normalizeCategory(category, availability);
        }),
      });
      return;
    }

    if (!requireAdmin(request)) {
      json(response, 403, { ok: false, error: "Brak dostępu do zarządzania kategoriami." });
      return;
    }

    const body = readBody(request);
    if (request.method === "POST") {
      const { data, error } = await supabase
        .from("event_categories")
        .insert(categoryPayload(body))
        .select("*")
        .single();
      if (error) throw error;
      json(response, 201, { ok: true, category: normalizeCategory(data) });
      return;
    }

    const id = cleanText(body.id, 80);
    if (!id) {
      json(response, 400, { ok: false, error: "Missing category id." });
      return;
    }
    const { data, error } = await supabase
      .from("event_categories")
      .update(categoryPayload(body, true))
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    json(response, 200, { ok: true, category: normalizeCategory(data) });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się obsłużyć kategorii." });
  }
};
