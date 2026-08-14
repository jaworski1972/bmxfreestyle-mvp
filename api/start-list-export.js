const { getSupabase, json } = require("../lib/supabase");
const { requireAdmin } = require("../lib/admin-auth");
const { START_LIST_SELECT, normalizeStartListRow, startListCsv } = require("../lib/start-list");

module.exports = async function handler(request, response) {
  try {
    if (!requireAdmin(request)) {
      json(response, 403, { ok: false, error: "Brak dostępu do eksportu listy startowej." });
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

    const { data, error } = await getSupabase()
      .from("registrations")
      .select(START_LIST_SELECT)
      .eq("event_id", eventId)
      .eq("category_id", categoryId)
      .eq("status", "accepted")
      .order("start_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) throw error;

    response.statusCode = 200;
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", "attachment; filename=\"bmx-freestyle-lista-startowa.csv\"");
    response.end(startListCsv((data || []).map(normalizeStartListRow)));
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się przygotować eksportu listy startowej." });
  }
};
