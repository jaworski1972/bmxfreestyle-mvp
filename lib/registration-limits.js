const crypto = require("crypto");

const OCCUPYING_STATUSES = new Set(["pending_review", "accepted", "needs_info"]);
const WAITLIST_STATUS = "waitlist";
const DEFAULT_REVIEW_STATUS = "pending_review";

const DUPLICATE_REGISTRATION_MESSAGE = "Ten zawodnik jest już zapisany na wybrane zawody. Nie wysyłaj ponownego zgłoszenia. W razie potrzeby zmiany danych skontaktuj się z organizatorem.";
const WAITLIST_REGISTRATION_MESSAGE = "Limit miejsc w tej kategorii został wyczerpany. Zgłoszenie zostało dodane do listy rezerwowej.";
const ACCEPTED_REGISTRATION_MESSAGE = "Zgłoszenie zostało przyjęte do systemu i oczekuje na weryfikację organizatora.";
const CATEGORY_FULL_STATUS_MESSAGE = "Limit miejsc w tej kategorii został wyczerpany. Nie można zmienić statusu zgłoszenia na zajmujący miejsce.";

function normalizeIdentityPart(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function identityPayload(payload = {}) {
  return {
    firstName: normalizeIdentityPart(payload.first_name ?? payload.firstName),
    lastName: normalizeIdentityPart(payload.last_name ?? payload.lastName),
    birthDate: String(payload.birth_date ?? payload.birthDate ?? "").trim(),
  };
}

function athleteIdentityBase(payload = {}) {
  const identity = identityPayload(payload);
  return `${identity.firstName}|${identity.lastName}|${identity.birthDate}`;
}

function athleteIdentityKey(payload = {}) {
  return crypto.createHash("sha256").update(athleteIdentityBase(payload)).digest("hex");
}

function duplicateIdentityMatches(existing = {}, payload = {}) {
  const left = identityPayload(existing);
  const right = identityPayload(payload);
  return Boolean(
    left.firstName
    && left.lastName
    && left.birthDate
    && left.firstName === right.firstName
    && left.lastName === right.lastName
    && left.birthDate === right.birthDate
  );
}

function statusOccupiesCapacity(status) {
  return OCCUPYING_STATUSES.has(String(status || ""));
}

function capacityValue(capacity) {
  if (capacity === null || capacity === undefined || capacity === "") return null;
  const number = Number(capacity);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function statusForCapacity(category = {}, occupiedCount = 0) {
  const capacity = capacityValue(category.capacity);
  if (capacity === null) {
    return {
      status: DEFAULT_REVIEW_STATUS,
      full: false,
      message: ACCEPTED_REGISTRATION_MESSAGE,
    };
  }
  if (Number(occupiedCount) >= capacity) {
    return {
      status: WAITLIST_STATUS,
      full: true,
      message: WAITLIST_REGISTRATION_MESSAGE,
    };
  }
  return {
    status: DEFAULT_REVIEW_STATUS,
    full: false,
    message: ACCEPTED_REGISTRATION_MESSAGE,
  };
}

// Zamiast listy rezerwowej: znajduje pierwszą grupę (1, 2, 3...) w danej
// kategorii, która ma jeszcze wolne miejsce, na podstawie liczby zajmujących
// miejsce zgłoszeń w każdej grupie. `occupiedCountByGroup` to funkcja
// async (groupNumber) => count, żeby caller mógł zapytać bazę leniwie,
// grupa po grupie, zamiast ściągać wszystko naraz.
async function groupForCapacity(category = {}, occupiedCountByGroup) {
  const capacity = capacityValue(category.capacity);
  if (capacity === null) {
    return {
      groupNumber: 1,
      status: DEFAULT_REVIEW_STATUS,
      message: ACCEPTED_REGISTRATION_MESSAGE,
    };
  }

  let groupNumber = 1;
  // Twardy limit bezpieczeństwa, żeby błąd w danych nie wywołał pętli w nieskończoność.
  const MAX_GROUPS = 200;
  while (groupNumber <= MAX_GROUPS) {
    const count = await occupiedCountByGroup(groupNumber);
    if (Number(count) < capacity) break;
    groupNumber += 1;
  }

  return {
    groupNumber,
    status: DEFAULT_REVIEW_STATUS,
    message: groupNumber > 1
      ? `Zgłoszenie zostało przyjęte do systemu (Grupa ${groupNumber}) i oczekuje na weryfikację organizatora.`
      : ACCEPTED_REGISTRATION_MESSAGE,
  };
}

function countCategoryStatuses(registrations = [], categoryId) {
  return registrations.reduce((summary, registration) => {
    if (categoryId && registration.category_id !== categoryId && registration.categoryId !== categoryId) return summary;
    const status = registration.status;
    if (statusOccupiesCapacity(status)) summary.occupied += 1;
    if (status === WAITLIST_STATUS) summary.waitlist += 1;
    return summary;
  }, { occupied: 0, waitlist: 0 });
}

function availabilityForCategory(category = {}, registrations = []) {
  const counts = countCategoryStatuses(registrations, category.id);
  const capacity = capacityValue(category.capacity);
  const isUnlimited = capacity === null;
  return {
    occupiedCount: counts.occupied,
    waitlistCount: counts.waitlist,
    availableCount: isUnlimited ? null : Math.max(capacity - counts.occupied, 0),
    isUnlimited,
    isFull: !isUnlimited && counts.occupied >= capacity,
  };
}

// Rozbicie zajętości kategorii na poszczególne grupy startowe — do panelu
// admina, żeby widzieć "Grupa 1: 20/20", "Grupa 2: 6/20" zamiast jednej
// zbiorczej liczby + listy rezerwowej.
function groupBreakdownForCategory(category = {}, registrations = []) {
  const capacity = capacityValue(category.capacity);
  const byGroup = new Map();

  registrations.forEach((registration) => {
    const categoryId = registration.category_id ?? registration.categoryId;
    if (category.id && categoryId !== category.id) return;
    if (!statusOccupiesCapacity(registration.status)) return;
    const groupNumber = Number(registration.group_number ?? registration.groupNumber ?? 1) || 1;
    byGroup.set(groupNumber, (byGroup.get(groupNumber) || 0) + 1);
  });

  const highestGroup = Math.max(1, ...Array.from(byGroup.keys()));
  const groups = [];
  for (let groupNumber = 1; groupNumber <= highestGroup; groupNumber += 1) {
    const occupiedCount = byGroup.get(groupNumber) || 0;
    groups.push({
      groupNumber,
      occupiedCount,
      capacity,
      isFull: capacity !== null && occupiedCount >= capacity,
    });
  }
  return groups;
}

function capacityDisplay(category = {}) {
  const capacity = capacityValue(category.capacity);
  if (capacity === null) return "Brak limitu miejsc";
  const occupied = Number(category.occupiedCount || 0);
  const suffix = occupied >= capacity ? " — lista rezerwowa" : "";
  return `${occupied} / ${capacity} miejsc zajętych${suffix}`;
}

module.exports = {
  ACCEPTED_REGISTRATION_MESSAGE,
  CATEGORY_FULL_STATUS_MESSAGE,
  DEFAULT_REVIEW_STATUS,
  DUPLICATE_REGISTRATION_MESSAGE,
  OCCUPYING_STATUSES,
  WAITLIST_REGISTRATION_MESSAGE,
  WAITLIST_STATUS,
  athleteIdentityBase,
  athleteIdentityKey,
  availabilityForCategory,
  capacityDisplay,
  capacityValue,
  countCategoryStatuses,
  duplicateIdentityMatches,
  groupBreakdownForCategory,
  groupForCapacity,
  normalizeIdentityPart,
  statusForCapacity,
  statusOccupiesCapacity,
};
