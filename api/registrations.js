const { getSupabase, json, readBody } = require("../lib/supabase");
const { requireAdmin } = require("../lib/admin-auth");
const { confirmationUrl, sendStatusChangedEmail } = require("../lib/mail");
const { enabled, sendSmsNotification } = require("../lib/sms");
const { CATEGORY_FULL_STATUS_MESSAGE, statusOccupiesCapacity } = require("../lib/registration-limits");

const STATUS_VALUES = new Set(["pending_review", "accepted", "needs_info", "rejected", "waitlist"]);

const REGISTRATION_SELECT = "*, events(name,slug,city,venue,starts_at,ends_at), event_categories(code,name,requires_license,age_max,capacity)";

function isMissingStatusRpc(error) {
  const message = String(error?.message || "");
  return message.includes("update_registration_status_with_limits") && (
    message.includes("not exist")
    || message.includes("Could not find")
    || message.includes("schema cache")
  );
}

async function ensureStatusCapacity(supabase, registration, nextStatus) {
  if (!statusOccupiesCapacity(nextStatus) || statusOccupiesCapacity(registration.status)) return null;
  const capacity = registration.event_categories?.capacity;
  if (capacity === null || capacity === undefined || capacity === "") return null;

  const { count, error } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("category_id", registration.category_id)
    .neq("id", registration.id)
    .in("status", ["pending_review", "accepted", "needs_info"]);
  if (error) throw error;

  if ((count || 0) >= Number(capacity)) {
    return CATEGORY_FULL_STATUS_MESSAGE;
  }
  return null;
}

async function ensureCategoryCapacity(supabase, registration, targetCategory) {
  if (!statusOccupiesCapacity(registration.status)) return null;
  const capacity = targetCategory?.capacity;
  if (capacity === null || capacity === undefined || capacity === "") return null;

  const { count, error } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("category_id", targetCategory.id)
    .neq("id", registration.id)
    .in("status", ["pending_review", "accepted", "needs_info"]);
  if (error) throw error;

  if ((count || 0) >= Number(capacity)) {
    return CATEGORY_FULL_STATUS_MESSAGE;
  }
  return null;
}

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
      const categoryId = String(body.categoryId || body.category_id || "").trim();
      const status = String(body.status || "").trim();

      if (!id) {
        json(response, 400, { ok: false, error: "Missing registration id." });
        return;
      }

      if (categoryId) {
        const { data: previousRegistration, error: previousError } = await supabase
          .from("registrations")
          .select("id,status,event_id,category_id")
          .eq("id", id)
          .single();
        if (previousError) throw previousError;

        const { data: targetCategory, error: categoryError } = await supabase
          .from("event_categories")
          .select("id,event_id,code,name,capacity,is_active")
          .eq("id", categoryId)
          .single();
        if (categoryError) throw categoryError;

        if (targetCategory.event_id !== previousRegistration.event_id) {
          json(response, 400, { ok: false, error: "Kategoria docelowa musi należeć do tego samego wydarzenia." });
          return;
        }

        if (targetCategory.id === previousRegistration.category_id) {
          const { data, error } = await supabase
            .from("registrations")
            .select(REGISTRATION_SELECT)
            .eq("id", id)
            .single();
          if (error) throw error;
          json(response, 200, { ok: true, registration: data, categoryChanged: false });
          return;
        }

        if (!targetCategory.is_active) {
          json(response, 400, { ok: false, error: "Nie można przenieść zgłoszenia do nieaktywnej kategorii." });
          return;
        }

        const capacityError = await ensureCategoryCapacity(supabase, previousRegistration, targetCategory);
        if (capacityError) {
          json(response, 409, { ok: false, code: "category_full", error: capacityError });
          return;
        }

        const { error: updateError } = await supabase
          .from("registrations")
          .update({
            category_id: categoryId,
            start_order: null,
            bib_number: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (updateError) throw updateError;

        const { data, error } = await supabase
          .from("registrations")
          .select(REGISTRATION_SELECT)
          .eq("id", id)
          .single();
        if (error) throw error;

        json(response, 200, { ok: true, registration: data, categoryChanged: true });
        return;
      }

      if (!STATUS_VALUES.has(status)) {
        json(response, 400, { ok: false, error: "Invalid registration status." });
        return;
      }

      const { data: previousRegistration, error: previousError } = await supabase
        .from("registrations")
        .select("id,status,category_id,event_categories(capacity)")
        .eq("id", id)
        .single();

      if (previousError) throw previousError;

      const statusNote = String(body.statusNote || "").trim() || null;
      const { data: rpcData, error: rpcError } = await supabase.rpc("update_registration_status_with_limits", {
        registration_id_input: id,
        status_input: status,
        status_note_input: statusNote,
      });

      if (rpcError && !isMissingStatusRpc(rpcError)) throw rpcError;

      if (!rpcError && rpcData?.ok === false) {
        json(response, rpcData.code === "category_full" ? 409 : 400, {
          ok: false,
          code: rpcData.code || "status_rejected",
          error: rpcData.error || CATEGORY_FULL_STATUS_MESSAGE,
        });
        return;
      }

      if (rpcError) {
        const capacityError = await ensureStatusCapacity(supabase, previousRegistration, status);
        if (capacityError) {
          json(response, 409, { ok: false, code: "category_full", error: capacityError });
          return;
        }
        const { error: updateError } = await supabase
          .from("registrations")
          .update({
            status,
            status_note: statusNote,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (updateError) throw updateError;
      }

      const { data, error } = await supabase
        .from("registrations")
        .select(REGISTRATION_SELECT)
        .eq("id", id)
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

      const smsMessage = data.confirmation_token
        ? `BMX Series: zgłoszenie zaakceptowane. Pokaż QR przy check-inie: ${confirmationUrl(data.confirmation_token)}`
        : "";
      let alreadySentAcceptedSms = false;
      if (data.confirmation_token && status === "accepted" && enabled("SEND_SMS_ON_ACCEPTED")) {
        const { data: existingSmsLogs, error: smsLogError } = await supabase
          .from("sms_logs")
          .select("id")
          .eq("registration_id", data.id)
          .in("send_status", ["sent", "dry_run"])
          .ilike("message", "%zgłoszenie zaakceptowane%")
          .limit(1);
        if (smsLogError) {
          console.error("BMX Freestyle accepted SMS duplicate check failed", smsLogError);
        }
        alreadySentAcceptedSms = Boolean(existingSmsLogs?.length);
      }
      const sms = await sendSmsNotification({
        supabase,
        event: data.events || {},
        registration: data,
        message: smsMessage,
        reason: data.confirmation_token ? "accepted_sms_disabled" : "missing_confirmation_token",
        force: Boolean(data.confirmation_token)
          && status === "accepted"
          && previousRegistration.status !== "accepted"
          && !alreadySentAcceptedSms
          && enabled("SEND_SMS_ON_ACCEPTED"),
      });

      json(response, 200, { ok: true, registration: data, email, sms });
      return;
    }

    json(response, 405, { ok: false, error: "Method not allowed." });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się obsłużyć zgłoszeń." });
  }
};
