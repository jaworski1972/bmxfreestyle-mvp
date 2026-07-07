const { getSupabase, json, readBody } = require("../lib/supabase");
const { requireAdmin } = require("../lib/admin-auth");
const { sendStatusChangedEmail } = require("../lib/mail");

const STATUS_VALUES = new Set(["pending_review", "accepted", "needs_info", "rejected", "waitlist"]);

const REGISTRATION_SELECT = "*, events(name,slug,city,venue,starts_at,ends_at), event_categories(code,name,requires_license,age_max)";

module.exports = async function handler(request, response) {
  try {
    if (!requireAdmin(request)) {
      json(response, 403, { ok: false, error: "Brak dostępu do zgłoszeń." });
      return;
    }

    const supabase = getSupabase();

    if (request.method === "GET") {
      const eventId = String(request.query?.eventId || "").trim();
      let query = supabase
        .from("registrations")
        .select(REGISTRATION_SELECT)
        .order("created_at", { ascending: false });

      if (eventId) query = query.eq("event_id", eventId);

      const { data, error } = await query;
      if (error) throw error;
      json(response, 200, { ok: true, registrations: data || [] });
      return;
    }

    if (request.method === "PATCH") {
      const body = readBody(request);
      const id = String(body.id || request.query?.id || "").trim();
      const status = String(body.status || "").trim();

      if (!id) {
        json(response, 400, { ok: false, error: "Missing registration id." });
        return;
      }

      if (!STATUS_VALUES.has(status)) {
        json(response, 400, { ok: false, error: "Invalid registration status." });
        return;
      }

      const { data, error } = await supabase
        .from("registrations")
        .update({
          status,
          status_note: String(body.statusNote || "").trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(REGISTRATION_SELECT)
        .single();

      if (error) throw error;

      let email = { sent: false, skipped: true };
      try {
        email = await sendStatusChangedEmail({
          event: data.events || {},
          category: data.event_categories || {},
          registration: data,
        });
      } catch (emailError) {
        console.error("BMX Freestyle status email failed", emailError);
        email = { sent: false, skipped: true, error: emailError.message };
      }

      json(response, 200, { ok: true, registration: data, email });
      return;
    }

    json(response, 405, { ok: false, error: "Method not allowed." });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się obsłużyć zgłoszeń." });
  }
};
