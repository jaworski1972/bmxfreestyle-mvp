const { getSupabase, json } = require("../lib/supabase");
const { requireAdmin } = require("../lib/admin-auth");
const { START_LIST_SELECT, normalizeStartListRow } = require("../lib/start-list");

module.exports = async function handler(request, response) {
  try {
    if (!requireAdmin(request)) {
      json(response, 403, { ok: false, error: "Brak dostępu do list startowych." });
      return;
    }

    if (request.method !== "GET") {
      json(response, 405, { ok: false, error: "Method not allowed." });
      return;
    }

    const eventId = String(request.query?.eventId || "").trim();
    const categoryId = String(request.query?.categoryId || "").trim();

    if (!eventId || !categoryId) {
      json(response, 400, { ok: false, error: "Wybierz wydarzenie i kategorię." });
      return;
    }

    let query = getSupabase()
      .from("registrations")
      .select(START_LIST_SELECT)
      .eq("event_id", eventId)
      .eq("category_id", categoryId)
      .order("start_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    query = query.eq("status", "accepted");

    const { data, error } = await query;
    if (error) throw error;

    json(response, 200, {
      ok: true,
      registrations: (data || []).map(normalizeStartListRow),
    });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się pobrać listy startowej." });
  }
};
