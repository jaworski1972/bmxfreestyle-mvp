const ADMIN_TOKEN_KEY = "bmxFreestyleAdminToken";
const ADMIN_USER_KEY = "bmxFreestyleAdminUser";
const ACTION_STATUSES = new Set(["pending_review", "needs_info"]);

const loginView = document.querySelector("#loginView");
const adminView = document.querySelector("#adminView");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const logoutButton = document.querySelector("#logoutButton");
const registrationsTable = document.querySelector("#registrationsTable");
const adminMessage = document.querySelector("#adminMessage");
const adminSearch = document.querySelector("#adminSearch");
const adminEventFilter = document.querySelector("#adminEventFilter");
const adminStatusFilter = document.querySelector("#adminStatusFilter");
const adminCategoryFilter = document.querySelector("#adminCategoryFilter");
const minorOnlyFilter = document.querySelector("#minorOnlyFilter");
const proOnlyFilter = document.querySelector("#proOnlyFilter");
const actionOnlyFilter = document.querySelector("#actionOnlyFilter");
const dashboardGrid = document.querySelector("#dashboardGrid");
const refreshButton = document.querySelector("#refreshButton");
const exportButton = document.querySelector("#exportButton");
const modal = document.querySelector("#registrationModal");
const modalCloseButton = document.querySelector("#modalCloseButton");
const registrationDetails = document.querySelector("#registrationDetails");
const adminPanels = [...document.querySelectorAll("[data-admin-panel]")];
const eventsList = document.querySelector("#eventsList");
const eventForm = document.querySelector("#eventForm");
const eventMessage = document.querySelector("#eventMessage");
const newEventButton = document.querySelector("#newEventButton");
const refreshEventsButton = document.querySelector("#refreshEventsButton");
const categoryEventSelect = document.querySelector("#categoryEventSelect");
const categoriesList = document.querySelector("#categoriesList");
const categoryForm = document.querySelector("#categoryForm");
const categoryMessage = document.querySelector("#categoryMessage");
const newCategoryButton = document.querySelector("#newCategoryButton");
const consentEventSelect = document.querySelector("#consentEventSelect");
const consentsList = document.querySelector("#consentsList");
const consentForm = document.querySelector("#consentForm");
const consentMessage = document.querySelector("#consentMessage");
const newConsentButton = document.querySelector("#newConsentButton");
const startListEventSelect = document.querySelector("#startListEventSelect");
const startListCategorySelect = document.querySelector("#startListCategorySelect");
const startListTable = document.querySelector("#startListTable");
const startListMessage = document.querySelector("#startListMessage");
const startListRefreshButton = document.querySelector("#startListRefreshButton");
const orderByCreatedButton = document.querySelector("#orderByCreatedButton");
const orderByNameButton = document.querySelector("#orderByNameButton");
const orderRandomButton = document.querySelector("#orderRandomButton");
const saveStartOrderButton = document.querySelector("#saveStartOrderButton");
const exportStartListButton = document.querySelector("#exportStartListButton");

let registrationsState = [];
let eventsState = [];
let categoriesState = [];
let consentsState = [];
let startListCategoriesState = [];
let startListState = [];
let currentUser = null;

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

function statusLabel(status) {
  return {
    pending_review: "Oczekuje na weryfikację",
    accepted: "Zaakceptowane",
    needs_info: "Wymaga uzupełnienia",
    rejected: "Odrzucone",
    waitlist: "Lista rezerwowa",
    new: "Nowe",
  }[status] || status || "-";
}

function checkinLabel(status) {
  return {
    not_checked_in: "Brak check-in",
    checked_in: "Obecny",
    absent: "Nieobecny",
  }[status] || status || "Brak check-in";
}

function categoryCode(registration) {
  return registration.event_categories?.code || registration.category?.code || "";
}

function categoryName(registration) {
  return registration.event_categories?.name || categoryCode(registration);
}

function eventData(registration) {
  return registration.events || registration.event || {};
}

function eventName(registration) {
  return eventData(registration).name || "-";
}

