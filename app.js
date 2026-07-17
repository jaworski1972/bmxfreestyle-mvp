const app = document.querySelector("#app");

const SHOW_HOMEPAGE_EVENTS = false;
const SHOW_HOMEPAGE_FLOW = false;
const SHOW_HOMEPAGE_CATEGORIES = false;

const fallbackEvent = {
  id: "seed-event",
  slug: "puchar-polski-bmx-freestyle-runda-1",
  name: "Puchar Polski BMX Freestyle — Runda 1",
  type: "polish_cup",
  roundNumber: 1,
  startsAt: "2027-05-24T09:00:00+02:00",
  endsAt: "2027-05-25T18:00:00+02:00",
  city: "Warszawa",
  venue: "Skatepark Warszawa",
  description: "Pierwsza runda Pucharu Polski BMX Freestyle w sezonie 2027.",
  status: "registration_open",
  registrationStartsAt: null,
  registrationEndsAt: null,
  capacityTotal: 120,
  rulesUrl: "",
  rulesBody: "",
  organizerMessage: "Zapisy są otwarte. Organizator potwierdzi przyjęcie zgłoszenia po weryfikacji danych.",
  settings: { juniorMaxAge: 15, requireLicenseForPro: true },
};

const fallbackCategories = [
  {
    id: "seed-category-pro",
    eventId: "seed-event",
    code: "PRO",
    name: "PRO",
    description: "Dla zawodników z licencją PZKol, UCI lub federacji krajowej.",
    ageMin: 16,
    ageMax: null,
    requiresLicense: true,
  },
  {
    id: "seed-category-amator",
    eventId: "seed-event",
    code: "AMATOR",
    name: "AMATOR",
    description: "Otwarta kategoria dla riderów bez licencji.",
    ageMin: 16,
    ageMax: null,
    requiresLicense: false,
  },
  {
    id: "seed-category-junior",
    eventId: "seed-event",
    code: "JUNIOR",
    name: "JUNIOR",
    description: "Dla młodszych zawodników. Granica wieku jest ustawieniem wydarzenia.",
    ageMin: null,
    ageMax: 15,
    requiresLicense: false,
  },
];

const fallbackConsents = [
  {
    id: "seed-consent-rules",
    code: "rules_acceptance",
    label: "Akceptacja regulaminu",
    body: "Potwierdzam zapoznanie się z regulaminem zawodów BMX Freestyle Polska i akceptuję jego postanowienia.",
    required: true,
    guardianOnly: false,
    athleteAdultOnly: false,
    sortOrder: 1,
    active: true,
  },
  {
    id: "seed-consent-health",
    code: "health_statement",
    label: "Oświadczenie o stanie zdrowia",
    body: "Oświadczam, że zawodnik nie ma przeciwwskazań zdrowotnych do udziału w zawodach BMX Freestyle.",
    required: true,
    guardianOnly: false,
    athleteAdultOnly: false,
    sortOrder: 2,
    active: true,
  },
  {
    id: "seed-consent-gdpr",
    code: "gdpr",
    label: "Zgoda RODO",
    body: "Potwierdzam zapoznanie się z informacją o przetwarzaniu danych osobowych na potrzeby organizacji zawodów.",
    required: true,
    guardianOnly: false,
    athleteAdultOnly: false,
    sortOrder: 3,
    active: true,
  },
  {
    id: "seed-consent-image",
    code: "image",
    label: "Zgoda na wizerunek",
    body: "Wyrażam zgodę na wykorzystanie wizerunku zawodnika w materiałach informacyjnych i promocyjnych organizatora.",
    required: true,
    guardianOnly: false,
    athleteAdultOnly: false,
    sortOrder: 4,
    active: true,
  },
  {
    id: "seed-consent-guardian",
    code: "guardian_participation",
    label: "Zgoda opiekuna dla niepełnoletnich",
    body: "Jako rodzic lub opiekun prawny wyrażam zgodę na udział niepełnoletniego zawodnika w zawodach.",
    required: true,
    guardianOnly: true,
    athleteAdultOnly: false,
    sortOrder: 5,
    active: true,
  },
];

const routes = [
  { pattern: /^\/$/, render: renderHome },
  { pattern: /^\/zawody\/?$/, render: renderEvents },
  { pattern: /^\/zawody\/([^/]+)\/?$/, render: (_, slug) => renderEventDetails(slug) },
  { pattern: /^\/zapisy\/([^/]+)\/?$/, render: (_, slug) => renderSignupPlaceholder(slug) },
  { pattern: /^\/potwierdz\/?$/, render: renderConfirmationPlaceholder },
  { pattern: /^\/regulamin\/?$/, render: renderRules },
  { pattern: /^\/faq\/?$/, render: renderFaq },
  { pattern: /^\/wyniki\/?$/, render: renderResults },
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[character]);
}

function formatDateRange(event) {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  const formatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  if (!Number.isNaN(start.getTime()) && end && !Number.isNaN(end.getTime())) {
    return `${formatter.format(start)} – ${formatter.format(end)}`;
  }
  return Number.isNaN(start.getTime()) ? "Termin wkrótce" : formatter.format(start);
}

function statusLabel(status) {
  return {
    planned: "Planowane",
    registration_open: "Zapisy otwarte",
    registration_closed: "Zapisy zamknięte",
    cancelled: "Odwołane",
    finished: "Zakończone",
  }[status] || status;
}

function statusClass(status) {
  return `status-${String(status || "planned").replaceAll("_", "-")}`;
}

