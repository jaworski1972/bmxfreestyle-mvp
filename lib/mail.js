const { Resend } = require("resend");

const APP_URL = (process.env.APP_URL || "https://bmxfreestyle.pl").replace(/\/$/, "");

function canSendMail() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

function resendClient() {
  if (!canSendMail()) {
    throw new Error("Missing Resend environment variables.");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendMail({ to, subject, html }) {
  const resend = resendClient();
  return resend.emails.send({
    from: process.env.MAIL_FROM,
    to,
    replyTo: process.env.MAIL_REPLY_TO || undefined,
    subject,
    html,
  });
}

function confirmationUrl(token) {
  return `${APP_URL}/potwierdz?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[character]);
}

function registrationReceivedHtml({ event, category, registration }) {
  const fullName = `${registration.first_name} ${registration.last_name}`.trim();
  return `
    <div style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f1115;">
      <div style="max-width:620px;margin:0 auto;padding:26px 14px;">
        <div style="background:#ffffff;border:1px solid #dde2e8;border-radius:18px;overflow:hidden;">
          <div style="background:#0f1115;padding:26px 24px;border-bottom:6px solid #d7ff2f;">
            <p style="margin:0 0 12px;color:#d7ff2f;font-size:13px;font-weight:900;text-transform:uppercase;">BMX Freestyle Polska</p>
            <h1 style="margin:0;color:#ffffff;font-size:30px;line-height:1.1;">Zgłoszenie przyjęte do systemu</h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 14px;font-size:16px;line-height:1.55;">Dziękujemy. Zgłoszenie zawodnika <strong>${escapeHtml(fullName)}</strong> zostało przyjęte do systemu.</p>
            <p style="margin:0 0 20px;font-size:16px;line-height:1.55;">Status zgłoszenia: <strong>oczekuje na weryfikację organizatora</strong>. To nie jest jeszcze automatyczna akceptacja startu.</p>
            <div style="border:1px solid #dde2e8;border-radius:12px;background:#fbfcfd;padding:18px;margin:0 0 20px;">
              <p style="margin:0 0 8px;font-size:15px;"><strong>Wydarzenie:</strong> ${escapeHtml(event.name)}</p>
              <p style="margin:0 0 8px;font-size:15px;"><strong>Kategoria:</strong> ${escapeHtml(category.code || category.name)}</p>
              <p style="margin:0 0 8px;font-size:15px;"><strong>Miasto:</strong> ${escapeHtml(event.city)}</p>
              <p style="margin:0;font-size:15px;"><strong>Miejsce:</strong> ${escapeHtml(event.venue)}</p>
            </div>
            <p style="margin:0;color:#66707c;font-size:14px;line-height:1.5;">Dalsze informacje przyjdą po akceptacji lub aktualizacji statusu zgłoszenia.</p>
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

async function sendRegistrationReceivedEmail({ event, category, registration }) {
  const to = registration.guardian_required && registration.guardian_email
    ? registration.guardian_email
    : registration.email;

  if (!to || !canSendMail()) return { sent: false, skipped: true };

  await sendMail({
    to,
    subject: `Zgłoszenie przyjęte — ${event.name}`,
    html: registrationReceivedHtml({ event, category, registration }),
  });

  return { sent: true, skipped: false };
}

function statusLabel(status) {
  return {
    pending_review: "oczekuje na weryfikację",
    accepted: "zgłoszenie zaakceptowane",
    needs_info: "wymaga uzupełnienia",
    rejected: "zgłoszenie odrzucone",
    waitlist: "lista rezerwowa",
  }[status] || status || "status zgłoszenia";
}

function statusExplanation(status) {
  return {
    pending_review: "Zgłoszenie jest w kolejce do sprawdzenia przez organizatora.",
    accepted: "Organizator zaakceptował zgłoszenie zawodnika. Na tym etapie nie nadajemy jeszcze numerów startowych.",
    needs_info: "Organizator potrzebuje dodatkowych informacji lub korekty danych zgłoszenia.",
    rejected: "Organizator nie może przyjąć zgłoszenia w obecnej formie.",
    waitlist: "Zgłoszenie trafiło na listę rezerwową. Organizator skontaktuje się, jeśli zwolni się miejsce.",
  }[status] || "Status zgłoszenia został zaktualizowany.";
}

function statusChangedHtml({ event, category, registration }) {
  const fullName = `${registration.first_name} ${registration.last_name}`.trim();
  const eventUrl = `${APP_URL}/zawody/${encodeURIComponent(event.slug || "")}`;
  const note = String(registration.status_note || "").trim();

  return `
    <div style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f1115;">
      <div style="max-width:620px;margin:0 auto;padding:26px 14px;">
        <div style="background:#ffffff;border:1px solid #dde2e8;border-radius:18px;overflow:hidden;">
          <div style="background:#0f1115;padding:26px 24px;border-bottom:6px solid #d7ff2f;">
            <p style="margin:0 0 12px;color:#d7ff2f;font-size:13px;font-weight:900;text-transform:uppercase;">BMX Freestyle Polska</p>
            <h1 style="margin:0;color:#ffffff;font-size:30px;line-height:1.1;">Aktualizacja statusu zgłoszenia</h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 14px;font-size:16px;line-height:1.55;">Zgłoszenie zawodnika <strong>${escapeHtml(fullName)}</strong> ma nowy status: <strong>${escapeHtml(statusLabel(registration.status))}</strong>.</p>
            <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">${escapeHtml(statusExplanation(registration.status))}</p>
            ${note ? `<div style="border-left:5px solid #d7ff2f;background:#fbfcfd;padding:14px 16px;margin:0 0 20px;"><p style="margin:0;font-size:15px;line-height:1.5;"><strong>Notatka organizatora:</strong><br>${escapeHtml(note)}</p></div>` : ""}
            <div style="border:1px solid #dde2e8;border-radius:12px;background:#fbfcfd;padding:18px;margin:0 0 20px;">
              <p style="margin:0 0 8px;font-size:15px;"><strong>Wydarzenie:</strong> ${escapeHtml(event.name)}</p>
              <p style="margin:0 0 8px;font-size:15px;"><strong>Kategoria:</strong> ${escapeHtml(category.code || category.name)}</p>
              <p style="margin:0 0 8px;font-size:15px;"><strong>Miasto:</strong> ${escapeHtml(event.city || "")}</p>
              <p style="margin:0;font-size:15px;"><strong>Miejsce:</strong> ${escapeHtml(event.venue || "")}</p>
            </div>
            <p style="margin:0 0 18px;">
              <a href="${escapeHtml(eventUrl)}" style="display:block;background:#d7ff2f;color:#0f1115;text-decoration:none;text-align:center;font-size:16px;line-height:1.2;font-weight:900;border-radius:10px;padding:14px 18px;">Zobacz wydarzenie</a>
            </p>
            <p style="margin:0;color:#66707c;font-size:14px;line-height:1.5;">Wiadomość wysłana automatycznie przez system zapisów BMX Freestyle Polska.</p>
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

async function sendStatusChangedEmail({ event, category, registration }) {
  const to = registration.guardian_required && registration.guardian_email
    ? registration.guardian_email
    : registration.email;

  if (!to || !canSendMail()) return { sent: false, skipped: true };

  await sendMail({
    to,
    subject: `Status zgłoszenia: ${statusLabel(registration.status)} — ${event.name}`,
    html: statusChangedHtml({ event, category, registration }),
  });

  return { sent: true, skipped: false };
}

module.exports = {
  APP_URL,
  canSendMail,
  confirmationUrl,
  sendRegistrationReceivedEmail,
  sendStatusChangedEmail,
  statusLabel,
  sendMail,
};
