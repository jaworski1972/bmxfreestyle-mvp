const ADMIN_TOKEN_KEY = "bmxFreestyleAdminToken";
const ADMIN_USER_KEY = "bmxFreestyleAdminUser";

const loginView = document.querySelector("#loginView");
const checkinView = document.querySelector("#checkinView");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const logoutButton = document.querySelector("#logoutButton");
const eventSelect = document.querySelector("#eventSelect");
const categorySelect = document.querySelector("#categorySelect");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const refreshButton = document.querySelector("#refreshButton");
const checkinMessage = document.querySelector("#checkinMessage");
const checkinCounters = document.querySelector("#checkinCounters");
const checkinList = document.querySelector("#checkinList");

let eventsState = [];
let categoriesState = [];
let registrationsState = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[character]);
}

function token() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

function authHeaders(base = {}) {
  const currentToken = token();
  return currentToken ? { ...base, Authorization: `Bearer ${currentToken}`, "x-bmx-auth-token": currentToken } : base;
}

function setMessage(element, message, type = "info") {
  element.textContent = message;
  element.dataset.type = type;
}

function checkinLabel(status) {
  return {
    not_checked_in: "Brak check-in",
    checked_in: "Obecny",
    absent: "Nieobecny",
  }[status] || "Brak check-in";
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function clearSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}

function showLogin(message = "") {
  loginView.hidden = false;
  checkinView.hidden = true;
  logoutButton.hidden = true;
  if (message) setMessage(loginMessage, message, "error");
}

function showCheckin() {
  loginView.hidden = true;
  checkinView.hidden = false;
  logoutButton.hidden = false;
}

function filteredRegistrations() {
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  return registrationsState.filter((registration) => {
    const haystack = [
      registration.fullName,
      registration.phone,
      registration.email,
      registration.city,
      registration.country,
      registration.clubTeam,
      registration.bibNumber,
      registration.startOrder,
    ].join(" ").toLowerCase();
    if (status && registration.checkinStatus !== status) return false;
    if (query && !haystack.includes(query)) return false;
    return true;
  });
}

function renderCounters() {
  const counts = {
    total: registrationsState.length,
    checked: registrationsState.filter((item) => item.checkinStatus === "checked_in").length,
    absent: registrationsState.filter((item) => item.checkinStatus === "absent").length,
    waiting: registrationsState.filter((item) => !item.checkinStatus || item.checkinStatus === "not_checked_in").length,
  };
  checkinCounters.innerHTML = [
    ["Razem", counts.total],
    ["Obecni", counts.checked],
    ["Nieobecni", counts.absent],
    ["Brak check-in", counts.waiting],
  ].map(([label, value]) => `
    <article class="dashboard-tile">
      <strong>${value}</strong>
      <span>${label}</span>
    </article>
  `).join("");
}

function renderList() {
  const rows = filteredRegistrations();
  renderCounters();
  if (!rows.length) {
    checkinList.innerHTML = '<p class="form-message">Brak zawodników dla wybranych filtrów.</p>';
    return;
  }

  checkinList.innerHTML = rows.map((registration) => `
    <article class="checkin-row">
      <div class="checkin-main">
        <div>
          <strong>${escapeHtml(registration.fullName)}</strong>
          <span>${escapeHtml(registration.category?.code || "")} · ${escapeHtml(registration.birthDate || "-")} · ${escapeHtml(registration.city || "-")}</span>
        </div>
        <span class="status-chip checkin-${escapeHtml(registration.checkinStatus || "not_checked_in")}">${escapeHtml(checkinLabel(registration.checkinStatus))}</span>
      </div>
      <div class="checkin-meta">
        <span>Kolejność: <strong>${escapeHtml(registration.startOrder || "-")}</strong></span>
        <span>Numer: <strong>${escapeHtml(registration.bibNumber || "-")}</strong></span>
        <span>Klub/team: <strong>${escapeHtml(registration.clubTeam || "-")}</strong></span>
        <span>Telefon: <strong>${escapeHtml(registration.phone || "-")}</strong></span>
        <span>${registration.checkedInAt ? `Odprawiony: ${escapeHtml(formatDateTime(registration.checkedInAt))}` : ""}</span>
      </div>
      <div class="checkin-actions">
        <button class="primary-btn" type="button" data-checkin-id="${escapeHtml(registration.id)}" data-checkin-status="checked_in">Oznacz obecny</button>
        <button class="secondary-btn" type="button" data-checkin-id="${escapeHtml(registration.id)}" data-checkin-status="absent">Oznacz nieobecny</button>
        <button class="secondary-btn" type="button" data-checkin-id="${escapeHtml(registration.id)}" data-checkin-status="not_checked_in">Cofnij check-in</button>
      </div>
    </article>
  `).join("");
}