function categoryChips(categories = fallbackCategories) {
  return categories.map((category) => `<span class="category-chip">${escapeHtml(category.code)}</span>`).join("");
}

function registrationClosedReason(event, now = new Date()) {
  if (event.status !== "registration_open") return "Zapisy na to wydarzenie nie są obecnie otwarte.";
  const startsAt = event.registrationStartsAt || event.registration_starts_at;
  const endsAt = event.registrationEndsAt || event.registration_ends_at;
  const startDate = startsAt ? new Date(startsAt) : null;
  const endDate = endsAt ? new Date(endsAt) : null;
  if (startDate && !Number.isNaN(startDate.getTime()) && now < startDate) return "Zapisy na to wydarzenie jeszcze się nie rozpoczęły.";
  if (endDate && !Number.isNaN(endDate.getTime()) && now > endDate) return "Termin zapisów na to wydarzenie już minął.";
  return "";
}

function eventRoundValue(event) {
  const explicitRound = Number(event.roundNumber ?? event.round_number);
  if (Number.isFinite(explicitRound)) return explicitRound;
  const match = String(event.slug || event.name || "").match(/runda[-\s]*(\d+)/i);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function eventDateValue(event) {
  const date = new Date(event.startsAt || event.starts_at || 0);
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

function sortEventsForDisplay(events) {
  return [...events].sort((first, second) => {
    const firstRound = eventRoundValue(first);
    const secondRound = eventRoundValue(second);
    if (firstRound !== secondRound) return firstRound - secondRound;
    const firstDate = eventDateValue(first);
    const secondDate = eventDateValue(second);
    if (firstDate !== secondDate) return firstDate - secondDate;
    return String(first.name || "").localeCompare(String(second.name || ""), "pl");
  });
}

function defaultHomepageEvent(events) {
  return events.find((event) => !registrationClosedReason(event)) || events[0] || fallbackEvent;
}

function preferredCategoryCode(categories) {
  return categories.some((category) => String(category.code).toUpperCase() === "AMATOR")
    ? "AMATOR"
    : String(categories[0]?.code || "AMATOR").toUpperCase();
}

async function fetchJson(url, fallback) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("API unavailable");
    return await response.json();
  } catch (error) {
    return fallback;
  }
}

async function loadEvents() {
  const payload = await fetchJson("/api/events", { ok: true, events: [fallbackEvent] });
  return sortEventsForDisplay(payload.events?.length ? payload.events : [fallbackEvent]);
}

async function loadEvent(slug) {
  const payload = await fetchJson(`/api/events?slug=${encodeURIComponent(slug)}`, {
    ok: true,
    event: fallbackEvent.slug === slug ? fallbackEvent : null,
  });
  return payload.event || (fallbackEvent.slug === slug ? fallbackEvent : null);
}

async function loadCategories(eventId) {
  const payload = await fetchJson(`/api/categories?eventId=${encodeURIComponent(eventId)}`, {
    ok: true,
    categories: fallbackCategories,
  });
  return payload.categories?.length ? payload.categories : fallbackCategories;
}

async function loadConsents(eventId) {
  const payload = await fetchJson(`/api/consents?eventId=${encodeURIComponent(eventId)}`, {
    ok: true,
    consents: fallbackConsents,
  });
  return Array.isArray(payload.consents) ? payload.consents : fallbackConsents;
}

function categoryCards() {
  const descriptions = {
    PRO: "Dla zawodników startujących z UCI ID / numerem licencji.",
    AMATOR: "Dla osób bez licencji, które chcą wystartować w zawodach.",
    JUNIOR: "Dla młodszych zawodników. W przypadku osób niepełnoletnich wymagane są dane opiekuna.",
  };

  return fallbackCategories.map((category) => `
    <article class="category-card">
      <span class="card-kicker">${category.requiresLicense ? "Licencja" : "Open"}</span>
      <strong>${category.code}</strong>
      <p>${descriptions[category.code] || category.description}</p>
      ${category.requiresLicense ? '<span class="status-pill">Licencja wymagana</span>' : '<span class="status-pill">Bez licencji</span>'}
    </article>
  `).join("");
}

async function renderHome() {
  const events = await loadEvents();
  const visibleEvents = events.length ? events : [fallbackEvent];
  const selectedEvent = defaultHomepageEvent(visibleEvents);
  const selectedCategories = await loadCategories(selectedEvent.id);
  app.innerHTML = `
    <section class="hero home-hero image-hero" aria-label="Puchar Polski BMX Freestyle">
      <picture>
        <source media="(max-width: 768px)" srcset="/assets/hero-puchar-polski-mobile.png">
        <img src="/assets/hero-puchar-polski-desktop.png" alt="Puchar Polski BMX Freestyle. Nowy standard organizacji zawodów BMX Freestyle w Polsce.">
      </picture>
    </section>
    <div class="section-glow-separator" aria-hidden="true"></div>
    <div class="home-dark-content">
      ${fastSignupSection(visibleEvents, selectedEvent, selectedCategories)}
      <div class="section-glow-separator section-glow-separator-light" aria-hidden="true"></div>
      ${SHOW_HOMEPAGE_EVENTS ? homepageEventsSection(visibleEvents) : ""}
      ${SHOW_HOMEPAGE_FLOW ? homepageFlowSection() : ""}
      ${SHOW_HOMEPAGE_CATEGORIES ? homepageCategoriesSection() : ""}
      ${faqSection({ home: true })}
    </div>
  `;
  setupFastSignup({ events: visibleEvents, initialCategories: selectedCategories });
}

