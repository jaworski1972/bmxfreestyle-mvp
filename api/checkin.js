const { getSupabase, json, readBody } = require("../lib/supabase");
const { requireAdmin } = require("../lib/admin-auth");
const { START_LIST_SELECT, normalizeStartListRow } = require("../lib/start-list");

const CHECKIN_STATUSES = new Set(["not_checked_in", "checked_in", "absent"]);

module.exports = async function handler(request, response) {
  try {
    if (!requireAdmin(request)) {
      json(response, 403, { ok: false, error: "Brak dostępu do check-inu." });
      return;
    }

    if (request.method !== "PATCH") {
      json(response, 405, { ok: false, error: "Method not allowed." });
      return;
    }

    const body = readBody(request);
    const registrationId = String(body.registrationId || "").trim();
    const checkinStatus = String(body.checkin_status || body.checkinStatus || "").trim();

    if (!registrationId) {
      json(response, 400, { ok: false, error: "Missing registration id." });
      return;
    }

    if (!CHECKIN_STATUSES.has(checkinStatus)) {
      json(response, 400, { ok: false, error: "Invalid check-in status." });
      return;
    }

    const supabase = getSupabase();
    const { data: current, error: currentError } = await supabase
      .from("registrations")
      .select("id,status")
      .eq("id", registrationId)
      .single();

    if (currentError) throw currentError;
    if (!["accepted", "waitlist"].includes(current.status)) {
      json(response, 409, { ok: false, error: "Check-in jest dostępny tylko dla zaakceptowanych lub rezerwowych zgłoszeń." });
      return;
    }

    const { data, error } = await supabase
      .from("registrations")
      .update({
        checkin_status: checkinStatus,
        checked_in_at: checkinStatus === "checked_in" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", registrationId)
      .select(START_LIST_SELECT)
      .single();

    if (error) throw error;
    json(response, 200, { ok: true, registration: normalizeStartListRow(data) });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się zapisać check-inu." });
  }
};