function eventKey(registration) {
  return registration.event_id || eventData(registration).id || eventName(registration);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function valueOrNull(value) {
  const text = String(value || "").trim();
  return text || null;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function currentPanelName() {
  const path = window.location.pathname;
  if (path.includes("/admin/zawody")) return "events";
  if (path.includes("/admin/kategorie")) return "categories";
  if (path.includes("/admin/zgody")) return "consents";
  if (path.includes("/admin/listy-startowe")) return "startlists";
  if (path.includes("/admin/eksport")) return "registrations";
  return "registrations";
}

function showPanel(name = currentPanelName()) {
  adminPanels.forEach((panel) => {
    panel.hidden = panel.dataset.adminPanel !== name;
  });
  markActiveAdminNav();
}

function markActiveAdminNav() {
  const path = window.location.pathname;
  document.querySelectorAll(".site-header nav a").forEach((link) => {
    const linkPath = new URL(link.href).pathname;
    const active = linkPath === "/admin"
      ? path === "/admin"
      : path.startsWith(linkPath) || (linkPath === "/admin/zgloszenia" && path === "/admin/eksport");
    link.classList.toggle("is-active", active);
  });
}

function ageAtEvent(registration) {
  const birthDate = new Date(`${registration.birth_date}T12:00:00`);
  const eventDate = new Date(eventData(registration).starts_at || registration.created_at || Date.now());
  if (Number.isNaN(birthDate.getTime()) || Number.isNaN(eventDate.getTime())) return "-";
  let age = eventDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = eventDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && eventDate.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

function registrationMatches(registration) {
  const query = adminSearch.value.trim().toLowerCase();
  const status = adminStatusFilter.value;
  const category = adminCategoryFilter.value;
  const selectedEvent = adminEventFilter.value;
  const haystack = [
    registration.first_name,
    registration.last_name,
    registration.email,
    registration.phone,
    registration.guardian_full_name,
    registration.guardian_email,
    registration.club_team,
    registration.city,
    eventName(registration),
  ].join(" ").toLowerCase();

  if (query && !haystack.includes(query)) return false;
  if (selectedEvent && eventKey(registration) !== selectedEvent) return false;
  if (status && registration.status !== status) return false;
  if (category && categoryCode(registration) !== category) return false;
  if (minorOnlyFilter.checked && !registration.guardian_required) return false;
  if (proOnlyFilter.checked && categoryCode(registration) !== "PRO") return false;
  if (actionOnlyFilter.checked && !ACTION_STATUSES.has(registration.status)) return false;
  return true;
}

function filteredRegistrations() {
  return registrationsState.filter(registrationMatches);
}

function renderDashboard() {
  const counts = {
    total: registrationsState.length,
    pending: registrationsState.filter((item) => item.status === "pending_review").length,
    accepted: registrationsState.filter((item) => item.status === "accepted").length,
    rejected: registrationsState.filter((item) => item.status === "rejected").length,
    waitlist: registrationsState.filter((item) => item.status === "waitlist").length,
    pro: registrationsState.filter((item) => categoryCode(item) === "PRO").length,
    amator: registrationsState.filter((item) => categoryCode(item) === "AMATOR").length,
    junior: registrationsState.filter((item) => categoryCode(item) === "JUNIOR").length,
    minors: registrationsState.filter((item) => item.guardian_required).length,
  };

  dashboardGrid.innerHTML = [
    ["Wszystkie", counts.total],
    ["Oczekujące", counts.pending],
    ["Zaakceptowane", counts.accepted],
    ["Odrzucone", counts.rejected],
    ["Rezerwowa", counts.waitlist],
    ["PRO", counts.pro],
    ["AMATOR", counts.amator],
    ["JUNIOR", counts.junior],
    ["Niepełnoletni", counts.minors],
  ].map(([label, value]) => `
    <article class="dashboard-tile">
      <strong>${value}</strong>
      <span>${label}</span>
    </article>
  `).join("");
}

function renderEventOptions() {
  const seen = new Map();
  registrationsState.forEach((registration) => {
    seen.set(eventKey(registration), eventName(registration));
  });
  const selected = adminEventFilter.value;
  adminEventFilter.innerHTML = '<option value="">Wszystkie</option>' + [...seen.entries()]
    .map(([key, name]) => `<option value="${escapeHtml(key)}">${escapeHtml(name)}</option>`)
    .join("");
  adminEventFilter.value = seen.has(selected) ? selected : "";
}

function renderRegistrations() {
  const rows = filteredRegistrations();
  if (!rows.length) {
    registrationsTable.innerHTML = '<tr><td colspan="11">Brak danych do wyświetlenia dla wybranych filtrów.</td></tr>';
    return;
  }

  registrationsTable.innerHTML = rows.map((registration) => `
    <tr>
      <td>${escapeHtml(formatDate(registration.created_at))}</td>
      <td><strong>${escapeHtml(registration.first_name)} ${escapeHtml(registration.last_name)}</strong></td>
      <td>${escapeHtml(categoryCode(registration))}</td>
      <td>${escapeHtml(eventName(registration))}</td>
      <td><span class="status-chip status-${escapeHtml(registration.status)}">${escapeHtml(statusLabel(registration.status))}</span></td>
      <td>${escapeHtml(registration.birth_date || "-")}<br><small>${escapeHtml(ageAtEvent(registration))} lat</small></td>
      <td>${escapeHtml(registration.city || "-")}<br><small>${escapeHtml(registration.country || "")}</small></td>
      <td>${escapeHtml(registration.club_team || "-")}</td>
      <td><span>${escapeHtml(registration.email || "")}</span><br><span>${escapeHtml(registration.phone || "")}</span></td>
      <td>${registration.guardian_required ? "Tak" : "Nie"}</td>
      <td><button class="secondary-btn table-action" type="button" data-registration-id="${escapeHtml(registration.id)}">Szczegóły</button></td>
    </tr>
  `).join("");
}

function renderAll() {
  renderDashboard();
  renderEventOptions();
  renderRegistrations();
}

async function loadRegistrations() {
  try {
    const response = await fetch("/api/registrations", { headers: authHeaders() });
    const payload = await response.json();
    if (response.status === 403 || response.status === 401) {
      clearSession();
      showLogin("Sesja wygasła. Zaloguj się ponownie.");
      return;
    }
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się pobrać zgłoszeń.");
    registrationsState = payload.registrations || [];
    setMessage(adminMessage, `Załadowano zgłoszeń: ${registrationsState.length}`, "success");
    renderAll();
  } catch (error) {
    setMessage(adminMessage, error.message || "Nie udało się pobrać zgłoszeń.", "error");
    renderRegistrations();
  }
}

function eventTypeLabel(type) {
  return {
    polish_cup: "Puchar Polski",
    polish_championship: "Mistrzostwa Polski",
    other: "Inne",
  }[type] || type || "-";
}

function eventStatusLabel(status) {
  return {
    planned: "Planowane",
    registration_open: "Zapisy otwarte",
    registration_closed: "Zapisy zamknięte",
    cancelled: "Odwołane",
    finished: "Zakończone",
  }[status] || status || "-";
}

async function loadEvents() {
  const response = await fetch("/api/events", { headers: authHeaders() });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się pobrać wydarzeń.");
  eventsState = payload.events || [];
  renderEventsManagement();
  renderEventSelects();
}

function renderEventsManagement() {
  if (!eventsList) return;
  if (!eventsState.length) {
    eventsList.innerHTML = '<p class="form-message">Brak danych do wyświetlenia.</p>';
    return;
  }

  eventsList.innerHTML = eventsState.map((event) => `
    <button class="management-item" type="button" data-event-id="${escapeHtml(event.id)}">
      <strong>${escapeHtml(event.name)}</strong>
      <span>${escapeHtml(eventTypeLabel(event.type))} · ${escapeHtml(formatDate(event.startsAt))} · <mark>${escapeHtml(eventStatusLabel(event.status))}</mark></span>
      <small>${escapeHtml(event.city || "-")} · limit: ${escapeHtml(event.capacityTotal ?? "-")}</small>
    </button>
  `).join("");
}

function renderEventSelects() {
  const options = eventsState.map((event) => `<option value="${escapeHtml(event.id)}">${escapeHtml(event.name)}</option>`).join("");
  [categoryEventSelect, consentEventSelect, startListEventSelect].forEach((select) => {
    if (!select) return;
    const selected = select.value;
    select.innerHTML = options;
    if (eventsState.some((event) => event.id === selected)) select.value = selected;
  });
}

async function loadStartListCategories() {
  if (!startListEventSelect || !startListCategorySelect) return;
  const eventId = startListEventSelect.value || eventsState[0]?.id;
  if (!eventId) {
    startListCategoriesState = [];
    startListCategorySelect.innerHTML = "";
    renderStartList();
    return;
  }

  const response = await fetch(`/api/categories?eventId=${encodeURIComponent(eventId)}`, { headers: authHeaders() });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się pobrać kategorii.");

  startListCategoriesState = payload.categories || [];
  const selected = startListCategorySelect.value;
  startListCategorySelect.innerHTML = startListCategoriesState
    .map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.code)} · ${escapeHtml(category.name)}</option>`)
    .join("");
  if (startListCategoriesState.some((category) => category.id === selected)) startListCategorySelect.value = selected;
  else if (startListCategoriesState[0]) startListCategorySelect.value = startListCategoriesState[0].id;
}

async function loadStartList() {
  if (!startListEventSelect || !startListCategorySelect) return;
  const eventId = startListEventSelect.value;
  const categoryId = startListCategorySelect.value;
  if (!eventId || !categoryId) {
    startListState = [];
    renderStartList();
    setMessage(startListMessage, "Wybierz wydarzenie i kategorię.", "info");
    return;
  }

  try {
    setMessage(startListMessage, "Ładuję listę startową...", "info");
    const params = new URLSearchParams({ eventId, categoryId });
    const response = await fetch(`/api/start-list?${params}`, { headers: authHeaders() });
    const payload = await response.json();
    if (response.status === 403 || response.status === 401) {
      clearSession();
      showLogin("Sesja wygasła. Zaloguj się ponownie.");
      return;
    }
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się pobrać listy.");
    startListState = payload.registrations || [];
    renderStartList();
    setMessage(startListMessage, `Załadowano zawodników: ${startListState.length}`, "success");
  } catch (error) {
    setMessage(startListMessage, error.message || "Nie udało się pobrać listy.", "error");
    renderStartList();
  }
}

function renderStartList() {
  if (!startListTable) return;
  if (!startListState.length) {
    startListTable.innerHTML = '<tr><td colspan="7">Brak zaakceptowanych zawodników w tej kategorii. Lista startowa jest pusta.</td></tr>';
    return;
  }

  const sorted = [...startListState].sort((first, second) => {
    const firstOrder = Number(first.startOrder || 999999);
    const secondOrder = Number(second.startOrder || 999999);
    if (firstOrder !== secondOrder) return firstOrder - secondOrder;
    return `${first.lastName} ${first.firstName}`.localeCompare(`${second.lastName} ${second.firstName}`, "pl");
  });

  startListTable.innerHTML = sorted.map((registration) => `
    <tr>
      <td><input class="compact-input" type="number" min="1" inputmode="numeric" value="${escapeHtml(registration.startOrder || "")}" data-start-order-id="${escapeHtml(registration.id)}" aria-label="Kolejność startowa ${escapeHtml(registration.fullName)}" /></td>
      <td><input class="compact-input" value="${escapeHtml(registration.bibNumber || "")}" data-bib-id="${escapeHtml(registration.id)}" aria-label="Numer startowy ${escapeHtml(registration.fullName)}" /></td>
      <td><strong>${escapeHtml(registration.fullName)}</strong><br><small>${escapeHtml(registration.birthDate || "-")} · ${escapeHtml(registration.age || "-")} lat · ${escapeHtml(registration.category?.code || "")}</small></td>
      <td>${escapeHtml(registration.city || "-")}<br><small>${escapeHtml(registration.country || "")}</small></td>
      <td>${escapeHtml(registration.clubTeam || "-")}</td>
      <td><span class="status-chip checkin-${escapeHtml(registration.checkinStatus || "not_checked_in")}">${escapeHtml(checkinLabel(registration.checkinStatus))}</span></td>
      <td>${escapeHtml(registration.phone || "-")}<br><small>${escapeHtml(registration.email || "")}</small></td>
    </tr>
  `).join("");
}

function assignStartOrder(mode) {
  if (!startListState.length) return;
  const rows = [...startListState];
  if (mode === "name") {
    rows.sort((first, second) => `${first.lastName} ${first.firstName}`.localeCompare(`${second.lastName} ${second.firstName}`, "pl"));
  } else if (mode === "random") {
    rows.sort(() => Math.random() - 0.5);
  } else {
    rows.sort((first, second) => new Date(first.createdAt || 0) - new Date(second.createdAt || 0));
  }
  rows.forEach((registration, index) => {
    registration.startOrder = index + 1;
  });
  startListState = rows;
  renderStartList();
}

async function saveStartOrder() {
  const eventId = startListEventSelect.value;
  const categoryId = startListCategorySelect.value;
  const list = startListState.map((registration) => {
    const orderInput = startListTable.querySelector(`[data-start-order-id="${CSS.escape(registration.id)}"]`);
    const bibInput = startListTable.querySelector(`[data-bib-id="${CSS.escape(registration.id)}"]`);
    return {
      registrationId: registration.id,
      startOrder: orderInput?.value || null,
      bibNumber: bibInput?.value || null,
    };
  });

  try {
    setMessage(startListMessage, "Zapisuję kolejność...", "info");
    const response = await fetch("/api/start-order", {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ eventId, categoryId, list }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się zapisać kolejności.");
    await loadStartList();
    setMessage(startListMessage, `Zapisano kolejność dla zawodników: ${payload.updated}`, "success");
  } catch (error) {
    setMessage(startListMessage, error.message || "Nie udało się zapisać kolejności.", "error");
  }
}

async function exportStartListCsv() {
  const eventId = startListEventSelect.value;
  const categoryId = startListCategorySelect.value;
  if (!eventId || !categoryId) {
    setMessage(startListMessage, "Wybierz wydarzenie i kategorię.", "error");
    return;
  }

  try {
    const params = new URLSearchParams({ eventId, categoryId });
    const response = await fetch(`/api/start-list-export?${params}`, { headers: authHeaders() });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Nie udało się pobrać CSV.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bmx-freestyle-lista-startowa.csv";
    link.click();
    URL.revokeObjectURL(url);
    setMessage(startListMessage, "Eksport listy startowej pobrany.", "success");
  } catch (error) {
    setMessage(startListMessage, error.message || "Nie udało się pobrać CSV.", "error");
  }
}

function resetEventForm() {
  eventForm.reset();
  eventForm.elements.id.value = "";
  eventForm.elements.status.value = "planned";
  eventForm.elements.type.value = "polish_cup";
  eventForm.elements.juniorMaxAge.value = "15";
  eventForm.elements.requireLicenseForPro.checked = true;
  setMessage(eventMessage, "Tworzysz nowe wydarzenie.", "info");
}

function fillEventForm(event) {
  eventForm.elements.id.value = event.id || "";
  eventForm.elements.slug.value = event.slug || "";
  eventForm.elements.name.value = event.name || "";
  eventForm.elements.type.value = event.type || "other";
  eventForm.elements.roundNumber.value = event.roundNumber ?? "";
  eventForm.elements.startsAt.value = formatDateTimeLocal(event.startsAt);
  eventForm.elements.endsAt.value = formatDateTimeLocal(event.endsAt);
  eventForm.elements.city.value = event.city || "";
  eventForm.elements.venue.value = event.venue || "";
  eventForm.elements.status.value = event.status || "planned";
  eventForm.elements.capacityTotal.value = event.capacityTotal ?? "";
  eventForm.elements.registrationStartsAt.value = formatDateTimeLocal(event.registrationStartsAt);
  eventForm.elements.registrationEndsAt.value = formatDateTimeLocal(event.registrationEndsAt);
  eventForm.elements.juniorMaxAge.value = event.settings?.juniorMaxAge ?? 15;
  eventForm.elements.requireLicenseForPro.checked = event.settings?.requireLicenseForPro !== false;
  eventForm.elements.rulesUrl.value = event.rulesUrl || "";
  eventForm.elements.description.value = event.description || "";
  eventForm.elements.organizerMessage.value = event.organizerMessage || "";
  eventForm.elements.rulesBody.value = event.rulesBody || "";
  setMessage(eventMessage, "Edytujesz wydarzenie.", "info");
}

function eventFormPayload() {
  return {
    id: valueOrNull(eventForm.elements.id.value),
    slug: eventForm.elements.slug.value.trim(),
    name: eventForm.elements.name.value.trim(),
    type: eventForm.elements.type.value,
    roundNumber: numberOrNull(eventForm.elements.roundNumber.value),
    startsAt: valueOrNull(eventForm.elements.startsAt.value),
    endsAt: valueOrNull(eventForm.elements.endsAt.value),
    city: eventForm.elements.city.value.trim(),
    venue: eventForm.elements.venue.value.trim(),
    description: valueOrNull(eventForm.elements.description.value),
    status: eventForm.elements.status.value,
    registrationStartsAt: valueOrNull(eventForm.elements.registrationStartsAt.value),
    registrationEndsAt: valueOrNull(eventForm.elements.registrationEndsAt.value),
    capacityTotal: numberOrNull(eventForm.elements.capacityTotal.value),
    rulesUrl: valueOrNull(eventForm.elements.rulesUrl.value),
    rulesBody: valueOrNull(eventForm.elements.rulesBody.value),
    organizerMessage: valueOrNull(eventForm.elements.organizerMessage.value),
    settings: {
      juniorMaxAge: numberOrNull(eventForm.elements.juniorMaxAge.value) ?? 15,
      requireLicenseForPro: eventForm.elements.requireLicenseForPro.checked,
    },
  };
}

async function handleEventSubmit(eventSubmit) {
  eventSubmit.preventDefault();
  setMessage(eventMessage, "Zapisuję wydarzenie...", "info");
  const payload = eventFormPayload();
  const response = await fetch("/api/events", {
    method: payload.id ? "PATCH" : "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    setMessage(eventMessage, result.error || "Nie udało się zapisać wydarzenia.", "error");
    return;
  }
  const index = eventsState.findIndex((item) => item.id === result.event.id);
  if (index >= 0) eventsState[index] = result.event;
  else eventsState.push(result.event);
  renderEventsManagement();
  renderEventSelects();
  fillEventForm(result.event);
  setMessage(eventMessage, "Wydarzenie zapisane.", "success");
}

async function loadCategoriesForSelectedEvent() {
  const eventId = categoryEventSelect.value || eventsState[0]?.id;
  if (!eventId) {
    categoriesState = [];
    renderCategoriesManagement();
    return;
  }
  categoryForm.elements.eventId.value = eventId;
  const response = await fetch(`/api/categories?eventId=${encodeURIComponent(eventId)}&includeInactive=true`, { headers: authHeaders() });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się pobrać kategorii.");
  categoriesState = payload.categories || [];
  renderCategoriesManagement();
}

function renderCategoriesManagement() {
  if (!categoriesList) return;
  categoriesList.innerHTML = categoriesState.length ? categoriesState.map((category) => `
    <button class="management-item" type="button" data-category-id="${escapeHtml(category.id)}">
      <strong>${escapeHtml(category.code)} · ${escapeHtml(category.name)}</strong>
      <span><mark>${category.isActive ? "Aktywna" : "Nieaktywna"}</mark> · limit: ${escapeHtml(category.capacity ?? "-")} · sort: ${escapeHtml(category.sortOrder ?? 0)}</span>
      <small>${category.requiresLicense ? "Wymaga licencji" : "Bez licencji"} · zakres wieku: ${escapeHtml(category.ageMin ?? "-")} - ${escapeHtml(category.ageMax ?? "-")}</small>
    </button>
  `).join("") : '<p class="form-message">Brak danych do wyświetlenia dla tego wydarzenia.</p>';
}

function resetCategoryForm() {
  categoryForm.reset();
  categoryForm.elements.id.value = "";
  categoryForm.elements.eventId.value = categoryEventSelect.value || "";
  categoryForm.elements.genderScope.value = "open";
  categoryForm.elements.sortOrder.value = "0";
  categoryForm.elements.isActive.checked = true;
  setMessage(categoryMessage, "Tworzysz nową kategorię.", "info");
}

function fillCategoryForm(category) {
  categoryForm.elements.id.value = category.id || "";
  categoryForm.elements.eventId.value = category.eventId || categoryEventSelect.value || "";
  categoryForm.elements.code.value = category.code || "";
  categoryForm.elements.name.value = category.name || "";
  categoryForm.elements.sortOrder.value = category.sortOrder ?? 0;
  categoryForm.elements.capacity.value = category.capacity ?? "";
  categoryForm.elements.ageMin.value = category.ageMin ?? "";
  categoryForm.elements.ageMax.value = category.ageMax ?? "";
  categoryForm.elements.genderScope.value = category.genderScope || "open";
  categoryForm.elements.requiresLicense.checked = Boolean(category.requiresLicense);
  categoryForm.elements.isActive.checked = category.isActive !== false;
  categoryForm.elements.description.value = category.description || "";
  setMessage(categoryMessage, "Edytujesz kategorię.", "info");
}

function categoryFormPayload() {
  return {
    id: valueOrNull(categoryForm.elements.id.value),
    eventId: categoryForm.elements.eventId.value,
    code: categoryForm.elements.code.value.trim(),
    name: categoryForm.elements.name.value.trim(),
    description: valueOrNull(categoryForm.elements.description.value),
    sortOrder: numberOrNull(categoryForm.elements.sortOrder.value) ?? 0,
    capacity: numberOrNull(categoryForm.elements.capacity.value),
    isActive: categoryForm.elements.isActive.checked,
    genderScope: categoryForm.elements.genderScope.value,
    ageMin: numberOrNull(categoryForm.elements.ageMin.value),
    ageMax: numberOrNull(categoryForm.elements.ageMax.value),
    requiresLicense: categoryForm.elements.requiresLicense.checked,
  };
}

async function handleCategorySubmit(eventSubmit) {
  eventSubmit.preventDefault();
  setMessage(categoryMessage, "Zapisuję kategorię...", "info");
  const payload = categoryFormPayload();
  const response = await fetch("/api/categories", {
    method: payload.id ? "PATCH" : "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    setMessage(categoryMessage, result.error || "Nie udało się zapisać kategorii.", "error");
    return;
  }
  await loadCategoriesForSelectedEvent();
  fillCategoryForm(result.category);
  setMessage(categoryMessage, "Kategoria zapisana.", "success");
}

async function loadConsentsForSelectedEvent() {
  const eventId = consentEventSelect.value || eventsState[0]?.id;
  if (!eventId) {
    consentsState = [];
    renderConsentsManagement();
    return;
  }
  consentForm.elements.eventId.value = eventId;
  const response = await fetch(`/api/consents?eventId=${encodeURIComponent(eventId)}&includeInactive=true`, { headers: authHeaders() });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się pobrać zgód.");
  consentsState = payload.consents || [];
  renderConsentsManagement();
}

function renderConsentsManagement() {
  if (!consentsList) return;
  consentsList.innerHTML = consentsState.length ? consentsState.map((consent) => `
    <button class="management-item" type="button" data-consent-id="${escapeHtml(consent.id)}">
      <strong>${escapeHtml(consent.label)}</strong>
      <span>${escapeHtml(consent.code)} · <mark>${consent.active ? "Aktywna" : "Nieaktywna"}</mark> · ${consent.required ? "Wymagana" : "Opcjonalna"}</span>
      <small>${consent.guardianOnly ? "Tylko opiekun" : "Zawodnik/opiekun"} · ${consent.athleteAdultOnly ? "tylko pełnoletni zawodnik" : "bez ograniczenia pełnoletności"} · sort: ${escapeHtml(consent.sortOrder ?? 0)}</small>
    </button>
  `).join("") : '<p class="form-message">Brak danych do wyświetlenia dla tego wydarzenia.</p>';
}

function resetConsentForm() {
  consentForm.reset();
  consentForm.elements.id.value = "";
  consentForm.elements.eventId.value = consentEventSelect.value || "";
  consentForm.elements.sortOrder.value = "0";
  consentForm.elements.required.checked = true;
  consentForm.elements.active.checked = true;
  setMessage(consentMessage, "Tworzysz nową zgodę.", "info");
}

function fillConsentForm(consent) {
  consentForm.elements.id.value = consent.id || "";
  consentForm.elements.eventId.value = consent.eventId || consentEventSelect.value || "";
  consentForm.elements.code.value = consent.code || "";
  consentForm.elements.label.value = consent.label || "";
  consentForm.elements.sortOrder.value = consent.sortOrder ?? 0;
  consentForm.elements.required.checked = consent.required !== false;
  consentForm.elements.guardianOnly.checked = Boolean(consent.guardianOnly);
  consentForm.elements.athleteAdultOnly.checked = Boolean(consent.athleteAdultOnly);
  consentForm.elements.active.checked = consent.active !== false;
  consentForm.elements.body.value = consent.body || "";
  setMessage(consentMessage, "Edytujesz zgodę.", "info");
}

function consentFormPayload() {
  return {
    id: valueOrNull(consentForm.elements.id.value),
    eventId: consentForm.elements.eventId.value,
    code: consentForm.elements.code.value.trim(),
    label: consentForm.elements.label.value.trim(),
    body: consentForm.elements.body.value.trim(),
    required: consentForm.elements.required.checked,
    guardianOnly: consentForm.elements.guardianOnly.checked,
    athleteAdultOnly: consentForm.elements.athleteAdultOnly.checked,
    sortOrder: numberOrNull(consentForm.elements.sortOrder.value) ?? 0,
    active: consentForm.elements.active.checked,
  };
}

async function handleConsentSubmit(eventSubmit) {
  eventSubmit.preventDefault();
  setMessage(consentMessage, "Zapisuję zgodę...", "info");
  const payload = consentFormPayload();
  const response = await fetch("/api/consents", {
    method: payload.id ? "PATCH" : "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    setMessage(consentMessage, result.error || "Nie udało się zapisać zgody.", "error");
    return;
  }
  await loadConsentsForSelectedEvent();
  fillConsentForm(result.consent);
  setMessage(consentMessage, "Zgoda zapisana.", "success");
}

async function loadConfiguration() {
  try {
    await loadEvents();
    if (eventsState[0]) {
      categoryEventSelect.value ||= eventsState[0].id;
      consentEventSelect.value ||= eventsState[0].id;
      startListEventSelect.value ||= eventsState[0].id;
      categoryForm.elements.eventId.value = categoryEventSelect.value;
      consentForm.elements.eventId.value = consentEventSelect.value;
      await Promise.all([loadCategoriesForSelectedEvent(), loadConsentsForSelectedEvent()]);
      await loadStartListCategories();
      await loadStartList();
    }
    if (eventsState[0]) fillEventForm(eventsState[0]);
    resetCategoryForm();
    resetConsentForm();
  } catch (error) {
    setMessage(adminMessage, error.message || "Nie udało się pobrać konfiguracji.", "error");
  }
}

function showLogin(message = "") {
  loginView.hidden = false;
  adminView.hidden = true;
  logoutButton.hidden = true;
  if (message) setMessage(loginMessage, message, "error");
}

function showAdmin() {
  loginView.hidden = true;
  adminView.hidden = false;
  logoutButton.hidden = false;
  showPanel();
}

function clearSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  currentUser = null;
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
    currentUser = payload.user;
    showAdmin();
    await Promise.all([loadRegistrations(), loadConfiguration()]);
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
      body: JSON.stringify({
        login: data.get("login"),
        password: data.get("password"),
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się zalogować.");

    localStorage.setItem(ADMIN_TOKEN_KEY, payload.token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(payload.user));
    currentUser = payload.user;
    setMessage(loginMessage, "Zalogowano.", "success");
    showAdmin();
    await Promise.all([loadRegistrations(), loadConfiguration()]);
  } catch (error) {
    setMessage(loginMessage, error.message || "Nie udało się zalogować.", "error");
  }
}

function consentRows(registration) {
  const consents = Array.isArray(registration.consents) ? registration.consents : [];
  if (!consents.length) return "<p>Brak zapisanych zgód.</p>";
  return `
    <div class="detail-list">
      ${consents.map((consent) => `
        <p><strong>${escapeHtml(consent.code)}</strong><span>${consent.accepted ? "zaakceptowana" : "niezaakceptowana"} · ${escapeHtml(consent.acceptedBy || "-")} · ${escapeHtml(consent.acceptedAt ? formatDate(consent.acceptedAt) : "-")}</span></p>
      `).join("")}
    </div>
  `;
}

function openDetails(registration) {
  const event = eventData(registration);
  const age = ageAtEvent(registration);
  const requiresLicense = Boolean(registration.event_categories?.requires_license || categoryCode(registration) === "PRO");
  const juniorMax = registration.event_categories?.age_max;
  const juniorOk = categoryCode(registration) !== "JUNIOR" || !Number.isFinite(Number(juniorMax)) || Number(age) <= Number(juniorMax);

  registrationDetails.innerHTML = `
    <div class="modal-header">
      <p class="eyebrow">Szczegóły zgłoszenia</p>
      <h2>${escapeHtml(registration.first_name)} ${escapeHtml(registration.last_name)}</h2>
      <span class="status-chip status-${escapeHtml(registration.status)}">${escapeHtml(statusLabel(registration.status))}</span>
    </div>
    <div class="details-grid">
      <section>
        <h3>Wydarzenie</h3>
        <div class="detail-list">
          <p><strong>Nazwa</strong><span>${escapeHtml(event.name || "-")}</span></p>
          <p><strong>Data</strong><span>${escapeHtml(formatDate(event.starts_at))}</span></p>
          <p><strong>Miasto</strong><span>${escapeHtml(event.city || "-")}</span></p>
          <p><strong>Venue</strong><span>${escapeHtml(event.venue || "-")}</span></p>
        </div>
      </section>
      <section>
        <h3>Zawodnik</h3>
        <div class="detail-list">
          <p><strong>Data urodzenia</strong><span>${escapeHtml(registration.birth_date)} (${escapeHtml(age)} lat)</span></p>
          <p><strong>E-mail</strong><span>${escapeHtml(registration.email)}</span></p>
          <p><strong>Telefon</strong><span>${escapeHtml(registration.phone)}</span></p>
          <p><strong>Miasto / kraj</strong><span>${escapeHtml(registration.city || "-")} / ${escapeHtml(registration.country || "-")}</span></p>
          <p><strong>Płeć</strong><span>${escapeHtml(registration.gender || "-")}</span></p>
          <p><strong>Klub/team</strong><span>${escapeHtml(registration.club_team || "-")}</span></p>
        </div>
      </section>
      <section>
        <h3>Kategoria</h3>
        <div class="detail-list">
          <p><strong>Kategoria</strong><span>${escapeHtml(categoryName(registration))}</span></p>
          <p><strong>Licencja wymagana</strong><span>${requiresLicense ? "Tak" : "Nie"}</span></p>
          <p><strong>Warunek Junior</strong><span>${juniorOk ? "Spełniony / nie dotyczy" : "Niespełniony"}</span></p>
        </div>
      </section>
      <section>
        <h3>Licencja</h3>
        <div class="detail-list">
          <p><strong>Numer licencji UCI / PZKol</strong><span>${escapeHtml(registration.license_number || "-")}</span></p>
        </div>
      </section>
      <section>
        <h3>Opiekun</h3>
        <div class="detail-list">
          <p><strong>Wymagany</strong><span>${registration.guardian_required ? "Tak" : "Nie"}</span></p>
          <p><strong>Imię i nazwisko</strong><span>${escapeHtml(registration.guardian_full_name || "-")}</span></p>
          <p><strong>E-mail</strong><span>${escapeHtml(registration.guardian_email || "-")}</span></p>
          <p><strong>Telefon</strong><span>${escapeHtml(registration.guardian_phone || "-")}</span></p>
          <p><strong>Relacja</strong><span>${escapeHtml(registration.guardian_relationship || "-")}</span></p>
        </div>
      </section>
      <section>
        <h3>Zgody</h3>
        ${consentRows(registration)}
      </section>
    </div>
    <section class="status-editor">
      <h3>Status zgłoszenia</h3>
      <form id="statusForm">
        <input type="hidden" name="id" value="${escapeHtml(registration.id)}" />
        <label>Nowy status
          <select name="status">
            ${["pending_review", "accepted", "needs_info", "rejected", "waitlist"].map((status) => `<option value="${status}" ${registration.status === status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}
          </select>
        </label>
        <label>Notatka organizatora
          <textarea name="statusNote" rows="4" placeholder="Krótki komunikat, który może trafić do maila statusowego">${escapeHtml(registration.status_note || "")}</textarea>
        </label>
        <button class="primary-btn" type="submit">Zapisz status</button>
        <p class="form-message" id="statusMessage" role="status"></p>
      </form>
    </section>
  `;

  registrationDetails.querySelector("#statusForm").addEventListener("submit", handleStatusSubmit);
  modal.classList.add("is-open");
  if (typeof modal.showModal === "function") {
    try {
      modal.showModal();
    } catch (error) {
      modal.setAttribute("open", "");
    }
  } else {
    modal.setAttribute("open", "");
  }
}

async function handleStatusSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const statusMessage = form.querySelector("#statusMessage");
  const data = new FormData(form);
  setMessage(statusMessage, "Zapisuję status...", "info");

  try {
    const response = await fetch("/api/registrations", {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        id: data.get("id"),
        status: data.get("status"),
        statusNote: data.get("statusNote"),
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się zmienić statusu.");

    const index = registrationsState.findIndex((item) => item.id === payload.registration.id);
    if (index >= 0) registrationsState[index] = payload.registration;
    setMessage(statusMessage, payload.email?.sent ? "Status zapisany i mail wysłany." : "Status zapisany. Mail pominięty lub nieskonfigurowany.", "success");
    renderAll();
  } catch (error) {
    setMessage(statusMessage, error.message || "Nie udało się zmienić statusu.", "error");
  }
}

async function exportCsv() {
  const params = new URLSearchParams();
  if (adminEventFilter.value) params.set("eventId", adminEventFilter.value);
  if (adminCategoryFilter.value) params.set("category", adminCategoryFilter.value);
  if (adminStatusFilter.value) params.set("status", adminStatusFilter.value);
  const query = params.toString();

  try {
    const response = await fetch(`/api/export${query ? `?${query}` : ""}`, { headers: authHeaders() });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Nie udało się przygotować eksportu.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bmx-freestyle-zgloszenia.csv";
    link.click();
    URL.revokeObjectURL(url);
    setMessage(adminMessage, "Eksport CSV pobrany.", "success");
  } catch (error) {
    setMessage(adminMessage, error.message || "Nie udało się pobrać CSV.", "error");
  }
}

loginForm.addEventListener("submit", handleLogin);
logoutButton.addEventListener("click", () => {
  clearSession();
  showLogin("Wylogowano.");
});

[adminSearch, adminEventFilter, adminStatusFilter, adminCategoryFilter, minorOnlyFilter, proOnlyFilter, actionOnlyFilter].forEach((control) => {
  control?.addEventListener("input", renderRegistrations);
  control?.addEventListener("change", renderRegistrations);
});

registrationsTable.addEventListener("click", (event) => {
  const button = event.target.closest("[data-registration-id]");
  if (!button) return;
  const registration = registrationsState.find((item) => item.id === button.dataset.registrationId);
  if (registration) openDetails(registration);
});

refreshButton.addEventListener("click", loadRegistrations);
exportButton.addEventListener("click", exportCsv);
modalCloseButton.addEventListener("click", () => modal.close());
modal.addEventListener("close", () => modal.classList.remove("is-open"));

newEventButton.addEventListener("click", resetEventForm);
refreshEventsButton.addEventListener("click", loadConfiguration);
eventForm.addEventListener("submit", handleEventSubmit);
eventsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-event-id]");
  if (!button) return;
  const selected = eventsState.find((item) => item.id === button.dataset.eventId);
  if (selected) fillEventForm(selected);
});

categoryEventSelect.addEventListener("change", async () => {
  await loadCategoriesForSelectedEvent();
  resetCategoryForm();
});
newCategoryButton.addEventListener("click", resetCategoryForm);
categoryForm.addEventListener("submit", handleCategorySubmit);
categoriesList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category-id]");
  if (!button) return;
  const selected = categoriesState.find((item) => item.id === button.dataset.categoryId);
  if (selected) fillCategoryForm(selected);
});

consentEventSelect.addEventListener("change", async () => {
  await loadConsentsForSelectedEvent();
  resetConsentForm();
});
newConsentButton.addEventListener("click", resetConsentForm);
consentForm.addEventListener("submit", handleConsentSubmit);
consentsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-consent-id]");
  if (!button) return;
  const selected = consentsState.find((item) => item.id === button.dataset.consentId);
  if (selected) fillConsentForm(selected);
});

startListEventSelect?.addEventListener("change", async () => {
  try {
    await loadStartListCategories();
    await loadStartList();
  } catch (error) {
    setMessage(startListMessage, error.message || "Nie udało się załadować listy.", "error");
  }
});
startListCategorySelect?.addEventListener("change", loadStartList);
startListRefreshButton?.addEventListener("click", loadStartList);
orderByCreatedButton?.addEventListener("click", () => assignStartOrder("created"));
orderByNameButton?.addEventListener("click", () => assignStartOrder("name"));
orderRandomButton?.addEventListener("click", () => assignStartOrder("random"));
saveStartOrderButton?.addEventListener("click", saveStartOrder);
exportStartListButton?.addEventListener("click", exportStartListCsv);

verifySession();
