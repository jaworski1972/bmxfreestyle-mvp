const { requireAdmin } = require("../../lib/admin-auth");
const { getSupabase, json, readBody } = require("../../lib/supabase");
const { insertSmsLog, sendSms, smsProvider, smsRecipientsFromRegistrations } = require("../../lib/sms");

const REGISTRATION_SELECT = "*, events(id,name,slug,city,venue,starts_at), event_categories(code,name)";

module.exports = async function handler(request, response) {
  try {
    const session = requireAdmin(request);
    if (!session) {
      json(response, 403, { ok: false, error: "Brak dostępu do komunikacji SMS." });
      return;
    }

    if (request.method !== "POST") {
      json(response, 405, { ok: false, error: "Method not allowed." });
      return;
    }

    const body = readBody(request);
    const filters = {
      eventId: String(body.eventId || "").trim(),
      status: String(body.status || "").trim(),
      categoryCode: String(body.categoryCode || "").trim(),
      checkinStatus: String(body.checkinStatus || "").trim(),
    };
    const message = String(body.message || "").trim();

    if (!filters.eventId) {
      json(response, 400, { ok: false, error: "Wybierz wydarzenie." });
      return;
    }
    if (!message) {
      json(response, 400, { ok: false, error: "Treść SMS jest wymagana." });
      return;
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("registrations")
      .select(REGISTRATION_SELECT)
      .eq("event_id", filters.eventId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const recipientsResult = smsRecipientsFromRegistrations(data || [], filters);
    if (!recipientsResult.recipients.length) {
      json(response, 400, { ok: false, error: "Brak odbiorców dla wybranych filtrów.", ...recipientsResult });
      return;
    }

    const results = [];
    for (const recipient of recipientsResult.recipients) {
      const result = await sendSms({ to: recipient.recipientPhone, message });
      await insertSmsLog(supabase, {
        ...recipient,
        message,
        sendStatus: result.status,
        provider: smsProvider() || (result.status === "dry_run" ? "dry_run" : null),
        providerMessageId: result.providerMessageId,
        errorMessage: result.error,
        sentBy: session.login || "admin",
        sentAt: ["sent", "dry_run"].includes(result.status) ? new Date().toISOString() : null,
      });
      results.push({ ...recipient, status: result.status, error: result.error });
    }

    const summary = {
      total: results.length,
      sent: results.filter((item) => item.status === "sent").length,
      dryRun: results.filter((item) => item.status === "dry_run").length,
      failed: results.filter((item) => item.status === "failed").length,
      skipped: recipientsResult.skipped.length,
    };

    json(response, 200, { ok: true, summary, results, skipped: recipientsResult.skipped, limited: recipientsResult.limited });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się wysłać SMS." });
  }
};
