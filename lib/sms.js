const { normalizePolishPhone } = require("./phone-normalization");

const SMS_CONFIG_ERROR = "Nie skonfigurowano operatora SMS.";
const SMSAPI_ENDPOINT = "https://api.smsapi.pl/sms.do";
const MAX_GROUP_RECIPIENTS = 500;
const DEFAULT_SMSAPI_TIMEOUT_MS = 10000;

function enabled(name) {
  return String(process.env[name] || "").trim().toLowerCase() === "true";
}

function smsProvider() {
  return String(process.env.SMS_PROVIDER || "").trim().toLowerCase();
}

function smsDryRun() {
  return enabled("SMS_DRY_RUN");
}

function smsConfigured() {
  return smsProvider() === "smsapi" && Boolean(process.env.SMS_API_TOKEN) && Boolean(process.env.SMS_FROM);
}

function smsapiTimeoutMs() {
  const value = Number(process.env.SMSAPI_TIMEOUT_MS || DEFAULT_SMSAPI_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_SMSAPI_TIMEOUT_MS;
}

function normalizeSmsPhone(phone) {
  return normalizePolishPhone(phone);
}

function registrationFullName(registration = {}) {
  return [registration.first_name, registration.last_name].filter(Boolean).join(" ").trim();
}

function categoryCode(registration = {}) {
  return registration.event_categories?.code || registration.category?.code || registration.category_code || "";
}

function eventId(registration = {}) {
  return registration.event_id || registration.events?.id || registration.event?.id || null;
}

function checkinStatus(registration = {}) {
  return registration.checkin_status || registration.checkinStatus || "not_checked_in";
}

function recipientForRegistration(registration = {}) {
  if (registration.guardian_required) {
    const guardianPhone = normalizeSmsPhone(registration.guardian_phone);
    if (guardianPhone.isValid) {
      return {
        phone: guardianPhone.normalizedPhone,
        type: "guardian",
        source: "guardian_phone",
        fallback: false,
      };
    }
  }

  const athletePhone = normalizeSmsPhone(registration.phone);
  if (athletePhone.isValid) {
    return {
      phone: athletePhone.normalizedPhone,
      type: "athlete",
      source: "phone",
      fallback: Boolean(registration.guardian_required),
    };
  }

  return { phone: "", type: "", source: "", fallback: false };
}

function smsRecipientForRegistration(registration = {}) {
  const recipient = recipientForRegistration(registration);
  return {
    registrationId: registration.id || null,
    eventId: eventId(registration),
    recipientName: registrationFullName(registration),
    recipientPhone: recipient.phone,
    recipientType: recipient.type,
    recipientSource: recipient.source,
    fallbackToAthlete: recipient.fallback,
    categoryCode: categoryCode(registration),
    registrationStatus: registration.status || "",
    checkinStatus: checkinStatus(registration),
    skippedReason: recipient.phone ? "" : "missing_phone",
  };
}

function matchesSmsFilters(registration = {}, filters = {}) {
  if (filters.eventId && eventId(registration) !== filters.eventId) return false;
  if (filters.status && registration.status !== filters.status) return false;
  if (filters.categoryCode && categoryCode(registration) !== filters.categoryCode) return false;
  if (filters.checkinStatus && checkinStatus(registration) !== filters.checkinStatus) return false;
  return true;
}

function smsRecipientsFromRegistrations(registrations = [], filters = {}) {
  const recipients = [];
  const skipped = [];
  const seenPhones = new Set();

  registrations
    .filter((registration) => matchesSmsFilters(registration, filters))
    .forEach((registration) => {
      const row = smsRecipientForRegistration(registration);
      if (!row.recipientPhone) {
        skipped.push(row);
        return;
      }

      if (seenPhones.has(row.recipientPhone)) {
        skipped.push({ ...row, skippedReason: "duplicate_phone" });
        return;
      }

      seenPhones.add(row.recipientPhone);
      recipients.push(row);
    });

  return {
    recipients: recipients.slice(0, MAX_GROUP_RECIPIENTS),
    skipped,
    limit: MAX_GROUP_RECIPIENTS,
    limited: recipients.length > MAX_GROUP_RECIPIENTS,
  };
}

async function insertSmsLog(supabase, payload) {
  if (!supabase) return;
  try {
    await supabase.from("sms_logs").insert({
      event_id: payload.eventId || null,
      registration_id: payload.registrationId || null,
      recipient_name: payload.recipientName || null,
      recipient_phone: payload.recipientPhone || null,
      recipient_type: payload.recipientType || null,
      category_code: payload.categoryCode || null,
      registration_status: payload.registrationStatus || null,
      checkin_status: payload.checkinStatus || null,
      message: payload.message || "",
      provider: payload.provider || null,
      provider_message_id: payload.providerMessageId || null,
      send_status: payload.sendStatus,
      error_message: payload.errorMessage || null,
      sent_by: payload.sentBy || null,
      sent_at: payload.sentAt || null,
    });
  } catch (error) {
    console.error("BMX Freestyle SMS log failed", error);
  }
}

async function parseSmsapiJson(response) {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error("SMSAPI returned empty response.");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("SMSAPI returned invalid JSON.");
  }
}