function homepageEventsSection(events) {
  return `
    <section class="section homepage-optional-section">
      <div class="section-heading">
        <p class="eyebrow">Najbliższe zawody</p>
        <h2>Kalendarz rund</h2>
        <p>Wybierz właściwą rundę Pucharu Polski BMX Freestyle i przejdź do szczegółów albo formularza zapisów.</p>
      </div>
      <div class="event-list">${events.map(eventCard).join("")}</div>
    </section>
  `;
}

function homepageFlowSection() {
  return `
    <section class="section homepage-optional-section">
      <div class="section-heading">
        <p class="eyebrow">Flow zgłoszenia</p>
        <h2>Jak działa zgłoszenie?</h2>
        <p>Wysłanie formularza nie oznacza automatycznej akceptacji zgłoszenia.</p>
      </div>
      <div class="steps">
        <article class="step-card"><span>1</span><h3>Wybierz zawody</h3><p>Publiczna lista aktywnych wydarzeń pod główną domeną.</p></article>
        <article class="step-card"><span>2</span><h3>Wybierz kategorię</h3><p>PRO, AMATOR albo JUNIOR, zgodnie z konfiguracją wydarzenia.</p></article>
        <article class="step-card"><span>3</span><h3>Wypełnij formularz</h3><p>Licencja tylko dla PRO, opiekun tylko gdy wymagany.</p></article>
        <article class="step-card"><span>4</span><h3>Poczekaj na weryfikację</h3><p>Organizator potwierdzi przyjęcie lub poprosi o uzupełnienie danych.</p></article>
      </div>
    </section>
  `;
}

function homepageCategoriesSection() {
  return `
    <section class="section homepage-optional-section">
      <div class="section-heading">
        <p class="eyebrow">Kategorie startowe</p>
        <h2>PRO, AMATOR, JUNIOR</h2>
        <p>Trzy czytelne ścieżki startu: licencyjne PRO, otwarty AMATOR i JUNIOR dla młodszych zawodników.</p>
      </div>
      <div class="category-grid">${categoryCards()}</div>
    </section>
  `;
}

function fastSignupCategoryTiles(categories, selectedCode = preferredCategoryCode(categories)) {
  const shortDescriptions = {
    PRO: "Dla zawodników z UCI ID / numerem licencji.",
    AMATOR: "Dla zawodników bez licencji.",
    JUNIOR: "Dla młodszych zawodników.",
  };

  return categories.map((category) => {
    const code = String(category.code || "").toUpperCase();
    return `
      <label class="fast-category-tile">
        <input type="radio" name="fastCategory" value="${escapeHtml(code)}" ${code === selectedCode ? "checked" : ""} />
        <span>
          <strong>${escapeHtml(code)}</strong>
          <small>${escapeHtml(shortDescriptions[code] || category.description || "")}</small>
        </span>
      </label>
    `;
  }).join("");
}

