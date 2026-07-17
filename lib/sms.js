const { normalizePolishPhone } = require("./phone-normalization");

function enabled(name) {
  return String(process.env[name] || "").trim().toLowerCase() === "true";
}

function smsProvider() {
  return String(process.env.SMS_PROVIDER || "").trim().toLowerCase();
}

function smsDryRun() {
  return enabled("SMS_DRY_RUN") || !smsProvider() || !process.env.SMS_API_TOKEN;
}

function recipientForRegistration(registration = {}) {
  if (registration.guardian_required) {
    const guardianPhone = normalizePolishPhone(registration.guardian_phone);
    if (guardianPhone.isValid) {
      return { phone: guardianPhone.normalizedPhone, type: "guardian" };
    }
  }

  const athletePhone = normalizePolishPhone(registration.phone);
  if (athletePhone.isValid) {
    return { phone: athletePhone.normalizedPhone, type: "athlete" };
  }

  return { phone: "", type: "" };
}

async function insertSmsLog(supabase, payload) {
  if (!supabase) return;
  try {
    await supabase.from("sms_logs").insert({
      event_id: payload.eventId || null,
      registration_id: payload.registrationId || null,
      recipient_phone: payload.recipientPhone || null,
      recipient_type: payload.recipientType || null,
      message: payload.message || "",
      send_status: payload.sendStatus,
      provider: payload.provider || null,
      provider_message_id: payload.providerMessageId || null,
      error_message: payload.errorMessage || null,
      sent_at: payload.sentAt || null,
    });
  } catch (error) {
    console.error("BMX Freestyle SMS log failed", error);
  }
}

async function sendSmsWithProvider({ to, message }) {
  const provider = smsProvider();

  if (provider === "smsapi") {
    const params = new URLSearchParams({
      to,
      message,
      format: "json",
    });
    if (process.env.SMS_FROM) params.set("from", process.env.SMS_FROM);

    const response = await fetch("https://api.smsapi.pl/sms.do", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SMS_API_TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || payload.error || "SMS provider rejected the message.");
    }
    return { providerMessageId: payload.list?.[0]?.id || payload.id || null };
  }

  throw new Error(`Unsupported SMS_PROVIDER: ${provider || "not configured"}.`);
}

async function sendSmsNotification({ supabase, event, registration, message, reason, force = false }) {
  const provider = smsProvider();
  const recipient = recipientForRegistration(registration);

  if (!force) {
    return { sent: false, skipped: true, status: "skipped", reason: reason || "disabled" };
  }

  if (!recipient.phone) {
    await insertSmsLog(supabase, {
      eventId: event?.id || registration?.event_id,
      registrationId: registration?.id,
      recipientPhone: "",
      recipientType: "",
      message,
      sendStatus: "skipped",
      provider,
      errorMessage: "Missing valid recipient phone.",
    });
    return { sent: false, skipped: true, status: "skipped", reason: "missing_phone" };
  }

  if (smsDryRun()) {
    await insertSmsLog(supabase, {
      eventId: event?.id || registration?.event_id,
      registrationId: registration?.id,
      recipientPhone: recipient.phone,
      recipientType: recipient.type,
      message,
      sendStatus: "dry_run",
      provider: provider || "dry_run",
      sentAt: new Date().toISOString(),
    });
    return { sent: false, skipped: false, status: "dry_run", recipientType: recipient.type };
  }

  try {
    const result = await sendSmsWithProvider({ to: recipient.phone, message });
    await insertSmsLog(supabase, {
      eventId: event?.id || registration?.event_id,
      registrationId: registration?.id,
      recipientPhone: recipient.phone,
      recipientType: recipient.type,
      message,
      sendStatus: "sent",
      provider,
      providerMessageId: result.providerMessageId,
      sentAt: new Date().toISOString(),
    });
    return { sent: true, skipped: false, status: "sent", recipientType: recipient.type };
  } catch (error) {
    await insertSmsLog(supabase, {
      eventId: event?.id || registration?.event_id,
      registrationId: registration?.id,
      recipientPhone: recipient.phone,
      recipientType: recipient.type,
      message,
      sendStatus: "failed",
      provider,
      errorMessage: error.message,
    });
    console.error("BMX Freestyle SMS failed", error);
    return { sent: false, skipped: false, status: "failed", error: error.message };
  }
}

module.exports = {
  enabled,
  recipientForRegistration,
  sendSmsNotification,
  smsDryRun,
};
