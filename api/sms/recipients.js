const { requireAdmin } = require("../../lib/admin-auth");
const { getSupabase, json } = require("../../lib/supabase");
const { smsRecipientsFromRegistrations } = require("../../lib/sms");

const REGISTRATION_SELECT = "*, events(id,name,slug,city,venue,starts_at), event_categories(code,name)";

function filtersFromQuery(query = {}) {
  return {
    eventId: String(query.eventId || "").trim(),
    status: String(query.status || "").trim(),
    categoryCode: String(query.categoryCode || "").trim(),
    checkinStatus: String(query.checkinStatus || "").trim(),
  };
}

module.exports = async function handler(request, response) {
  try {
    if (!requireAdmin(request)) {
      json(response, 403, { ok: false, error: "Brak dostępu do komunikacji SMS." });
      return;
    }

    if (request.method !== "GET") {
      json(response, 405, { ok: false, error: "Method not allowed." });
      return;
    }

    const filters = filtersFromQuery(request.query);
    if (!filters.eventId) {
      json(response, 400, { ok: false, error: "Wybierz wydarzenie." });
      return;
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("registrations")
      .select(REGISTRATION_SELECT)
      .eq("event_id", filters.eventId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const result = smsRecipientsFromRegistrations(data || [], filters);
    json(response, 200, { ok: true, ...result });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się pobrać odbiorców SMS." });
  }
};