function fastSignupSection(events, selectedEvent, categories) {
  const closedReason = registrationClosedReason(selectedEvent);
  const selectedCode = preferredCategoryCode(categories);
  return `
    <section class="fast-signup-section" id="fastSignup">
      <div class="fast-signup-panel">
        <div class="fast-signup-header">
          <p class="eyebrow">Szybki zapis</p>
          <h2>Zapisz się na zawody</h2>
          <p>Wybierz zawody i kategorię, a następnie przejdź do formularza zgłoszeniowego.</p>
          <small>Zgłoszenie trafia do weryfikacji organizatora. Wysłanie formularza nie oznacza automatycznej akceptacji.</small>
        </div>
        <div class="fast-signup-flow">
          <div class="fast-signup-step">
            <label for="fastEventSelect">01 Wybierz zawody</label>
            <select id="fastEventSelect">
              ${events.map((event) => `
                <option value="${escapeHtml(event.slug)}" ${event.slug === selectedEvent.slug ? "selected" : ""}>
                  ${escapeHtml(event.name)} · ${escapeHtml(statusLabel(event.status))}
                </option>
              `).join("")}
            </select>
            <span class="fast-status ${statusClass(selectedEvent.status)}" id="fastEventStatus">${escapeHtml(statusLabel(selectedEvent.status))}</span>
            <a class="fast-calendar-link" href="/zawody" data-link>Zobacz wszystkie rundy w kalendarzu</a>
          </div>
          <div class="fast-signup-step fast-category-step">
            <p class="fast-step-label">02 Wybierz kategorię</p>
            <div class="fast-category-grid" id="fastCategoryGrid">
              ${fastSignupCategoryTiles(categories, selectedCode)}
            </div>
          </div>
          <div class="fast-signup-step fast-submit-step">
            <p class="fast-step-label">03 Przejdź dalej</p>
            <button class="fast-submit-btn" id="fastSignupButton" type="button" ${closedReason ? "disabled" : ""}>Rozpocznij zapis</button>
            <p class="fast-signup-message" id="fastSignupMessage">${escapeHtml(closedReason || "Przejdziesz do formularza z wybraną kategorią.")}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function eventCard(event) {
  return `
    <article class="event-card">
      <div>
        <p class="event-meta">${formatDateRange(event)} · ${escapeHtml(event.city)} · ${escapeHtml(event.venue)}</p>
        <h3>${escapeHtml(event.name)}</h3>
        <p>${escapeHtml(event.description || "Szczegóły wydarzenia zostaną uzupełnione przez organizatora.")}</p>
        <div class="event-badges">
          <span class="status-pill ${statusClass(event.status)}">${statusLabel(event.status)}</span>
          ${categoryChips()}
        </div>
      </div>
      <div class="hero-actions">
        <a class="secondary-btn" href="/zawody/${event.slug}" data-link>Szczegóły</a>
        <a class="primary-btn" href="/zapisy/${event.slug}" data-link>Zapisz się</a>
      </div>
    </article>
  `;
}

function setupFastSignup({ events, initialCategories }) {
  const section = document.querySelector("#fastSignup");
  if (!section) return;

  const eventSelect = section.querySelector("#fastEventSelect");
  const categoryGrid = section.querySelector("#fastCategoryGrid");
  const statusElement = section.querySelector("#fastEventStatus");
  const message = section.querySelector("#fastSignupMessage");
  const submitButton = section.querySelector("#fastSignupButton");
  let selectedEvent = events.find((event) => event.slug === eventSelect.value) || events[0] || fallbackEvent;
  let selectedCategories = initialCategories.length ? initialCategories : fallbackCategories;

  function selectedCategoryCode() {
    return section.querySelector('input[name="fastCategory"]:checked')?.value || preferredCategoryCode(selectedCategories);
  }

  function updateSubmitState() {
    const closedReason = registrationClosedReason(selectedEvent);
    submitButton.disabled = Boolean(closedReason) || selectedCategories.length === 0;
    message.textContent = closedReason || (selectedCategories.length ? "Przejdziesz do formularza z wybraną kategorią." : "Brak aktywnych kategorii dla tego wydarzenia.");
    statusElement.textContent = statusLabel(selectedEvent.status);
    statusElement.className = `fast-status ${statusClass(selectedEvent.status)}`;
  }

  async function updateCategoriesForEvent() {
    selectedEvent = events.find((event) => event.slug === eventSelect.value) || selectedEvent;
    categoryGrid.innerHTML = '<p class="fast-signup-message">Ładuję kategorie...</p>';
    selectedCategories = await loadCategories(selectedEvent.id);
    categoryGrid.innerHTML = fastSignupCategoryTiles(selectedCategories);
    updateSubmitState();
  }

  eventSelect.addEventListener("change", updateCategoriesForEvent);
  submitButton.addEventListener("click", () => {
    if (submitButton.disabled) return;
    const target = `/zapisy/${selectedEvent.slug}?category=${encodeURIComponent(selectedCategoryCode())}`;
    window.history.pushState({}, "", target);
    router();
  });
  updateSubmitState();
}

async function renderEvents() {
  const events = await loadEvents();
  app.innerHTML = `
    <section class="page-hero compact-hero">
      <div class="section-heading">
        <p class="eyebrow">Kalendarz</p>
        <h1>Zawody</h1>
        <p>Aktualne wydarzenia BMX Freestyle Polska, status zapisów i szybkie przejście do rejestracji.</p>
      </div>
    </section>
    <section class="section section-tight">
      <div class="event-list">${events.map(eventCard).join("")}</div>
    </section>
  `;
}

async function renderEventDetails(slug) {
  const event = await loadEvent(slug);
  if (!event) {
    renderNotFound();
    return;
  }

  app.innerHTML = `
    <section class="page-hero event-hero">
      <div class="section-heading">
        <p class="eyebrow">${escapeHtml(statusLabel(event.status))}</p>
        <h1>${escapeHtml(event.name)}</h1>
        <p>${formatDateRange(event)} · ${escapeHtml(event.city)} · ${escapeHtml(event.venue)}</p>
        <div class="event-badges">
          <span class="status-pill ${statusClass(event.status)}">${statusLabel(event.status)}</span>
          ${categoryChips()}
        </div>
        <div class="hero-actions">
          <a class="primary-btn" href="/zapisy/${event.slug}" data-link>Przejdź do zapisu</a>
          <a class="secondary-btn" href="/regulamin" data-link>Regulamin</a>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="notice">${escapeHtml(event.organizerMessage || "Komunikat organizatora pojawi się tutaj.")}</div>
      <div class="category-grid event-category-grid">${categoryCards()}</div>
    </section>
  `;
}

async function renderSignupPlaceholder(slug) {
  const event = await loadEvent(slug);
  if (!event) {
    app.innerHTML = `
      <section class="placeholder-page">
        <p class="eyebrow">Brak wydarzenia</p>
        <h1>Nie znaleziono zawodów</h1>
        <p>Sprawdź link albo wróć do listy wydarzeń.</p>
        <a class="primary-btn" href="/zawody" data-link>Zobacz zawody</a>
      </section>
    `;
    return;
  }

  const categories = await loadCategories(event.id);
  const consents = await loadConsents(event.id);
  const closedReason = registrationClosedReason(event);
  const formDisabled = Boolean(closedReason) || categories.length === 0;
  const categoryParam = new URLSearchParams(window.location.search).get("category");
  const preselectedCategoryCode = String(categoryParam || "").trim().toUpperCase();
  const preselectedCategory = categories.find((category) => String(category.code).toUpperCase() === preselectedCategoryCode);
  const checkedCategoryId = preselectedCategory?.id || categories[0]?.id || "";
  const statusMessage = closedReason
    ? closedReason
    : categories.length === 0
      ? "Brak aktywnych kategorii dla tego wydarzenia."
      : "";

  app.innerHTML = `
    <section class="page-hero signup-hero">
      <div class="event-summary-card">
        <p class="eyebrow">${statusLabel(event.status)}</p>
        <h1>${escapeHtml(event.name)}</h1>
        <p>${formatDateRange(event)} · ${escapeHtml(event.city)} · ${escapeHtml(event.venue)}</p>
        ${event.organizerMessage ? `<div class="notice">${escapeHtml(event.organizerMessage)}</div>` : ""}
      </div>
    </section>

    <section class="section section-tight signup-section">

      ${statusMessage ? `<div class="form-alert">${escapeHtml(statusMessage)}</div>` : ""}

      <form class="registration-form" id="registrationForm" novalidate>
        <input type="hidden" name="eventId" value="${escapeHtml(event.id)}" />
        <input type="hidden" name="eventSlug" value="${escapeHtml(event.slug)}" />

        <section class="form-section">
          <div>
            <p class="eyebrow">Krok 1</p>
            <h2>Wybierz kategorię</h2>
          </div>
          <div class="category-choice-grid">
            ${categories.map((category, index) => `
              <label class="category-choice">
                <input
                  type="radio"
                  name="categoryId"
                  value="${escapeHtml(category.id)}"
                  data-code="${escapeHtml(category.code)}"
                  data-age-max="${escapeHtml(category.ageMax ?? category.age_max ?? "")}"
                  data-requires-license="${category.requiresLicense || category.requires_license ? "true" : "false"}"
                  ${category.id === checkedCategoryId ? "checked" : ""}
                  ${formDisabled ? "disabled" : ""}
                />
                <span>
                  <strong>${escapeHtml(category.code)}</strong>
                  <small>${escapeHtml(category.description || "")}</small>
                  ${category.requiresLicense || category.requires_license ? "<em>Licencja wymagana</em>" : "<em>Bez licencji</em>"}
                </span>
              </label>
            `).join("")}
          </div>
        </section>

        <section class="form-section">
          <div>
            <p class="eyebrow">Krok 2</p>
            <h2>Dane zawodnika</h2>
          </div>
          <div class="field-grid">
            <label>Imię<input name="firstName" autocomplete="given-name" required ${formDisabled ? "disabled" : ""} /></label>
            <label>Nazwisko<input name="lastName" autocomplete="family-name" required ${formDisabled ? "disabled" : ""} /></label>
            <label>Data urodzenia<input name="birthDate" type="date" required ${formDisabled ? "disabled" : ""} /></label>
            <label>E-mail<input name="email" type="email" autocomplete="email" required ${formDisabled ? "disabled" : ""} /></label>
            <label>Telefon<input name="phone" type="tel" autocomplete="tel" required ${formDisabled ? "disabled" : ""} /></label>
            <label>Miasto<input name="city" autocomplete="address-level2" required ${formDisabled ? "disabled" : ""} /></label>
            <label>Kraj<input name="country" autocomplete="country-name" value="Polska" required ${formDisabled ? "disabled" : ""} /></label>
            <label>Płeć <span>opcjonalnie, statystycznie</span>
              <select name="gender" ${formDisabled ? "disabled" : ""}>
                <option value="">Nie podaję</option>
                <option value="female">Kobieta</option>
                <option value="male">Mężczyzna</option>
                <option value="other">Inna / wolę nie określać</option>
              </select>
            </label>
            <label class="full">Klub / team <span>opcjonalnie</span><input name="clubTeam" ${formDisabled ? "disabled" : ""} /></label>
          </div>
          <p class="inline-status" id="ageStatus"></p>
        </section>

        <section class="form-section conditional-section" id="licenseSection" hidden>
          <div>
            <p class="eyebrow">Krok 3</p>
            <h2>Dane licencji</h2>
            <p>Wpisz UCI ID zawodnika lub numer licencji wymagany dla kategorii PRO.</p>
          </div>
          <div class="field-grid">
            <label class="full">UCI ID / numer licencji
              <span>Wpisz UCI ID zawodnika lub numer licencji wymagany dla kategorii PRO.</span>
              <input name="licenseNumber" />
            </label>
          </div>
        </section>

        <section class="form-section conditional-section" id="guardianSection" hidden>
          <div>
            <p class="eyebrow">Krok 4</p>
            <h2>Dane opiekuna</h2>
            <p>Zawodnik niepełnoletni wymaga danych rodzica lub opiekuna prawnego.</p>
          </div>
          <div class="field-grid">
            <label>Imię i nazwisko opiekuna<input name="guardianFullName" autocomplete="name" /></label>
            <label>E-mail opiekuna<input name="guardianEmail" type="email" autocomplete="email" /></label>
            <label>Telefon opiekuna<input name="guardianPhone" type="tel" autocomplete="tel" /></label>
            <label>Relacja
              <select name="guardianRelationship">
                <option value="">Wybierz</option>
                <option value="rodzic">Rodzic</option>
                <option value="opiekun prawny">Opiekun prawny</option>
                <option value="inna">Inna</option>
              </select>
            </label>
          </div>
        </section>

        <section class="form-section">
          <div>
            <p class="eyebrow">Krok 5</p>
            <h2>Zgody i oświadczenia</h2>
          </div>
          <div class="consent-list" id="consentList">
            ${consents.length ? consents.map((consent) => `
              <label
                class="consent-item"
                data-guardian-only="${consent.guardianOnly || consent.guardian_only ? "true" : "false"}"
                data-athlete-adult-only="${consent.athleteAdultOnly || consent.athlete_adult_only ? "true" : "false"}"
              >
                <input
                  type="checkbox"
                  name="consent"
                  value="${escapeHtml(consent.code)}"
                  data-required="${consent.required ? "true" : "false"}"
                  ${consent.required ? "required" : ""}
                  ${formDisabled ? "disabled" : ""}
                />
                <span>
                  <strong>${escapeHtml(consent.label)} ${consent.required ? "*" : ""}</strong>
                  <small>${escapeHtml(consent.body)}</small>
                </span>
              </label>
            `).join("") : '<div class="form-alert">Nie udało się pobrać zgód dla tego wydarzenia.</div>'}
          </div>
        </section>

        <section class="form-section summary-section">
          <div>
            <p class="eyebrow">Podsumowanie</p>
            <h2>Przed wysłaniem</h2>
          </div>
          <div class="summary-box" id="formSummary"></div>
          <p class="form-message" id="formMessage" role="status"></p>
          <button class="submit-btn" type="submit" ${formDisabled ? "disabled" : ""}>Wyślij zgłoszenie</button>
        </section>
      </form>
    </section>
  `;

  if (!formDisabled) setupRegistrationForm({ event, categories, consents });
}

function eventStartDate(event) {
  const date = new Date(event.startsAt || event.starts_at);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function calculateAge(birthDateValue, targetDate) {
  if (!birthDateValue) return null;
  const birthDate = new Date(`${birthDateValue}T12:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;
  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = targetDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

function selectedCategory(form, categories) {
  const checked = form.querySelector('input[name="categoryId"]:checked');
  return categories.find((category) => category.id === checked?.value) || categories[0] || null;
}

function isLicenseRequired(category) {
  return Boolean(category?.requiresLicense || category?.requires_license);
}

function categoryAgeMax(category, event) {
  const value = category?.ageMax ?? category?.age_max ?? event.settings?.juniorMaxAge;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function relevantConsentElement(element, minor) {
  const guardianOnly = element.dataset.guardianOnly === "true";
  const adultOnly = element.dataset.athleteAdultOnly === "true";
  if (guardianOnly && !minor) return false;
  if (adultOnly && minor) return false;
  return true;
}

function setRequired(elements, required) {
  elements.forEach((element) => {
    element.toggleAttribute("required", required);
  });
}

function setMessage(element, message, type = "info") {
  element.textContent = message;
  element.dataset.type = type;
}

function setupRegistrationForm({ event, categories, consents }) {
  const form = document.querySelector("#registrationForm");
  const ageStatus = document.querySelector("#ageStatus");
  const licenseSection = document.querySelector("#licenseSection");
  const guardianSection = document.querySelector("#guardianSection");
  const consentItems = [...document.querySelectorAll(".consent-item")];
  const summary = document.querySelector("#formSummary");
  const message = document.querySelector("#formMessage");
  const submitButton = form.querySelector(".submit-btn");

  function formState() {
    const category = selectedCategory(form, categories);
    const age = calculateAge(form.elements.birthDate.value, eventStartDate(event));
    const minor = Number.isFinite(age) && age < 18;
    const juniorMax = category?.code === "JUNIOR" ? categoryAgeMax(category, event) : null;
    const juniorMismatch = category?.code === "JUNIOR" && Number.isFinite(age) && juniorMax !== null && age > juniorMax;
    return { age, category, juniorMax, juniorMismatch, minor };
  }

  function updateDynamicState() {
    const state = formState();
    const needsLicense = isLicenseRequired(state.category);

    licenseSection.hidden = !needsLicense;
    setRequired([
      form.elements.licenseNumber,
    ], needsLicense);

    guardianSection.hidden = !state.minor;
    setRequired([
      form.elements.guardianFullName,
      form.elements.guardianEmail,
      form.elements.guardianPhone,
      form.elements.guardianRelationship,
    ], state.minor);

    consentItems.forEach((item) => {
      const input = item.querySelector("input");
      const visible = relevantConsentElement(item, state.minor);
      item.hidden = !visible;
      input.disabled = !visible;
      input.required = visible && input.dataset.required === "true";
    });

    if (state.age === null) {
      ageStatus.textContent = "Podaj datę urodzenia, aby sprawdzić kategorię i wymagania opiekuna.";
      ageStatus.dataset.type = "info";
    } else if (state.juniorMismatch) {
      ageStatus.textContent = `Zawodnik ma ${state.age} lat w dniu startu. Kategoria JUNIOR dopuszcza maksymalnie ${state.juniorMax} lat.`;
      ageStatus.dataset.type = "error";
    } else if (state.minor) {
      ageStatus.textContent = `Zawodnik ma ${state.age} lat w dniu startu. Dane opiekuna i zgody opiekuna są wymagane.`;
      ageStatus.dataset.type = "warning";
    } else {
      ageStatus.textContent = `Zawodnik ma ${state.age} lat w dniu startu. Dane opiekuna nie są wymagane.`;
      ageStatus.dataset.type = "success";
    }

    const fullName = [form.elements.firstName.value, form.elements.lastName.value].filter(Boolean).join(" ") || "Nie podano";
    summary.innerHTML = `
      <p><strong>Wydarzenie:</strong> ${escapeHtml(event.name)}</p>
      <p><strong>Kategoria:</strong> ${escapeHtml(state.category?.code || "Nie wybrano")}</p>
      <p><strong>Zawodnik:</strong> ${escapeHtml(fullName)}</p>
      <p><strong>Wiek w dniu startu:</strong> ${state.age === null ? "Podaj datę urodzenia" : state.age}</p>
      <p><strong>Opiekun:</strong> ${state.minor ? "wymagany" : "niewymagany"}</p>
      <p><strong>Status po wysłaniu:</strong> oczekuje na weryfikację organizatora</p>
    `;
  }

  function validateForm() {
    const state = formState();
    if (!state.category) return "Wybierz kategorię startową.";
    if (state.age === null) return "Podaj poprawną datę urodzenia.";
    if (state.juniorMismatch) {
      return `Zawodnik nie spełnia warunku wieku dla kategorii JUNIOR. Maksymalny wiek: ${state.juniorMax} lat.`;
    }
    if (isLicenseRequired(state.category)) {
      if (!form.elements.licenseNumber.value.trim()) {
        return "Podaj UCI ID lub numer licencji.";
      }
    }
    if (state.minor) {
      if (!form.elements.guardianFullName.value || !form.elements.guardianEmail.value || !form.elements.guardianPhone.value || !form.elements.guardianRelationship.value) {
        return "Dla osoby niepełnoletniej uzupełnij dane opiekuna.";
      }
    }

    const missingConsent = consentItems.some((item) => {
      const input = item.querySelector("input");
      return !item.hidden && input.required && !input.checked;
    });
    if (missingConsent) return "Zaznacz wszystkie wymagane zgody i oświadczenia.";
    if (!form.checkValidity()) return "Uzupełnij wymagane pola formularza.";
    return "";
  }

  function buildPayload() {
    const state = formState();
    const consentPayload = consentItems
      .filter((item) => !item.hidden)
      .map((item) => {
        const input = item.querySelector("input");
        return {
          code: input.value,
          accepted: input.checked,
          acceptedBy: state.minor ? "guardian" : "athlete",
        };
      });

    return {
      eventId: event.id,
      eventSlug: event.slug,
      categoryId: state.category.id,
      categoryCode: state.category.code,
      firstName: form.elements.firstName.value.trim(),
      lastName: form.elements.lastName.value.trim(),
      birthDate: form.elements.birthDate.value,
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      city: form.elements.city.value.trim(),
      country: form.elements.country.value.trim(),
      gender: form.elements.gender.value,
      clubTeam: form.elements.clubTeam.value.trim(),
      licenseNumber: form.elements.licenseNumber.value.trim(),
      guardianFullName: form.elements.guardianFullName.value.trim(),
      guardianEmail: form.elements.guardianEmail.value.trim(),
      guardianPhone: form.elements.guardianPhone.value.trim(),
      guardianRelationship: form.elements.guardianRelationship.value,
      consents: consentPayload,
      source: "public",
    };
  }

  async function submitRegistration(eventSubmit) {
    eventSubmit.preventDefault();
    updateDynamicState();
    const validationError = validateForm();
    if (validationError) {
      setMessage(message, validationError, "error");
      return;
    }

    submitButton.disabled = true;
    setMessage(message, "Wysyłam zgłoszenie...", "info");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        setMessage(message, payload.error || "Nie udało się wysłać zgłoszenia.", "error");
        submitButton.disabled = false;
        return;
      }

      const state = formState();
      const confirmationLink = payload.registration?.confirmation_token
        ? `/potwierdz?token=${encodeURIComponent(payload.registration.confirmation_token)}`
        : "";
      app.innerHTML = `
        <section class="placeholder-page success-page">
          <div class="success-mark" aria-hidden="true">✓</div>
          <p class="eyebrow">Zgłoszenie wysłane</p>
          <h1>Zgłoszenie przyjęte do systemu</h1>
          <p>Zgłoszenie zawodnika ${escapeHtml(form.elements.firstName.value)} ${escapeHtml(form.elements.lastName.value)} zostało zapisane i czeka na decyzję organizatora.</p>
          <div class="notice">
            Status: oczekuje na weryfikację organizatora. Nie jest to jeszcze automatyczna akceptacja startu.
          </div>
          <div class="success-info">
            <p>Potwierdzenie zostało wysłane e-mailem.</p>
            <p>Organizator poinformuje o zmianie statusu zgłoszenia.</p>
          </div>
          <p>Kategoria: <strong>${escapeHtml(state.category.code)}</strong></p>
          <div class="hero-actions">
            ${confirmationLink ? `<a class="primary-btn" href="${escapeHtml(confirmationLink)}" data-link>Pokaż potwierdzenie i QR</a>` : ""}
            <a class="primary-btn" href="/zawody/${event.slug}" data-link>Wróć do wydarzenia</a>
            <a class="secondary-btn" href="/" data-link>Strona główna</a>
          </div>
        </section>
      `;
    } catch (error) {
      setMessage(message, "Nie udało się połączyć z API zgłoszeń. Spróbuj ponownie.", "error");
      submitButton.disabled = false;
    }
  }

  form.addEventListener("input", updateDynamicState);
  form.addEventListener("change", updateDynamicState);
  form.addEventListener("submit", submitRegistration);
  updateDynamicState();
}

