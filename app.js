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
    description: "Otwarta kategoria dla riderów od 15. roku życia.",
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
    body: "Akceptuję Regulamin zawodów.",
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

const partnerGroups = [
  {
    title: "Miasta gospodarze",
    type: "host_cities",
    items: [
      {
        name: "Gorzów Wielkopolski",
        key: "gorzow",
        role: "host_city",
        logo: "/assets/partners/gorzow-wielkopolski.png",
        alt: "Gorzów Wielkopolski",
        url: "",
        logoScale: 1,
      },
      {
        name: "Miasto i Gmina Bogatynia",
        key: "bogatynia",
        role: "host_city",
        logo: "/assets/partners/bogatynia.png",
        alt: "Miasto i Gmina Bogatynia",
        url: "",
        logoScale: 1.44,
      },
    ],
  },
  {
    title: "Partnerzy",
    type: "sponsors",
    items: [
      {
        name: "JBL",
        key: "jbl",
        role: "sponsor",
        logo: "/assets/partners/jbl.png",
        alt: "JBL",
        url: "",
        logoScale: 1.3,
      },
      {
        name: "Monster Energy",
        key: "monster-energy",
        role: "sponsor",
        logo: "/assets/partners/monster-energy.png",
        alt: "Monster Energy",
        url: "",
        logoScale: 1.44,
      },
      {
        name: "Fox Racing",
        key: "fox-racing",
        role: "sponsor",
        logo: "/assets/partners/fox-racing.png",
        alt: "Fox Racing",
        url: "",
        logoScale: 1,
      },
      {
        name: "RideHub",
        key: "ridehub",
        role: "partner",
        logo: "/assets/partners/ridehub.png",
        alt: "RideHub",
        url: "",
        logoScale: 1,
      },
    ],
  },
];

