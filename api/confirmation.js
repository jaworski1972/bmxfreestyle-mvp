const QRCode = require("qrcode");
const { cleanText, getSupabase, json } = require("../lib/supabase");
const { confirmationUrl } = require("../lib/mail");

const CONFIRMATION_SELECT = `
  id,
  confirmation_token,
  first_name,
  last_name,
  status,
  event_id,
  category_id,
  events(name,slug,city,venue,starts_at,ends_at),
  event_categories(code,name)
`;

function formatDateRange(event = {}) {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : null;
  const formatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  if (!Number.isNaN(start.getTime()) && end && !Number.isNaN(end.getTime())) {
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }
  return Number.isNaN(start.getTime()) ? "Termin wkrótce" : formatter.format(start);
}

function statusMessage(status) {
  return {
    pending_review: "Zgłoszenie czeka na weryfikację organizatora. To nie jest jeszcze automatyczna akceptacja startu.",
    accepted: "Zgłoszenie zostało zaakceptowane. Pokaż kod QR przy check-inie.",
    needs_info: "Organizator potrzebuje dodatkowych informacji lub korekty danych.",
    rejected: "Zgłoszenie zostało odrzucone. W razie pytań skontaktuj się z organizatorem.",
    waitlist: "Zgłoszenie jest na liście rezerwowej. Organizator poinformuje o dalszych krokach.",
  }[status] || "Status zgłoszenia jest dostępny w systemie organizatora.";
}

function confirmationStatusLabel(status) {
  return {
    pending_review: "oczekuje na weryfikację organizatora",
    accepted: "zaakceptowane",
    needs_info: "wymaga uzupełnienia",
    rejected: "odrzucone",
    waitlist: "lista rezerwowa",
  }[status] || status || "status zgłoszenia";
}

function publicPayload(row, url, qrSvg) {
  const event = row.events || {};
  const category = row.event_categories || {};
  return {
    id: row.id,
    confirmationUrl: url,
    qrSvg,
    athlete: {
      fullName: [row.first_name, row.last_name].filter(Boolean).join(" "),
    },
    event: {
      name: event.name || "",
      date: formatDateRange(event),
      city: event.city || "",
      venue: event.venue || "",
      slug: event.slug || "",
    },
    category: {
      code: category.code || category.name || "",
      name: category.name || category.code || "",
    },
    status: {
      code: row.status,
      label: confirmationStatusLabel(row.status),
      message: statusMessage(row.status),
    },
  };
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    json(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  try {
    const token = cleanText(request.query?.token, 120);
    if (!token) {
      json(response, 400, { ok: false, error: "Brakuje tokena potwierdzenia." });
      return;
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("registrations")
      .select(CONFIRMATION_SELECT)
      .eq("confirmation_token", token)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      json(response, 404, { ok: false, error: "Nie znaleziono potwierdzenia zgłoszenia." });
      return;
    }

    const url = confirmationUrl(data.confirmation_token);
    const qrSvg = await QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
      color: {
        dark: "#0f1115",
        light: "#ffffff",
      },
    });

    json(response, 200, { ok: true, confirmation: publicPayload(data, url, qrSvg) });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się pobrać potwierdzenia." });
  }
};