async function renderConfirmationPlaceholder() {
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) {
    app.innerHTML = `
      <section class="placeholder-page confirmation-page">
        <p class="eyebrow">Potwierdzenie</p>
        <h1>Potwierdzenie zgłoszenia</h1>
        <p>Brakuje tokena potwierdzenia. Otwórz link z wiadomości e-mail lub SMS.</p>
        <a class="primary-btn" href="/" data-link>Wróć do strony głównej</a>
      </section>
    `;
    return;
  }

  app.innerHTML = `
    <section class="placeholder-page confirmation-page">
      <p class="eyebrow">Potwierdzenie</p>
      <h1>Ładuję potwierdzenie</h1>
      <p>Pobieram dane zgłoszenia i kod QR.</p>
    </section>
  `;

  const payload = await fetchJson(`/api/confirmation?token=${encodeURIComponent(token)}`, { ok: false, error: "Nie udało się pobrać potwierdzenia." });
  if (!payload.ok || !payload.confirmation) {
    app.innerHTML = `
      <section class="placeholder-page confirmation-page">
        <p class="eyebrow">Potwierdzenie</p>
        <h1>Nie znaleziono potwierdzenia</h1>
        <p>${escapeHtml(payload.error || "Link jest nieprawidłowy albo zgłoszenie nie ma jeszcze tokena potwierdzenia.")}</p>
        <a class="primary-btn" href="/" data-link>Wróć do strony głównej</a>
      </section>
    `;
    return;
  }

  const confirmation = payload.confirmation;
  app.innerHTML = `
    <section class="placeholder-page confirmation-page">
      <p class="eyebrow">BMX Freestyle Polska</p>
      <h1>Potwierdzenie zgłoszenia</h1>
      <span class="status-chip status-${escapeHtml(confirmation.status.code)}">${escapeHtml(confirmation.status.label)}</span>
      <div class="confirmation-card">
        <div class="confirmation-details">
          <div>
            <p class="panel-kicker">Zawodnik</p>
            <h2>${escapeHtml(confirmation.athlete.fullName)}</h2>
          </div>
          <div class="detail-list">
            <p><strong>Wydarzenie</strong><span>${escapeHtml(confirmation.event.name)}</span></p>
            <p><strong>Data</strong><span>${escapeHtml(confirmation.event.date)}</span></p>
            <p><strong>Miejsce</strong><span>${escapeHtml([confirmation.event.city, confirmation.event.venue].filter(Boolean).join(" / "))}</span></p>
            <p><strong>Kategoria</strong><span>${escapeHtml(confirmation.category.code)}</span></p>
          </div>
          <div class="notice">${escapeHtml(confirmation.status.message)}</div>
        </div>
        <div class="qr-panel">
          <div class="qr-code" aria-label="Kod QR do okazania przy check-inie">${confirmation.qrSvg}</div>
          <strong>Kod QR do okazania przy check-inie</strong>
          <p>Pokaż ten kod w biurze zawodów. Kod prowadzi do tej strony potwierdzenia.</p>
        </div>
      </div>
      <div class="hero-actions">
        <a class="primary-btn" href="/" data-link>Wróć do strony głównej</a>
        <a class="secondary-btn" href="${escapeHtml(confirmation.confirmationUrl)}">Otwórz link potwierdzenia</a>
      </div>
    </section>
  `;
}

