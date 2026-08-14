const assert = require("assert/strict");
const {
  DUPLICATE_REGISTRATION_MESSAGE,
  WAITLIST_REGISTRATION_MESSAGE,
  availabilityForCategory,
  capacityDisplay,
  duplicateIdentityMatches,
  statusForCapacity,
  statusOccupiesCapacity,
} = require("../lib/registration-limits");

function run() {
  assert.equal(
    duplicateIdentityMatches(
      { first_name: " Jan   Kowalski ", last_name: " Nowak ", birth_date: "2010-08-16", status: "rejected" },
      { first_name: "jan kowalski", last_name: "nowak", birth_date: "2010-08-16" },
    ),
    true,
    "duplicate check ignores case and repeated spaces and includes rejected statuses",
  );

  assert.equal(
    duplicateIdentityMatches(
      { first_name: "Jan", last_name: "Nowak", birth_date: "2010-08-16" },
      { first_name: "Jan", last_name: "Nowak", birth_date: "2010-08-17" },
    ),
    false,
    "birth date is part of duplicate identity",
  );

  assert.equal(statusOccupiesCapacity("pending_review"), true);
  assert.equal(statusOccupiesCapacity("accepted"), true);
  assert.equal(statusOccupiesCapacity("needs_info"), true);
  assert.equal(statusOccupiesCapacity("rejected"), false);
  assert.equal(statusOccupiesCapacity("waitlist"), false);

  assert.deepEqual(statusForCapacity({ capacity: null }, 999), {
    status: "pending_review",
    full: false,
    message: "Zgłoszenie zostało przyjęte do systemu i oczekuje na weryfikację organizatora.",
  });

  assert.deepEqual(statusForCapacity({ capacity: 20 }, 20), {
    status: "waitlist",
    full: true,
    message: WAITLIST_REGISTRATION_MESSAGE,
  });

  assert.deepEqual(statusForCapacity({ capacity: 30 }, 29), {
    status: "pending_review",
    full: false,
    message: "Zgłoszenie zostało przyjęte do systemu i oczekuje na weryfikację organizatora.",
  });

  const availability = availabilityForCategory(
    { id: "category-amator", capacity: 30 },
    [
      { category_id: "category-amator", status: "pending_review" },
      { category_id: "category-amator", status: "accepted" },
      { category_id: "category-amator", status: "needs_info" },
      { category_id: "category-amator", status: "waitlist" },
      { category_id: "category-amator", status: "rejected" },
    ],
  );
  assert.equal(availability.occupiedCount, 3);
  assert.equal(availability.waitlistCount, 1);
  assert.equal(availability.availableCount, 27);
  assert.equal(availability.isFull, false);

  assert.equal(capacityDisplay({ capacity: null }), "Brak limitu miejsc");
  assert.equal(capacityDisplay({ capacity: 20, occupiedCount: 20 }), "20 / 20 miejsc zajętych — lista rezerwowa");
  assert.equal(DUPLICATE_REGISTRATION_MESSAGE.startsWith("Ten zawodnik jest już zapisany"), true);
}

run();
