const { requireAdmin } = require("../../lib/admin-auth");
const { getSupabase, json, readBody } = require("../../lib/supabase");
const { insertSmsLog, sendSms, smsProvider } = require("../../lib/sms");

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
    const to = String(body.to || "").trim();
    const message = String(body.message || "").trim();

    if (!to) {
      json(response, 400, { ok: false, error: "Podaj numer telefonu testowego." });
      return;
    }
    if (!message) {
      json(response, 400, { ok: false, error: "Treść SMS jest wymagana." });
      return;
    }

    const result = await sendSms({ to, message });
    const supabase = getSupabase();
    await insertSmsLog(supabase, {
      recipientName: "Test SMS",
      recipientPhone: result.to || to,
      message,
      sendStatus: result.status,
      provider: smsProvider() || (result.status === "dry_run" ? "dry_run" : null),
      providerMessageId: result.providerMessageId,
      errorMessage: result.error,
      sentBy: session.login || "admin",
      sentAt: ["sent", "dry_run"].includes(result.status) ? new Date().toISOString() : null,
    });

    json(response, result.status === "failed" ? 400 : 200, { ok: result.status !== "failed", result });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się wysłać testowego SMS." });
  }
};