async function verifySession() {
  if (!token()) {
    showLogin();
    return;
  }

  try {
    const response = await fetch("/api/admin-auth", { headers: authHeaders() });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Sesja wygasła.");
    showCheckin();
    await loadConfiguration();
  } catch (error) {
    clearSession();
    showLogin(error.message || "Zaloguj się ponownie.");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  setMessage(loginMessage, "Loguję...", "info");
  const data = new FormData(loginForm);

  try {
    const response = await fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: data.get("login"), password: data.get("password") }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się zalogować.");

    localStorage.setItem(ADMIN_TOKEN_KEY, payload.token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(payload.user));
    showCheckin();
    await loadConfiguration();
  } catch (error) {
    setMessage(loginMessage, error.message || "Nie udało się zalogować.", "error");
  }
}

async function loadConfiguration() {
  setMessage(checkinMessage, "Ładuję konfigurację...", "info");
  const eventsResponse = await fetch("/api/events", { headers: authHeaders() });
  const eventsPayload = await eventsResponse.json();
  if (!eventsResponse.ok || !eventsPayload.ok) throw new Error(eventsPayload.error || "Nie udało się pobrać wydarzeń.");
  eventsState = eventsPayload.events || [];
  eventSelect.innerHTML = eventsState.map((event) => `<option value="${escapeHtml(event.id)}">${escapeHtml(event.name)}</option>`).join("");
  if (eventsState[0]) eventSelect.value = eventsState[0].id;
  await loadCategories();
  await loadStartList();
}

async function loadCategories() {
  const eventId = eventSelect.value;
  if (!eventId) {
    categoriesState = [];
    categorySelect.innerHTML = "";
    return;
  }
  const response = await fetch(`/api/categories?eventId=${encodeURIComponent(eventId)}`, { headers: authHeaders() });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się pobrać kategorii.");
  categoriesState = payload.categories || [];
  categorySelect.innerHTML = categoriesState.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.code)} · ${escapeHtml(category.name)}</option>`).join("");
  if (categoriesState[0]) categorySelect.value = categoriesState[0].id;
}

async function loadStartList() {
  const eventId = eventSelect.value;
  const categoryId = categorySelect.value;
  if (!eventId || !categoryId) {
    registrationsState = [];
    renderList();
    setMessage(checkinMessage, "Wybierz wydarzenie i kategorię.", "info");
    return;
  }

  try {
    setMessage(checkinMessage, "Ładuję zawodników...", "info");
    const params = new URLSearchParams({ eventId, categoryId });
    const response = await fetch(`/api/start-list?${params}`, { headers: authHeaders() });
    const payload = await response.json();
    if (response.status === 403 || response.status === 401) {
      clearSession();
      showLogin("Sesja wygasła. Zaloguj się ponownie.");
      return;
    }
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się pobrać zawodników.");
    registrationsState = payload.registrations || [];
    renderList();
    setMessage(checkinMessage, `Załadowano zawodników: ${registrationsState.length}`, "success");
  } catch (error) {
    setMessage(checkinMessage, error.message || "Nie udało się pobrać zawodników.", "error");
    renderList();
  }
}

async function updateCheckin(registrationId, checkinStatus) {
  try {
    setMessage(checkinMessage, "Zapisuję check-in...", "info");
    const response = await fetch("/api/checkin", {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ registrationId, checkin_status: checkinStatus }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się zapisać check-inu.");
    const index = registrationsState.findIndex((item) => item.id === payload.registration.id);
    if (index >= 0) registrationsState[index] = payload.registration;
    renderList();
    setMessage(checkinMessage, "Check-in zapisany.", "success");
  } catch (error) {
    setMessage(checkinMessage, error.message || "Nie udało się zapisać check-inu.", "error");
  }
}

loginForm.addEventListener("submit", handleLogin);
logoutButton.addEventListener("click", () => {
  clearSession();
  showLogin("Wylogowano.");
});
eventSelect.addEventListener("change", async () => {
  await loadCategories();
  await loadStartList();
});
categorySelect.addEventListener("change", loadStartList);
refreshButton.addEventListener("click", loadStartList);
searchInput.addEventListener("input", renderList);
statusFilter.addEventListener("change", renderList);
checkinList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-checkin-id]");
  if (!button) return;
  updateCheckin(button.dataset.checkinId, button.dataset.checkinStatus);
});

verifySession();