function renderRules() {
  app.innerHTML = `
    <section class="placeholder-page">
      <p class="eyebrow">Dokumenty</p>
      <h1>Regulamin</h1>
      <p>Regulamin zawodów, informacje RODO oraz dokumenty dla zawodnika i opiekuna będą publikowane przy wydarzeniu.</p>
    </section>
  `;
}

function faqSection({ home = false } = {}) {
  return `
    <section class="section ${home ? "home-faq-section" : ""}">
      <div class="section-heading">
        <p class="eyebrow">FAQ</p>
        <h2>Najczęstsze pytania</h2>
      </div>
      <div class="faq-list">
        <article class="faq-item"><h3>Czy PRO wymaga licencji?</h3><p>Tak. W formularzu PRO podajesz jedno pole: UCI ID / numer licencji.</p></article>
        <article class="faq-item"><h3>Czy są osobne kategorie kobiet?</h3><p>Nie w MVP. Struktura kategorii ma jednak gender_scope, więc można je dodać później.</p></article>
        <article class="faq-item"><h3>Czy wysłanie formularza oznacza akceptację?</h3><p>Nie. Zgłoszenie trafia do weryfikacji organizatora, a status przyjęcia zostanie potwierdzony osobno.</p></article>
      </div>
    </section>
  `;
}

