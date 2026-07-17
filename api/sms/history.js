const { requireAdmin } = require("../../lib/admin-auth");
const { getSupabase, json } = require("../../lib/supabase");

module.exports = async function handler(request, response) {
  try {
    if (!requireAdmin(request)) {
      json(response, 403, { ok: false, error: "Brak dostępu do historii SMS." });
      return;
    }

    if (request.method !== "GET") {
      json(response, 405, { ok: false, error: "Method not allowed." });
      return;
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("sms_logs")
      .select("id,event_id,recipient_name,recipient_phone,recipient_type,category_code,registration_status,checkin_status,message,provider,provider_message_id,send_status,error_message,sent_by,sent_at,created_at,events(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    json(response, 200, { ok: true, logs: data || [] });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się pobrać historii SMS." });
  }
};
