const { getSupabase, json, readBody } = require("../lib/supabase");
const { requireAdmin } = require("../lib/admin-auth");

function cleanOrderItem(item) {
  const startOrder = item.start_order ?? item.startOrder;
  const orderNumber = startOrder === "" || startOrder === null || startOrder === undefined ? null : Number(startOrder);
  return {
    registrationId: String(item.registrationId || item.id || "").trim(),
    startOrder: Number.isFinite(orderNumber) ? orderNumber : null,
    bibNumber: String(item.bib_number ?? item.bibNumber ?? "").trim() || null,
  };
}

module.exports = async function handler(request, response) {
  try {
    if (!requireAdmin(request)) {
      json(response, 403, { ok: false, error: "Brak dostępu do list startowych." });
      return;
    }

    if (request.method !== "PATCH") {
      json(response, 405, { ok: false, error: "Method not allowed." });
      return;
    }

    const body = readBody(request);
    const eventId = String(body.eventId || "").trim();
    const categoryId = String(body.categoryId || "").trim();
    const items = Array.isArray(body.list) ? body.list.map(cleanOrderItem) : [];

    if (!eventId || !categoryId || !items.length) {
      json(response, 400, { ok: false, error: "Wybierz wydarzenie, kategorię i zawodników." });
      return;
    }

    if (items.some((item) => !item.registrationId || (item.startOrder !== null && item.startOrder < 1))) {
      json(response, 400, { ok: false, error: "Kolejność startowa musi być pusta albo większa od zera." });
      return;
    }

    const orderValues = items.map((item) => item.startOrder).filter((value) => value !== null);
    if (new Set(orderValues).size !== orderValues.length) {
      json(response, 400, { ok: false, error: "Numery kolejności nie mogą się powtarzać." });
      return;
    }

    const ids = items.map((item) => item.registrationId);
    const supabase = getSupabase();
    const { data: registrations, error: fetchError } = await supabase
      .from("registrations")
      .select("id,event_id,category_id,status")
      .in("id", ids);

    if (fetchError) throw fetchError;
    if ((registrations || []).length !== ids.length) {
      json(response, 404, { ok: false, error: "Nie znaleziono wszystkich zawodników." });
      return;
    }

    const invalid = registrations.find((registration) => (
      registration.event_id !== eventId
      || registration.category_id !== categoryId
      || !["accepted", "waitlist"].includes(registration.status)
    ));
    if (invalid) {
      json(response, 409, { ok: false, error: "Lista zawiera zawodnika spoza wybranego wydarzenia lub kategorii." });
      return;
    }

    for (const item of items) {
      const { error } = await supabase
        .from("registrations")
        .update({
          start_order: item.startOrder,
          bib_number: item.bibNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.registrationId);
      if (error) throw error;
    }

    json(response, 200, { ok: true, updated: items.length });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się zapisać kolejności startowej." });
  }
};