function renderFaq() {
  app.innerHTML = faqSection();
}

function renderResults() {
  app.innerHTML = `
    <section class="placeholder-page">
      <p class="eyebrow">Przyszły moduł</p>
      <h1>Wyniki</h1>
      <p>Wyniki i rankingi pojawią się w kolejnych etapach rozwoju systemu BMX Freestyle Polska.</p>
    </section>
  `;
}

function renderNotFound() {
  app.innerHTML = `
    <section class="placeholder-page">
      <p class="eyebrow">404</p>
      <h1>Nie znaleziono strony</h1>
      <a class="primary-btn" href="/" data-link>Wróć na start</a>
    </section>
  `;
}

async function router() {
  const path = window.location.pathname;
  document.body.classList.toggle("home-page", path === "/");
  const route = routes.find((candidate) => candidate.pattern.test(path));
  if (!route) {
    renderNotFound();
    return;
  }
  const match = path.match(route.pattern);
  await route.render(...match);
  app.focus({ preventScroll: true });
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-link]");
  if (!link) return;
  const url = new URL(link.href);
  if (url.origin !== window.location.origin) return;
  event.preventDefault();
  window.history.pushState({}, "", `${url.pathname}${url.search}`);
  router();
});

window.addEventListener("popstate", router);
router();

function markActivePublicNav() {
  const path = window.location.pathname;
  document.querySelectorAll(".site-header nav a").forEach((link) => {
    const linkPath = new URL(link.href).pathname;
    const active = linkPath === "/" ? path === "/" : path.startsWith(linkPath);
    link.classList.toggle("is-active", active);
  });
}

window.addEventListener("popstate", markActivePublicNav);
document.addEventListener("click", () => requestAnimationFrame(markActivePublicNav));
markActivePublicNav();