const faqItems = [
  {
    id: "pro-license",
    featured: true,
    question: "Czy kategoria PRO wymaga licencji?",
    answer: [
      "Tak. Kategoria PRO jest rozgrywana jako Puchar Polski BMX Freestyle PZKol. W formularzu należy podać jedno pole: UCI ID / numer licencji.",
      "Organizator może zweryfikować ważność licencji przed zaakceptowaniem zgłoszenia lub podczas check-inu.",
    ],
  },
  {
    id: "auto-category",
    featured: true,
    question: "Czy zawodnik sam wybiera kategorię AMATOR albo JUNIOR U15?",
    answer: [
      "Tak. Podczas rejestracji zawodnik wybiera kategorię AMATOR albo JUNIOR U15.",
      "System sprawdza zgodność wyboru z datą urodzenia i datą rozpoczęcia zawodów: JUNIOR U15 jest przeznaczony dla zawodników, którzy w dniu zawodów nie ukończyli 15 lat, a AMATOR dla zawodników, którzy w dniu zawodów mają co najmniej 15 lat.",
      "Zawodnik, który kończy 15 lat dokładnie w dniu zawodów, powinien wybrać kategorię AMATOR.",
    ],
  },
  {
    id: "women-results",
    featured: true,
    question: "Czy kobiety i mężczyźni startują osobno?",
    answer: [
      "W kategorii PRO kobiety i mężczyźni mogą startować podczas tej samej sesji, ale wyniki kobiet są klasyfikowane oddzielnie.",
      "W kategoriach AMATOR i JUNIOR U15 uczestnicy mogą startować wspólnie. Organizator może utworzyć osobną klasyfikację kobiet lub dziewcząt, jeśli liczba uczestniczek będzie uzasadniała jej utworzenie.",
    ],
  },
  {
    id: "accepted-status",
    featured: true,
    question: "Czy wysłanie formularza oznacza przyjęcie do zawodów?",
    answer: [
      "Nie. Po wysłaniu formularza zgłoszenie trafia do weryfikacji organizatora.",
      "Dopiero status zaakceptowane oznacza przyjęcie zawodnika na listę uczestników.",
      "Samo otrzymanie potwierdzenia rejestracji lub kodu QR nie gwarantuje dopuszczenia do startu.",
    ],
  },
  {
    id: "status-check",
    featured: false,
    question: "Jak sprawdzić status zgłoszenia?",
    answer: [
      "Po rejestracji zawodnik otrzyma link do strony potwierdzenia. Na stronie będzie widoczny aktualny status zgłoszenia oraz kod QR używany podczas check-inu.",
      "Informacja o zmianie statusu może zostać również przesłana e-mailem lub SMS-em.",
    ],
  },
  {
    id: "qr-code",
    featured: true,
    question: "Do czego służy kod QR?",
    answer: [
      "Kod QR pozwala szybko odnaleźć zgłoszenie zawodnika podczas check-inu.",
      "Można pokazać go w biurze zawodów na ekranie telefonu albo w formie wydruku.",
      "Kod QR nie zastępuje licencji, wymaganych dokumentów ani pisemnej zgody opiekuna.",
    ],
  },
  {
    id: "entry-fee",
    featured: true,
    question: "Czy udział w zawodach jest płatny?",
    answer: ["Nie. Udział w kategoriach PRO, AMATOR i JUNIOR U15 jest bezpłatny."],
  },
  {
    id: "onsite-registration",
    featured: true,
    question: "Czy można zapisać się na miejscu?",
    answer: [
      "Tak, ale wyłącznie wtedy, gdy pozostaną wolne miejsca.",
      "Jeżeli limit uczestników zostanie wyczerpany podczas zapisów internetowych, rejestracja na miejscu nie będzie prowadzona.",
      "Najbezpieczniej zapisać się wcześniej przez stronę.",
    ],
  },
  {
    id: "minor-documents",
    featured: true,
    question: "Jakie dokumenty musi mieć zawodnik niepełnoletni?",
    answer: [
      "Każdy zawodnik niepełnoletni musi podczas check-inu dostarczyć podpisane pisemne oświadczenie rodzica lub opiekuna prawnego ze zgodą na udział w zawodach.",
      "Brak oświadczenia oznacza brak możliwości udziału w oficjalnych treningach i przejazdach konkursowych.",
    ],
  },
  {
    id: "guardian-presence",
    featured: false,
    question: "Czy rodzic lub opiekun musi być obecny na zawodach?",
    answer: [
      "Rodzic lub opiekun musi przekazać wymagane dane i zgody oraz podpisać pisemne oświadczenie.",
      "Organizator może dodatkowo wymagać obecności opiekuna podczas check-inu, jeśli będzie to wskazane w komunikacie dotyczącym konkretnego wydarzenia.",
    ],
  },
  {
    id: "minor-pro",
    featured: false,
    question: "Czy zawodnik niepełnoletni może startować w PRO?",
    answer: [
      "Tak, jeśli posiada ważny UCI ID lub numer licencji, spełnia wymagania kategorii PRO i dostarczy wymagane zgody rodzica lub opiekuna.",
      "Granica wieku AMATOR/JUNIOR U15 nie jest stosowana do wybranej kategorii PRO.",
    ],
  },
  {
    id: "helmet",
    featured: true,
    question: "Czy kask jest obowiązkowy?",
    answer: [
      "Tak. Kask jest obowiązkowy podczas oficjalnych treningów i przejazdów konkursowych.",
      "Organizator zaleca również stosowanie ochraniaczy odpowiednich do wieku, poziomu zawodnika i wykonywanych ewolucji.",
    ],
  },
  {
    id: "bike-check",
    featured: false,
    question: "Czy rower będzie sprawdzany?",
    answer: [
      "Organizator może sprawdzić stan techniczny roweru podczas check-inu albo przed dopuszczeniem zawodnika do jazdy.",
      "Zawodnik może nie zostać dopuszczony do startu, jeśli rower, kask albo inne elementy wyposażenia stwarzają zagrożenie.",
    ],
  },
  {
    id: "schedule",
    featured: true,
    question: "Kiedy będzie dostępny harmonogram?",
    answer: [
      "Harmonogram konkretnego wydarzenia będzie publikowany na stronie zawodów oraz w oficjalnych kanałach organizatora.",
      "Może obejmować godziny check-inu, treningów, kwalifikacji, finałów i dekoracji.",
    ],
  },
  {
    id: "schedule-change",
    featured: false,
    question: "Czy harmonogram może się zmienić?",
    answer: [
      "Tak. Organizator może zmienić harmonogram lub format zawodów ze względu na pogodę, liczbę uczestników, stan obiektu, opóźnienia albo konieczność zapewnienia bezpieczeństwa.",
      "Aktualne informacje będą publikowane na stronie oraz, w miarę możliwości, przesyłane e-mailem lub SMS-em.",
    ],
  },
  {
    id: "late-checkin",
    featured: false,
    question: "Co się stanie, jeśli zawodnik spóźni się na check-in?",
    answer: [
      "Spóźnienie może skutkować niedopuszczeniem do startu albo przekazaniem miejsca osobie z listy rezerwowej.",
      "Godziny check-inu należy sprawdzić w komunikacie organizacyjnym konkretnego wydarzenia.",
    ],
  },
  {
    id: "data-change",
    featured: false,
    question: "Czy można zmienić dane po wysłaniu formularza?",
    answer: [
      "Tak, ale zmiany wymagające weryfikacji powinny zostać zgłoszone organizatorowi przed zawodami.",
      "Nie należy wysyłać drugiego zgłoszenia dla tej samej osoby, chyba że organizator wyraźnie o to poprosi.",
    ],
  },
  {
    id: "needs-info",
    featured: false,
    question: "Co oznacza status wymaga uzupełnienia?",
    answer: [
      "Oznacza to, że organizator potrzebuje dodatkowych danych, dokumentu, zgody albo wyjaśnienia przed zaakceptowaniem zawodnika.",
      "Informacja o wymaganym uzupełnieniu zostanie przekazana na dane kontaktowe podane w formularzu.",
    ],
  },
  {
    id: "waitlist",
    featured: false,
    question: "Co oznacza lista rezerwowa?",
    answer: [
      "Lista rezerwowa oznacza, że limit miejsc został czasowo wyczerpany.",
      "Zawodnik może zostać zaakceptowany, jeśli zwolni się miejsce albo organizator zwiększy limit uczestników.",
    ],
  },
  {
    id: "rules",
    featured: false,
    question: "Gdzie znajdę regulamin zawodów?",
    answer: [
      'Aktualny regulamin jest dostępny pod adresem <a href="/regulamin" data-link>https://www.bmxseries.pl/regulamin</a>.',
      "Przed wysłaniem zgłoszenia należy zapoznać się z regulaminem oraz zaakceptować jego treść.",
    ],
    html: true,
  },
  {
    id: "contact",
    featured: false,
    question: "Jak skontaktować się z organizatorem?",
    answer: [
      "Dane kontaktowe dotyczące konkretnego wydarzenia są dostępne na stronie zawodów i w komunikacie organizacyjnym.",
      "W sprawach zgłoszeń należy podać imię i nazwisko zawodnika oraz nazwę wydarzenia.",
    ],
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
  return categories.map((category) => `<span class="category-chip">${escapeHtml(categoryLabel(category.code))}</span>`).join("");
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

function categoryLabel(code) {
  return String(code || "").toUpperCase() === "JUNIOR" ? "JUNIOR U15" : String(code || "").toUpperCase();
}

function consentBodyHtml(consent) {
  if (String(consent.code || "") === "rules_acceptance") {
    return 'Akceptuję <a href="/regulamin" data-link>Regulamin zawodów</a>.';
  }
  return escapeHtml(consent.body || "");
}

function categoryByCode(categories, code) {
  const normalized = String(code || "").toUpperCase();
  return categories.find((category) => String(category.code || "").toUpperCase() === normalized) || null;
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
    AMATOR: "Dla zawodników, którzy w dniu zawodów mają co najmniej 15 lat.",
    JUNIOR: "Dla zawodników, którzy w dniu zawodów nie ukończyli 15 lat.",
  };

  return fallbackCategories.map((category) => `
    <article class="category-card">
      <span class="card-kicker">${category.requiresLicense ? "Licencja" : "Open"}</span>
      <strong>${categoryLabel(category.code)}</strong>
      <p>${descriptions[category.code] || category.description}</p>
      ${category.requiresLicense ? '<span class="status-pill">Licencja wymagana</span>' : '<span class="status-pill">Walidacja wieku</span>'}
    </article>
  `).join("");
}

async function renderHome() {
  const events = await loadEvents();
  const visibleEvents = events.length ? events : [fallbackEvent];
  const params = new URLSearchParams(window.location.search);
  const requestedEventSlug = params.get("event");
  const selectedEvent = visibleEvents.find((event) => event.slug === requestedEventSlug) || defaultHomepageEvent(visibleEvents);
  const selectedCategories = await loadCategories(selectedEvent.id);
  const openInlineRegistration = params.get("register") === "1";
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
      <div class="section-glow-separator section-glow-separator-light" aria-hidden="true"></div>
      ${partnersSection()}
    </div>
  `;
  setupFastSignup({ events: visibleEvents, initialCategories: selectedCategories, openInlineRegistration });
}

function partnersSection() {
  return `
    <section class="section partners-section" aria-labelledby="partners-heading">
      <div class="section-heading">
        <p class="eyebrow">BMX Series</p>
        <h2 id="partners-heading">Partnerzy</h2>
        <p>Marki i instytucje wspierające rozwój zawodów BMX Freestyle w Polsce.</p>
      </div>
      <div class="partner-groups">
        ${partnerGroups.map(partnerGroup).join("")}
      </div>
    </section>
  `;
}

function partnerGroup(group) {
  return `
    <div class="partner-group partner-group-${escapeHtml(group.type)}">
      <h3>${escapeHtml(group.title)}</h3>
      <div class="partner-logo-grid">
        ${group.items.map((partner) => partnerLogoCard(partner, group.type)).join("")}
      </div>
    </div>
  `;
}

function partnerLogoCard(partner, groupType) {
  const logo = partner.logo ? `
    <img
      src="${escapeHtml(partner.logo)}"
      alt="${escapeHtml(partner.alt || partner.name)}"
      loading="lazy"
      style="--logo-scale: ${Number(partner.logoScale) || 1}"
      onerror="this.closest('.partner-logo-frame').classList.add('is-placeholder'); this.remove();"
    >
  ` : "";
  const content = `
    <span class="partner-logo-frame ${partner.logo ? "has-logo" : "is-placeholder"}">
      ${logo}
      <span class="partner-logo-placeholder">${escapeHtml(partner.name)}</span>
    </span>
  `;
  const cardClass = `partner-logo-card partner-logo-${escapeHtml(groupType)} partner-role-${escapeHtml(partner.role)} partner-logo-${escapeHtml(partner.key || "")}`;

  if (!partner.url) {
    return `<article class="${cardClass}">${content}</article>`;
  }

  return `
    <a class="${cardClass}" href="${escapeHtml(partner.url)}" target="_blank" rel="noopener noreferrer">
      ${content}
    </a>
  `;
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
        <article class="step-card"><span>2</span><h3>Wybierz kategorię</h3><p>PRO, AMATOR albo JUNIOR U15.</p></article>
        <article class="step-card"><span>3</span><h3>Wypełnij formularz</h3><p>System sprawdzi zgodność kategorii z datą urodzenia.</p></article>
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
        <h2>PRO, AMATOR, JUNIOR U15</h2>
        <p>Zawodnik wybiera kategorię podczas rejestracji. System sprawdza zgodność wybranej kategorii z datą urodzenia i datą zawodów.</p>
      </div>
      <div class="category-grid">${categoryCards()}</div>
    </section>
  `;
}

function categoryShortDescription(code) {
  const descriptions = {
    PRO: "Dla zawodników z UCI ID / numerem licencji.",
    AMATOR: "Dla zawodników od 15. roku życia.",
    JUNIOR: "Dla młodszych zawodników.",
  };
  return descriptions[String(code || "").toUpperCase()] || "Wybierz tę kategorię, jeśli jest właściwa dla zawodnika.";
}

function categoryCapacityLabel(category = {}) {
  if (category.capacityLabel) return category.capacityLabel;
  if (category.capacity === null || category.capacity === undefined || category.capacity === "") return "Brak limitu miejsc";
  const occupied = Number(category.occupiedCount || 0);
  const capacity = Number(category.capacity);
  const suffix = occupied >= capacity ? " — lista rezerwowa" : "";
  return `${occupied} / ${capacity} miejsc zajętych${suffix}`;
}

function fastSignupCategoryTiles(categories, selectedCode = preferredCategoryCode(categories)) {
  return categories.map((category) => {
    const code = String(category.code || "").toUpperCase();
    return `
      <label class="fast-category-tile">
        <input type="radio" name="fastCategory" value="${escapeHtml(code)}" ${code === selectedCode ? "checked" : ""} ${category.isActive === false || category.is_active === false ? "disabled" : ""} />
        <span>
          <strong>${escapeHtml(categoryLabel(code))}</strong>
          <small>${escapeHtml(categoryShortDescription(code))}</small>
          <em>${escapeHtml(categoryCapacityLabel(category))}</em>
        </span>
      </label>
    `;
  }).join("");
}

function fastSignupSection(events, selectedEvent, categories) {
  const closedReason = registrationClosedReason(selectedEvent);
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
              ${fastSignupCategoryTiles(categories)}
            </div>
          </div>
          <div class="fast-signup-step fast-submit-step">
            <p class="fast-step-label">03 Przejdź dalej</p>
            <button class="fast-submit-btn" id="fastSignupButton" type="button" ${closedReason ? "disabled" : ""}>Rozpocznij zapis</button>
            <p class="fast-signup-message" id="fastSignupMessage">${escapeHtml(closedReason || "Przejdziesz do formularza z wybraną kategorią.")}</p>
          </div>
        </div>
        <div class="fast-inline-registration" id="fastInlineRegistration" hidden></div>
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

function setupFastSignup({ events, initialCategories, openInlineRegistration = false }) {
  const section = document.querySelector("#fastSignup");
  if (!section) return;

  const eventSelect = section.querySelector("#fastEventSelect");
  const categoryGrid = section.querySelector("#fastCategoryGrid");
  const statusElement = section.querySelector("#fastEventStatus");
  const message = section.querySelector("#fastSignupMessage");
  const submitButton = section.querySelector("#fastSignupButton");
  const inlineContainer = section.querySelector("#fastInlineRegistration");
  let selectedEvent = events.find((event) => event.slug === eventSelect.value) || events[0] || fallbackEvent;
  let selectedCategories = initialCategories.length ? initialCategories : fallbackCategories;
  let inlineController = null;

  function selectedCategoryCode() {
    return section.querySelector('input[name="fastCategory"]:checked')?.value || preferredCategoryCode(selectedCategories);
  }

  function updateSubmitState() {
    const closedReason = registrationClosedReason(selectedEvent);
    const hasCategory = selectedCategories.length > 0;
    submitButton.disabled = Boolean(closedReason) || !hasCategory;
    message.textContent = closedReason || (hasCategory ? "Przejdziesz do formularza z wybraną kategorią." : "Brak aktywnych kategorii dla tego wydarzenia.");
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

  function compactUrl() {
    return "/";
  }

  function registrationUrl() {
    return `/?register=1&event=${encodeURIComponent(selectedEvent.slug)}&category=${encodeURIComponent(selectedCategoryCode())}`;
  }

  function collapseInlineRegistration({ updateUrl = true } = {}) {
    inlineContainer.hidden = true;
    inlineContainer.innerHTML = "";
    section.classList.remove("is-expanded");
    inlineController = null;
    if (updateUrl) window.history.pushState({}, "", compactUrl());
    submitButton.focus({ preventScroll: true });
  }

  async function openInlineForm({ updateUrl = true, focus = true } = {}) {
    if (submitButton.disabled) return;
    const categoryCode = selectedCategoryCode();
    const selectedCategory = categoryByCode(selectedCategories, categoryCode) || selectedCategories[0] || null;
    inlineContainer.hidden = false;
    inlineContainer.innerHTML = '<p class="fast-signup-message">Ładuję formularz...</p>';
    section.classList.add("is-expanded");
    if (updateUrl) window.history.pushState({}, "", registrationUrl());

    const consents = await loadConsents(selectedEvent.id);
    const closedReason = registrationClosedReason(selectedEvent);
    const formDisabled = Boolean(closedReason) || selectedCategories.length === 0;
    const statusMessage = closedReason
      ? closedReason
      : selectedCategories.length === 0
        ? "Brak aktywnych kategorii dla tego wydarzenia."
        : "";

    inlineContainer.innerHTML = registrationFormHtml({
      event: selectedEvent,
      categories: selectedCategories,
      consents,
      selectedCategory,
      formDisabled,
      statusMessage,
      inline: true,
    });

    inlineController = setupRegistrationForm({
      event: selectedEvent,
      categories: selectedCategories,
      consents,
      root: inlineContainer,
      successContainer: inlineContainer,
      onChangeSelection: () => collapseInlineRegistration(),
    });

    inlineContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focus) {
      window.setTimeout(() => inlineController?.focusFirstRequired(), 320);
    }
  }

  eventSelect.addEventListener("change", updateCategoriesForEvent);
  submitButton.addEventListener("click", () => openInlineForm());
  updateSubmitState();

  if (openInlineRegistration) {
    const params = new URLSearchParams(window.location.search);
    const categoryFromUrl = String(params.get("category") || "").toUpperCase();
    const requested = categoryByCode(selectedCategories, categoryFromUrl);
    if (requested) {
      const input = [...section.querySelectorAll('input[name="fastCategory"]')]
        .find((candidate) => candidate.value === String(requested.code || "").toUpperCase());
      if (input) input.checked = true;
    }
    openInlineForm({ updateUrl: false, focus: false });
  }
}

async function renderEvents() {
  const events = await loadEvents();
  app.innerHTML = `
    <section class="page-hero compact-hero">
      <div class="section-heading">
        <p class="eyebrow">Kalendarz</p>
        <h1>Zawody</h1>
        <p>Aktualne wydarzenia BMX Series, status zapisów i szybkie przejście do rejestracji.</p>
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

function registrationFormHtml({ event, categories, consents, selectedCategory, formDisabled, statusMessage = "", inline = false }) {
  return `
    <section class="section section-tight signup-section ${inline ? "signup-section-inline" : ""}">
      ${statusMessage ? `<div class="form-alert">${escapeHtml(statusMessage)}</div>` : ""}
      ${inline ? `
        <div class="inline-registration-summary" id="inlineRegistrationSummary" tabindex="-1">
          <div>
            <p class="eyebrow">Formularz zgłoszeniowy</p>
            <h3>Wybrane wydarzenie: ${escapeHtml(event.name)}</h3>
            <p>Kategoria: <strong>${escapeHtml(categoryLabel(selectedCategory?.code) || "Nie wybrano")}</strong></p>
          </div>
          <button class="secondary-btn inline-change-selection" type="button">Zmień wydarzenie lub kategorię</button>
        </div>
      ` : ""}

      <form class="registration-form" id="${inline ? "inlineRegistrationForm" : "registrationForm"}" novalidate>
        <input type="hidden" name="eventId" value="${escapeHtml(event.id)}" />
        <input type="hidden" name="eventSlug" value="${escapeHtml(event.slug)}" />

        <section class="form-section">
          <div>
            <p class="eyebrow">Krok 1</p>
            <h2>Wybierz kategorię</h2>
            <p>Wybierz kategorię sportową. System sprawdzi zgodność wyboru z datą urodzenia i datą rozpoczęcia wydarzenia.</p>
          </div>
          <div class="category-choice-grid">
            ${categories.map((category) => {
              const code = String(category.code || "").toUpperCase();
              return `
                <label class="category-choice">
                  <input
                    type="radio"
                    name="categoryId"
                    value="${escapeHtml(category.id)}"
                    data-code="${escapeHtml(code)}"
                    data-requires-license="${isLicenseRequired(category) ? "true" : "false"}"
                    ${selectedCategory?.id === category.id ? "checked" : ""}
                    ${formDisabled || category.isActive === false || category.is_active === false ? "disabled" : ""}
                  />
                  <span>
                    <strong>${escapeHtml(categoryLabel(code))}</strong>
                    <small>${escapeHtml(categoryShortDescription(code))}</small>
                    <em>${escapeHtml(categoryCapacityLabel(category))}</em>
                    <em>${isLicenseRequired(category) ? "Licencja wymagana" : "Walidacja wieku"}</em>
                  </span>
                </label>
              `;
            }).join("")}
          </div>
        </section>

        <section class="form-section athlete-data-section">
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
            <fieldset class="form-choice-group">
              <legend>Płeć</legend>
              <label><input type="radio" name="gender" value="female" required ${formDisabled ? "disabled" : ""} /> Kobieta</label>
              <label><input type="radio" name="gender" value="male" ${formDisabled ? "disabled" : ""} /> Mężczyzna</label>
            </fieldset>
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
                  <small>${consentBodyHtml(consent)}</small>
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
  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get("category");
  const preselectedCategoryCode = String(categoryParam || "").trim().toUpperCase();
  const selectedCategory = categoryByCode(categories, preselectedCategoryCode) || categories[0] || null;
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
    ${registrationFormHtml({ event, categories, consents, selectedCategory, formDisabled, statusMessage })}
  `;

  if (!formDisabled) setupRegistrationForm({ event, categories, consents, root: app, successContainer: app });
}

function eventStartDate(event) {
  const raw = String(event.startsAt || event.starts_at || "");
  const date = /^\d{4}-\d{2}-\d{2}/.test(raw) ? new Date(`${raw.slice(0, 10)}T12:00:00`) : new Date(raw);
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
  const selectedId = form.querySelector('input[name="categoryId"]:checked')?.value || "";
  return categories.find((category) => String(category.id) === String(selectedId)) || null;
}

function isLicenseRequired(category) {
  return Boolean(category?.requiresLicense || category?.requires_license);
}

function categoryAgeValidationMessage(category, age) {
  if (!category || !Number.isFinite(age)) return "";
  const code = String(category.code || "").toUpperCase();
  if (code === "JUNIOR" && age >= 15) {
    return "Kategoria JUNIOR U15 jest przeznaczona dla zawodników, którzy w dniu zawodów nie ukończyli 15 lat. Wybierz kategorię AMATOR.";
  }
  if (code === "AMATOR" && age < 15) {
    return "Zawodnik poniżej 15. roku życia powinien zostać zgłoszony do kategorii JUNIOR U15.";
  }
  return "";
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

function setupRegistrationForm({ event, categories, consents, root = document, successContainer = app, onChangeSelection = null }) {
  const form = root.querySelector(".registration-form");
  if (!form) return null;
  const ageStatus = root.querySelector("#ageStatus");
  const licenseSection = root.querySelector("#licenseSection");
  const guardianSection = root.querySelector("#guardianSection");
  const consentItems = [...root.querySelectorAll(".consent-item")];
  const summary = root.querySelector("#formSummary");
  const message = root.querySelector("#formMessage");
  const submitButton = form.querySelector(".submit-btn");
  const changeSelectionButton = root.querySelector(".inline-change-selection");
  let dirty = false;

  function formState() {
    const age = calculateAge(form.elements.birthDate.value, eventStartDate(event));
    const category = selectedCategory(form, categories);
    const categoryError = categoryAgeValidationMessage(category, age);
    const minor = Number.isFinite(age) && age < 18;
    return { age, category, categoryError, minor };
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
      ageStatus.textContent = "Podaj datę urodzenia, aby sprawdzić wymagania kategorii i opiekuna.";
      ageStatus.dataset.type = "info";
    } else if (state.categoryError) {
      ageStatus.textContent = state.categoryError;
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
      <p><strong>Kategoria:</strong> ${escapeHtml(categoryLabel(state.category?.code) || "Nie wybrano")}</p>
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
    if (state.categoryError) return state.categoryError;
    if (isLicenseRequired(state.category)) {
      if (!form.elements.licenseNumber.value.trim()) {
        return "Podaj UCI ID lub numer licencji.";
      }
    }
    if (!form.elements.gender.value) {
      return "Wybierz płeć zawodnika: kobieta albo mężczyzna.";
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
      categoryId: state.category?.id || "",
      categoryCode: state.category?.code || "",
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
      const waitlist = payload.status === "waitlist" || payload.registration?.status === "waitlist";
      const statusText = waitlist
        ? "lista rezerwowa"
        : "oczekuje na weryfikację organizatora";
      const statusNotice = waitlist
        ? "Limit miejsc w tej kategorii został wyczerpany. Zgłoszenie zostało dodane do listy rezerwowej."
        : "Status: oczekuje na weryfikację organizatora. Nie jest to jeszcze automatyczna akceptacja startu.";
      const confirmationLink = payload.registration?.confirmation_token
        ? `/potwierdz?token=${encodeURIComponent(payload.registration.confirmation_token)}`
        : "";
      successContainer.innerHTML = `
        <section class="placeholder-page success-page">
          <div class="success-mark" aria-hidden="true">✓</div>
          <p class="eyebrow">Zgłoszenie wysłane</p>
          <h1>Zgłoszenie przyjęte do systemu</h1>
          <p>Zgłoszenie zawodnika ${escapeHtml(form.elements.firstName.value)} ${escapeHtml(form.elements.lastName.value)} zostało zapisane. Aktualny status: <strong>${escapeHtml(statusText)}</strong>.</p>
          <div class="notice">
            ${escapeHtml(payload.message || statusNotice)}
          </div>
          <div class="success-info">
            <p>Potwierdzenie zostało wysłane e-mailem.</p>
            <p>Organizator poinformuje o zmianie statusu zgłoszenia.</p>
          </div>
          <p>Kategoria: <strong>${escapeHtml(categoryLabel(state.category.code))}</strong></p>
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

  form.addEventListener("input", () => {
    dirty = true;
    updateDynamicState();
  });
  form.addEventListener("change", () => {
    dirty = true;
    updateDynamicState();
  });
  form.addEventListener("submit", submitRegistration);
  changeSelectionButton?.addEventListener("click", () => {
    if (dirty && !window.confirm("Wpisane dane formularza zostaną ukryte. Czy chcesz wrócić do wyboru wydarzenia i kategorii?")) return;
    onChangeSelection?.();
  });
  updateDynamicState();
  return {
    focusFirstRequired() {
      const firstRequired = form.querySelector(".athlete-data-section input[required]:not([disabled])");
      firstRequired?.focus({ preventScroll: true });
    },
    isDirty() {
      return dirty;
    },
  };
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
      <p class="eyebrow">BMX Series</p>
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
    <section class="page-hero compact-hero rules-hero">
      <div class="section-heading">
        <p class="eyebrow">Dokumenty</p>
        <h1>Regulamin zawodów BMX Series</h1>
        <p>Puchar Polski BMX Freestyle i otwarte konkurencje towarzyszące.</p>
        <span class="status-pill">Wersja z dnia 17 lipca 2026 r.</span>
      </div>
    </section>

    <section class="section section-tight rules-section">
      <aside class="rules-toc" aria-label="Spis treści regulaminu">
        <strong>Spis treści</strong>
        <a href="#regulamin-ogolne">1. Postanowienia ogólne</a>
        <a href="#regulamin-organizator">2. Organizator</a>
        <a href="#regulamin-charakter">3. Charakter zawodów</a>
        <a href="#regulamin-kategorie">4. Kategorie startowe</a>
        <a href="#regulamin-uczestnictwo">5. Warunki uczestnictwa</a>
        <a href="#regulamin-zgloszenia">7. Zgłoszenia</a>
        <a href="#regulamin-niepelnoletni">8. Zawodnicy niepełnoletni</a>
        <a href="#regulamin-protesty">16. Protesty</a>
        <a href="#regulamin-koncowe">24. Postanowienia końcowe</a>
      </aside>

      <article class="rules-document">
        <header>
          <p class="eyebrow">Regulamin</p>
          <h2>REGULAMIN ZAWODÓW BMX SERIES</h2>
          <p>Puchar Polski BMX Freestyle i otwarte konkurencje towarzyszące.</p>
        </header>

        <section id="regulamin-ogolne">
          <h3>1. Postanowienia ogólne</h3>
          <ol>
            <li>Regulamin określa zasady organizacji oraz uczestnictwa w zawodach BMX Freestyle organizowanych w formule BMX Series przez Fundację Sportów Miejskich, zwaną dalej Organizatorem.</li>
            <li>Każde zawody są odrębnym wydarzeniem sportowym.</li>
            <li>Regulamin nie ustanawia punktacji sezonowej ani klasyfikacji generalnej łączącej wyniki poszczególnych imprez.</li>
            <li>Data, miejsce, harmonogram, limity uczestników, szczegółowy format sportowy, rodzaj nagród oraz pozostałe informacje dotyczące konkretnego wydarzenia są określane w komunikacie organizacyjnym publikowanym przez Organizatora.</li>
            <li>Uczestnictwo w zawodach oznacza akceptację niniejszego Regulaminu, komunikatu organizacyjnego danego wydarzenia oraz zasad bezpieczeństwa obowiązujących na obiekcie.</li>
          </ol>
        </section>

        <section id="regulamin-organizator">
          <h3>2. Organizator</h3>
          <ol>
            <li>Organizatorem zawodów jest Fundacja Sportów Miejskich.</li>
            <li>Organizator może realizować zawody we współpracy z Polskim Związkiem Kolarskim, jednostkami samorządu terytorialnego, zarządcami obiektów, klubami sportowymi, partnerami technicznymi, sponsorami oraz innymi podmiotami.</li>
            <li>Dane kontaktowe Organizatora są publikowane na stronie internetowej: <a href="https://www.bmxseries.pl">https://www.bmxseries.pl</a>.</li>
          </ol>
        </section>

        <section id="regulamin-charakter">
          <h3>3. Charakter zawodów</h3>
          <ol>
            <li>Zawody obejmują kategorię PRO rozgrywaną jako Puchar Polski BMX Freestyle PZKol oraz otwarte konkurencje towarzyszące AMATOR i JUNIOR U15.</li>
            <li>Kategoria PRO jest kategorią licencjonowaną.</li>
            <li>Kategorie AMATOR i JUNIOR U15 są konkurencjami otwartymi i nie wymagają posiadania licencji sportowej.</li>
            <li>Wyniki kategorii AMATOR i JUNIOR U15 nie stanowią wyników kategorii PRO i nie przyznają punktów do rankingów UCI ani innych oficjalnych klasyfikacji sportowych, chyba że komunikat organizacyjny stanowi inaczej.</li>
          </ol>
        </section>

        <section id="regulamin-kategorie">
          <h3>4. Kategorie startowe</h3>
          <h4>4.1. PRO</h4>
          <ol>
            <li>PRO jest kategorią przeznaczoną dla zawodników posiadających ważny UCI ID lub numer licencji uprawniający do udziału w zawodach.</li>
            <li>Kobiety i mężczyźni mogą uczestniczyć w tej samej sesji treningowej, kwalifikacyjnej lub finałowej, jeżeli pozwala na to format wydarzenia.</li>
            <li>Dla kobiet prowadzona jest odrębna klasyfikacja wyników.</li>
            <li>Organizator może dostosować sposób przeprowadzenia rywalizacji kobiet do liczby zgłoszonych zawodniczek, zachowując odrębną klasyfikację.</li>
          </ol>
          <h4>4.2. AMATOR</h4>
          <ol>
            <li>AMATOR jest otwartą konkurencją towarzyszącą przeznaczoną dla zawodników, którzy w dniu zawodów ukończyli 15. rok życia.</li>
            <li>Kobiety i mężczyźni mogą startować wspólnie.</li>
            <li>Organizator może utworzyć odrębną klasyfikację kobiet, jeżeli liczba uczestniczek lub warunki organizacyjne uzasadniają jej utworzenie.</li>
          </ol>
          <h4>4.3. JUNIOR U15</h4>
          <ol>
            <li>JUNIOR U15 jest otwartą konkurencją towarzyszącą dla zawodników, którzy w dniu zawodów nie ukończyli 15. roku życia.</li>
            <li>Dziewczęta i chłopcy mogą startować wspólnie.</li>
            <li>Organizator może utworzyć odrębną klasyfikację dziewcząt, jeżeli liczba uczestniczek lub warunki organizacyjne uzasadniają jej utworzenie.</li>
            <li>Zawodnik wybiera kategorię podczas rejestracji. System sprawdza zgodność wybranej kategorii z datą urodzenia i datą rozpoczęcia zawodów.</li>
            <li>Zawodnik, który kończy 15 lat dokładnie w dniu rozpoczęcia zawodów, powinien wybrać kategorię AMATOR.</li>
            <li>W przypadku wyboru kategorii niezgodnej z wiekiem system blokuje wysłanie zgłoszenia i wskazuje właściwą kategorię.</li>
          </ol>
        </section>

        <section id="regulamin-uczestnictwo">
          <h3>5. Warunki uczestnictwa</h3>
          <ol>
            <li>Warunkiem udziału w zawodach jest dokonanie prawidłowego zgłoszenia, podanie prawdziwych danych, zaakceptowanie wymaganych zgód, spełnienie kryteriów kategorii, otrzymanie statusu zaakceptowanego, dokonanie check-inu, posiadanie sprawnego roweru BMX i używanie kasku.</li>
            <li>Samo wysłanie formularza zgłoszeniowego nie oznacza automatycznego dopuszczenia do udziału.</li>
            <li>Organizator może ustanowić limit uczestników dla całych zawodów lub poszczególnych kategorii.</li>
            <li>Udział w zawodach jest bezpłatny. Organizator nie pobiera wpisowego w kategoriach PRO, AMATOR ani JUNIOR U15.</li>
          </ol>
        </section>

        <section>
          <h3>6. Licencja w kategorii PRO</h3>
          <ol>
            <li>Zawodnik zgłaszający się do kategorii PRO podaje w formularzu UCI ID / numer licencji.</li>
            <li>Organizator ma prawo zweryfikować ważność licencji przed zaakceptowaniem zgłoszenia oraz podczas check-inu.</li>
            <li>Brak ważnej licencji może skutkować niedopuszczeniem zawodnika do udziału w kategorii PRO.</li>
            <li>Jeżeli zawodnik nie spełnia warunków kategorii PRO, Organizator może zaproponować udział w kategorii otwartej, o ile zawodnik spełnia jej kryteria, dostępne są wolne miejsca i zmiana nie narusza harmonogramu ani zasad sportowych wydarzenia.</li>
            <li>Kategoria PRO jest rozgrywana zgodnie z właściwymi przepisami sportowymi PZKol i UCI dotyczącymi BMX Freestyle, niniejszym Regulaminem oraz komunikatem organizacyjnym wydarzenia.</li>
          </ol>
        </section>

        <section id="regulamin-zgloszenia">
          <h3>7. Zgłoszenia</h3>
          <ol>
            <li>Podstawową formą zgłoszenia są zapisy internetowe prowadzone przez stronę <a href="https://www.bmxseries.pl">https://www.bmxseries.pl</a>.</li>
            <li>Organizator może zamknąć zapisy internetowe przed planowanym terminem po wyczerpaniu limitu miejsc.</li>
            <li>Zapisy na miejscu mogą zostać uruchomione wyłącznie wtedy, gdy po zakończeniu lub w trakcie zapisów internetowych pozostają wolne miejsca.</li>
            <li>Jeżeli limit miejsc zostanie wyczerpany przez zgłoszenia internetowe, Organizator nie prowadzi zapisów na miejscu.</li>
            <li>Organizator może ustanowić listę rezerwową.</li>
            <li>Zgłoszenie może otrzymać status: oczekuje na weryfikację, zaakceptowane, wymaga uzupełnienia, odrzucone albo lista rezerwowa.</li>
            <li>Organizator może odmówić przyjęcia zgłoszenia z powodu wyczerpania limitu miejsc, niespełnienia kryteriów kategorii, podania niepełnych lub nieprawdziwych danych, braku wymaganych zgód, braku ważnej licencji w kategorii PRO albo wcześniejszych poważnych naruszeń zasad bezpieczeństwa.</li>
          </ol>
        </section>

        <section id="regulamin-niepelnoletni">
          <h3>8. Zawodnicy niepełnoletni</h3>
          <ol>
            <li>Zgłoszenie zawodnika niepełnoletniego wymaga podania danych rodzica lub opiekuna prawnego oraz zaakceptowania wymaganych zgód.</li>
            <li>Każdy zawodnik niepełnoletni, niezależnie od kategorii, musi podczas check-inu dostarczyć podpisane pisemne oświadczenie rodzica lub opiekuna prawnego ze zgodą na udział w zawodach.</li>
            <li>Brak pisemnego oświadczenia skutkuje niedopuszczeniem zawodnika do oficjalnych treningów oraz przejazdów konkursowych.</li>
            <li>Rodzic lub opiekun prawny odpowiada za prawidłowość przekazanych danych oraz potwierdza, że zna charakter dyscypliny i akceptuje udział dziecka.</li>
            <li>Organizator może wymagać obecności rodzica lub opiekuna prawnego podczas check-inu albo przedstawienia dodatkowego dokumentu potwierdzającego zgodę.</li>
          </ol>
        </section>

        <section>
          <h3>9. Check-in i potwierdzenie zgłoszenia</h3>
          <ol>
            <li>Zawodnik zaakceptowany powinien zgłosić się do biura zawodów w terminie wskazanym w komunikacie organizacyjnym.</li>
            <li>Podczas check-inu Organizator może zweryfikować tożsamość zawodnika, kategorię, licencję zawodnika PRO, wymagane zgody i oświadczenia, dane rodzica lub opiekuna oraz inne dokumenty wymagane do dopuszczenia do startu.</li>
            <li>Kod QR lub link potwierdzenia służy do identyfikacji zgłoszenia w systemie.</li>
            <li>Posiadanie kodu QR nie stanowi samodzielnej gwarancji dopuszczenia do udziału.</li>
            <li>O dopuszczeniu decyduje aktualny status zgłoszenia oraz prawidłowe przejście check-inu.</li>
            <li>Nieobecność podczas check-inu może skutkować skreśleniem z listy startowej i przekazaniem miejsca osobie z listy rezerwowej.</li>
          </ol>
        </section>

        <section>
          <h3>10. Harmonogram i format zawodów</h3>
          <ol>
            <li>Szczegółowy harmonogram jest publikowany w komunikacie organizacyjnym danego wydarzenia.</li>
            <li>Komunikat może określać godziny rejestracji i check-inu, treningi, kolejność kategorii, liczbę i długość przejazdów, zasady kwalifikacji i finałów, liczbę zawodników awansujących do finału oraz zasady rozstrzygania remisów.</li>
            <li>Organizator może zmienić harmonogram lub format z uwagi na liczbę uczestników, warunki pogodowe, stan obiektu, opóźnienia, awarię techniczną, konieczność zapewnienia bezpieczeństwa lub inne nieprzewidziane okoliczności.</li>
            <li>Zmiana formatu dokonana z przyczyn organizacyjnych lub bezpieczeństwa nie stanowi podstawy do roszczeń wobec Organizatora.</li>
          </ol>
        </section>

        <section>
          <h3>11. Kolejność startowa</h3>
          <ol>
            <li>Kolejność startową ustala Organizator.</li>
            <li>Kolejność może wynikać z losowania, kolejności zgłoszeń, ustawienia przez Organizatora, wyników kwalifikacji, rankingu lub innych zasad określonych w komunikacie organizacyjnym.</li>
            <li>Zawodnik powinien być gotowy do startu w momencie wywołania.</li>
            <li>Nieobecność zawodnika w momencie wywołania może skutkować utratą przejazdu, przesunięciem na koniec grupy albo skreśleniem z listy startowej.</li>
          </ol>
        </section>

        <section>
          <h3>12. Sędziowanie</h3>
          <ol>
            <li>Przejazdy są oceniane przez wyznaczony zespół sędziowski.</li>
            <li>Kategoria PRO jest oceniana zgodnie z właściwymi zasadami BMX Freestyle oraz formatem określonym w komunikacie organizacyjnym.</li>
            <li>Kategorie AMATOR i JUNIOR U15 mogą być oceniane według uproszczonej formuły dostosowanej do poziomu uczestników i charakteru konkurencji.</li>
            <li>Przy ocenie przejazdu mogą być brane pod uwagę trudność trików, jakość wykonania, wysokość i dynamika, wykorzystanie przeszkód, różnorodność, styl, płynność i ogólne wrażenie.</li>
            <li>Decyzje sędziów dotyczące subiektywnej oceny sportowej przejazdu są ostateczne.</li>
            <li>Korekcie mogą podlegać oczywiste błędy techniczne, rachunkowe, proceduralne albo błędy w publikacji wyników.</li>
          </ol>
        </section>

        <section>
          <h3>13. Bezpieczeństwo i wyposażenie</h3>
          <ol>
            <li>Używanie kasku jest obowiązkowe podczas oficjalnych treningów oraz przejazdów konkursowych.</li>
            <li>Organizator zaleca korzystanie z dodatkowych ochraniaczy odpowiednich do wieku, poziomu umiejętności i wykonywanych ewolucji.</li>
            <li>Zawodnik odpowiada za sprawność techniczną roweru, dobór sprzętu, ocenę własnych umiejętności, wykonywanie ewolucji odpowiednich do poziomu oraz przestrzeganie zasad poruszania się po obiekcie.</li>
            <li>Organizator, sędzia, osoba odpowiedzialna za bezpieczeństwo lub obsługa techniczna mogą nie dopuścić zawodnika do jazdy, przerwać przejazd albo nakazać opuszczenie obiektu, jeżeli sprzęt, stan zdrowia lub zachowanie zawodnika stwarzają zagrożenie.</li>
            <li>Zabronione jest korzystanie z obiektu w sposób sprzeczny z poleceniami Organizatora lub zasadami bezpieczeństwa.</li>
          </ol>
        </section>

        <section>
          <h3>14. Stan zdrowia i ryzyko sportowe</h3>
          <ol>
            <li>BMX Freestyle jest dyscypliną sportową wiążącą się z ryzykiem upadków, urazów oraz kontuzji.</li>
            <li>Zawodnik, a w przypadku zawodnika niepełnoletniego jego rodzic lub opiekun prawny, potwierdza, że stan zdrowia zawodnika pozwala na udział w zawodach.</li>
            <li>Zawodnik powinien niezwłocznie poinformować Organizatora lub zabezpieczenie medyczne o urazie albo pogorszeniu samopoczucia.</li>
            <li>W przypadku podejrzenia urazu Organizator lub zabezpieczenie medyczne może nie dopuścić zawodnika do startu albo dalszego udziału.</li>
          </ol>
        </section>

        <section>
          <h3>15. Zachowanie uczestników</h3>
          <ol>
            <li>Uczestnicy powinni zachowywać się zgodnie z zasadami sportowej rywalizacji, wzajemnego szacunku i bezpieczeństwa.</li>
            <li>Zabronione jest agresywne, obraźliwe lub dyskryminujące zachowanie, celowe stwarzanie zagrożenia, zakłócanie przejazdu innego zawodnika, niestosowanie się do poleceń, udział pod wpływem alkoholu lub środków odurzających, niszczenie infrastruktury oraz manipulowanie wynikami lub danymi zgłoszeniowymi.</li>
            <li>Naruszenie zasad może skutkować ostrzeżeniem, utratą przejazdu, obniżeniem wyniku, dyskwalifikacją, usunięciem z terenu wydarzenia albo odmową przyjęcia zgłoszenia na kolejne wydarzenia.</li>
          </ol>
        </section>

        <section id="regulamin-protesty">
          <h3>16. Protesty</h3>
          <ol>
            <li>Oficjalne protesty są składane wyłącznie w formie pisemnej, pocztą elektroniczną.</li>
            <li>Adres e-mail właściwy do składania protestów oraz termin ich składania są wskazywane w komunikacie organizacyjnym danego wydarzenia.</li>
            <li>Protest powinien zawierać imię i nazwisko osoby składającej, dane zawodnika, kategorię startową, opis zdarzenia albo decyzji, uzasadnienie oraz dostępne materiały potwierdzające wskazane okoliczności.</li>
            <li>W imieniu zawodnika niepełnoletniego protest składa rodzic lub opiekun prawny.</li>
            <li>Protest może dotyczyć naruszenia Regulaminu, błędu identyfikacji zawodnika, błędu proceduralnego, rachunkowego albo błędu w publikacji wyników.</li>
            <li>Protest nie może dotyczyć subiektywnej oceny sportowej przejazdu dokonanej przez sędziów.</li>
            <li>Protest złożony po terminie, bez wymaganych danych lub w innej formie może pozostać bez rozpoznania.</li>
          </ol>
        </section>

        <section>
          <h3>17. Wyniki i klasyfikacje</h3>
          <ol>
            <li>Dla każdej imprezy prowadzone są oddzielne wyniki.</li>
            <li>Regulamin nie ustanawia wspólnej punktacji ani klasyfikacji generalnej łączącej poszczególne wydarzenia.</li>
            <li>Wyniki są publikowane przez Organizatora na stronie internetowej albo w innym oficjalnym kanale komunikacji.</li>
            <li>W kategorii PRO wyniki kobiet i mężczyzn są klasyfikowane oddzielnie.</li>
            <li>W kategoriach AMATOR i JUNIOR U15 Organizator może prowadzić wspólną klasyfikację albo utworzyć odrębną klasyfikację żeńską, zależnie od liczby uczestniczek i przyjętego formatu.</li>
          </ol>
        </section>

        <section>
          <h3>18. Nagrody</h3>
          <ol>
            <li>Informacje o nagrodach są publikowane w komunikacie organizacyjnym danego wydarzenia.</li>
            <li>Organizator może przyznać puchary, medale, dyplomy, nagrody rzeczowe, nagrody finansowe lub wyróżnienia dodatkowe.</li>
            <li>Rodzaj i wartość nagród mogą różnić się pomiędzy kategoriami oraz wydarzeniami.</li>
          </ol>
        </section>

        <section>
          <h3>19. Wizerunek</h3>
          <ol>
            <li>Podczas zawodów mogą być wykonywane zdjęcia, nagrania filmowe, transmisje oraz relacje medialne.</li>
            <li>Zasady utrwalania i wykorzystywania wizerunku uczestnika wynikają z treści odpowiedniej zgody udzielanej w procesie rejestracji.</li>
            <li>W przypadku osoby niepełnoletniej wymagane zgody składa rodzic lub opiekun prawny.</li>
            <li>Niniejszy Regulamin nie rozszerza zakresu zgody na wykorzystanie wizerunku ponad treść zgody zaakceptowanej przez uczestnika lub jego opiekuna.</li>
          </ol>
        </section>

        <section>
          <h3>20. Dane osobowe</h3>
          <ol>
            <li>Dane osobowe uczestników są przetwarzane w celu przyjmowania i weryfikacji zgłoszeń, organizacji zawodów, tworzenia list startowych i wyników, prowadzenia check-inu, komunikacji organizacyjnej, zapewnienia bezpieczeństwa, rozpatrywania protestów i realizacji obowiązków prawnych Organizatora.</li>
            <li>Szczegółowe zasady przetwarzania danych osobowych są określone w klauzuli informacyjnej dostępnej w formularzu zgłoszeniowym i na stronie internetowej.</li>
            <li>Kod QR stosowany podczas check-inu zawiera link do strony potwierdzenia zgłoszenia i nie powinien zawierać bezpośrednio danych osobowych zawodnika.</li>
          </ol>
        </section>

        <section>
          <h3>21. Komunikacja e-mail i SMS</h3>
          <ol>
            <li>Organizator może przesyłać informacje organizacyjne na adres e-mail lub numer telefonu podany podczas rejestracji.</li>
            <li>Wiadomości mogą dotyczyć statusu zgłoszenia, potwierdzenia udziału, check-inu, harmonogramu, zmian organizacyjnych, bezpieczeństwa, odwołania, przerwania lub przesunięcia wydarzenia.</li>
            <li>W przypadku zawodnika niepełnoletniego komunikacja może być kierowana do rodzica lub opiekuna prawnego.</li>
            <li>Brak doręczenia wiadomości e-mail albo SMS nie zwalnia uczestnika z obowiązku sprawdzania aktualnych komunikatów Organizatora.</li>
          </ol>
        </section>

        <section>
          <h3>22. Zmiana, przerwanie lub odwołanie zawodów</h3>
          <ol>
            <li>Organizator może zmienić harmonogram, skrócić, przerwać, przełożyć lub odwołać zawody z ważnych powodów, w szczególności z powodu warunków pogodowych, zagrożenia bezpieczeństwa, stanu obiektu, awarii technicznej, decyzji zarządcy obiektu, decyzji służb, siły wyższej lub innych okoliczności uniemożliwiających bezpieczne przeprowadzenie wydarzenia.</li>
            <li>Organizator przekazuje informację o zmianach możliwie szybko za pośrednictwem dostępnych kanałów komunikacji.</li>
            <li>Przy podejmowaniu decyzji pierwszeństwo ma bezpieczeństwo zawodników, obsługi i publiczności.</li>
          </ol>
        </section>

        <section>
          <h3>23. Odpowiedzialność</h3>
          <ol>
            <li>Organizator odpowiada na zasadach wynikających z obowiązujących przepisów prawa.</li>
            <li>Zawodnik ponosi odpowiedzialność za korzystanie ze sprawnego sprzętu, wykonywanie ewolucji dostosowanych do własnych umiejętności oraz przestrzeganie zasad bezpieczeństwa.</li>
            <li>Organizator nie odpowiada za szkody wynikające wyłącznie z naruszenia Regulaminu przez uczestnika, używania niesprawnego lub niewłaściwego sprzętu, wykonywania ewolucji niedostosowanych do umiejętności, zignorowania poleceń albo działania osoby trzeciej, chyba że odpowiedzialność Organizatora wynika z bezwzględnie obowiązujących przepisów prawa.</li>
            <li>Organizator nie odpowiada za rzeczy pozostawione bez nadzoru, zagubione albo skradzione na terenie wydarzenia, z zastrzeżeniem obowiązujących przepisów prawa.</li>
          </ol>
        </section>

        <section id="regulamin-koncowe">
          <h3>24. Postanowienia końcowe</h3>
          <ol>
            <li>W sprawach nieuregulowanych w Regulaminie decyzję podejmuje Organizator, z uwzględnieniem obowiązujących przepisów prawa, zasad bezpieczeństwa oraz właściwych przepisów sportowych PZKol i UCI w odniesieniu do kategorii PRO.</li>
            <li>Organizator może zmienić Regulamin z ważnych przyczyn, w szczególności z powodu zmiany przepisów prawa, przepisów sportowych, wymogów PZKol, zarządcy obiektu lub służb, potrzeby poprawy bezpieczeństwa albo zmian technicznych w systemie zapisów.</li>
            <li>Aktualna wersja Regulaminu jest publikowana pod adresem <a href="/regulamin" data-link>https://www.bmxseries.pl/regulamin</a>.</li>
            <li>Zmiany Regulaminu obowiązują od momentu ich opublikowania, chyba że Organizator wskaże późniejszy termin.</li>
            <li>W przypadku istotnej zmiany dotyczącej już zaakceptowanych zgłoszeń Organizator powinien poinformować uczestników za pośrednictwem dostępnych kanałów komunikacji.</li>
          </ol>
        </section>
      </article>
    </section>
  `;
}

function faqAnswerHtml(item) {
  return item.answer.map((paragraph) => `<p>${item.html ? paragraph : escapeHtml(paragraph)}</p>`).join("");
}

function faqAccordion(items, prefix) {
  return `
    <div class="faq-list" data-faq-accordion>
      ${items.map((item, index) => {
        const buttonId = `${prefix}-button-${item.id}`;
        const panelId = `${prefix}-panel-${item.id}`;
        return `
          <article class="faq-item">
            <h3>
              <button class="faq-question" id="${escapeHtml(buttonId)}" type="button" aria-expanded="false" aria-controls="${escapeHtml(panelId)}">
                <span>${escapeHtml(item.question)}</span>
                <span class="faq-icon" aria-hidden="true"></span>
              </button>
            </h3>
            <div class="faq-answer" id="${escapeHtml(panelId)}" role="region" aria-labelledby="${escapeHtml(buttonId)}" hidden>
              <div class="faq-answer-inner">${faqAnswerHtml(item)}</div>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function faqSection({ home = false } = {}) {
  const items = home ? faqItems.filter((item) => item.featured).slice(0, 10) : faqItems;
  return `
    <section class="section ${home ? "home-faq-section" : ""}">
      <div class="section-heading">
        <p class="eyebrow">FAQ</p>
        <h2>${home ? "Najczęstsze pytania" : "FAQ"}</h2>
        <p>${home ? "Najważniejsze odpowiedzi przed wysłaniem zgłoszenia." : "Pełna lista pytań i odpowiedzi dotyczących zapisów, kategorii i udziału w zawodach."}</p>
      </div>
      ${faqAccordion(items, home ? "home-faq" : "faq")}
      ${home ? '<div class="faq-more"><a class="secondary-btn" href="/faq" data-link>Zobacz wszystkie pytania</a></div>' : ""}
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
      <p>Wyniki i rankingi pojawią się w kolejnych etapach rozwoju systemu BMX Series.</p>
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
  setupFaqAccordions();
  app.focus({ preventScroll: true });
}

function setupFaqAccordions() {
  document.querySelectorAll("[data-faq-accordion]").forEach((accordion) => {
    accordion.querySelectorAll(".faq-question").forEach((button) => {
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      if (!panel) return;
      button.addEventListener("click", () => {
        const open = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!open));
        button.closest(".faq-item")?.classList.toggle("is-open", !open);
        panel.hidden = false;
        panel.style.maxHeight = open ? `${panel.scrollHeight}px` : "0px";
        requestAnimationFrame(() => {
          panel.style.maxHeight = open ? "0px" : `${panel.scrollHeight}px`;
        });
        if (open) {
          panel.addEventListener("transitionend", () => {
            if (button.getAttribute("aria-expanded") === "false") panel.hidden = true;
          }, { once: true });
        }
      });
    });
  });
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