function smsapiErrorMessage(payload, fallback = "SMS provider rejected the message.") {
  if (payload && Object.prototype.hasOwnProperty.call(payload, "error")) {
    const message = payload.message || payload.error_description || fallback;
    return `SMSAPI error ${payload.error}: ${message}`;
  }
  return payload?.message || payload?.error_description || fallback;
}

function smsapiMessageId(payload) {
  return payload?.list?.[0]?.id
    || payload?.id
    || payload?.message_id
    || payload?.messageId
    || null;
}

async function sendSmsWithSmsapi({ to, message }) {
  const params = new URLSearchParams({
    to,
    message,
    format: "json",
    from: process.env.SMS_FROM,
    encoding: "utf-8",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), smsapiTimeoutMs());
  let response;
  try {
    response = await fetch(SMSAPI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SMS_API_TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("SMSAPI request timed out.");
    }
    throw new Error(error.message || "SMSAPI request failed.");
  } finally {
    clearTimeout(timeout);
  }

  const payload = await parseSmsapiJson(response);
  if (payload && Object.prototype.hasOwnProperty.call(payload, "error")) {
    throw new Error(smsapiErrorMessage(payload));
  }

  if (!response.ok) {
    throw new Error(smsapiErrorMessage(payload, `SMSAPI HTTP ${response.status}: ${response.statusText || "request failed"}.`));
  }

  const providerMessageId = smsapiMessageId(payload);
  if (!providerMessageId) {
    throw new Error("SMSAPI response did not include a message id.");
  }

  return { providerMessageId };
}

async function sendSms({ to, message }) {
  const normalized = normalizeSmsPhone(to);
  const cleanMessage = String(message || "").trim();
  const provider = smsProvider();

  if (!cleanMessage) {
    return { status: "failed", providerMessageId: null, error: "Treść SMS jest wymagana." };
  }

  if (!normalized.isValid) {
    return { status: "failed", providerMessageId: null, error: "Nieprawidłowy numer telefonu." };
  }

  if (smsDryRun()) {
    return { status: "dry_run", providerMessageId: null, error: null, to: normalized.normalizedPhone };
  }

  if (!smsConfigured()) {
    return { status: "failed", providerMessageId: null, error: SMS_CONFIG_ERROR, to: normalized.normalizedPhone };
  }

  if (provider !== "smsapi") {
    return { status: "failed", providerMessageId: null, error: `Unsupported SMS_PROVIDER: ${provider || "not configured"}.`, to: normalized.normalizedPhone };
  }

  try {
    const result = await sendSmsWithSmsapi({ to: normalized.normalizedPhone, message: cleanMessage });
    return { status: "sent", providerMessageId: result.providerMessageId, error: null, to: normalized.normalizedPhone };
  } catch (error) {
    return { status: "failed", providerMessageId: null, error: error.message, to: normalized.normalizedPhone };
  }
}

async function sendSmsNotification({ supabase, event, registration, message, reason, force = false }) {
  const provider = smsProvider();
  const recipient = smsRecipientForRegistration(registration);

  if (!force) {
    return { sent: false, skipped: true, status: "skipped", reason: reason || "disabled" };
  }

  if (!recipient.recipientPhone) {
    await insertSmsLog(supabase, {
      ...recipient,
      eventId: event?.id || recipient.eventId,
      message,
      sendStatus: "skipped",
      provider,
      errorMessage: "Missing valid recipient phone.",
    });
    return { sent: false, skipped: true, status: "skipped", reason: "missing_phone" };
  }

  const result = await sendSms({ to: recipient.recipientPhone, message });
  await insertSmsLog(supabase, {
    ...recipient,
    eventId: event?.id || recipient.eventId,
    message,
    sendStatus: result.status,
    provider: provider || (smsDryRun() ? "dry_run" : null),
    providerMessageId: result.providerMessageId,
    errorMessage: result.error,
    sentAt: ["sent", "dry_run"].includes(result.status) ? new Date().toISOString() : null,
  });

  if (result.status === "failed") {
    console.error("BMX Freestyle SMS failed", result.error);
  }

  return {
    sent: result.status === "sent",
    skipped: false,
    status: result.status,
    error: result.error,
    recipientType: recipient.recipientType,
  };
}

module.exports = {
  MAX_GROUP_RECIPIENTS,
  SMS_CONFIG_ERROR,
  enabled,
  insertSmsLog,
  normalizeSmsPhone,
  recipientForRegistration,
  sendSms,
  sendSmsNotification,
  sendSmsWithSmsapi,
  smsDryRun,
  smsProvider,
  smsRecipientsFromRegistrations,
};
