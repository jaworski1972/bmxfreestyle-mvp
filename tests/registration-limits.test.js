const assert = require("assert/strict");
const {
  DUPLICATE_REGISTRATION_MESSAGE,
  WAITLIST_REGISTRATION_MESSAGE,
  availabilityForCategory,
  capacityDisplay,
  duplicateIdentityMatches,
  groupForCapacity,
  statusForCapacity,
  statusOccupiesCapacity,
} = require("../lib/registration-limits");

async function run() {
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

  // groupForCapacity: bez limitu zawsze trafia do grupy 1
  const unlimited = await groupForCapacity({ capacity: null }, async () => 999);
  assert.equal(unlimited.groupNumber, 1);
  assert.equal(unlimited.status, "pending_review");

  // groupForCapacity: grupa 1 ma miejsce
  const roomInGroupOne = await groupForCapacity({ capacity: 20 }, async (groupNumber) => (groupNumber === 1 ? 15 : 0));
  assert.equal(roomInGroupOne.groupNumber, 1);
  assert.equal(roomInGroupOne.status, "pending_review");

  // groupForCapacity: grupa 1 pełna -> przydział do grupy 2
  const overflowToGroupTwo = await groupForCapacity({ capacity: 20 }, async (groupNumber) => (groupNumber === 1 ? 20 : 3));
  assert.equal(overflowToGroupTwo.groupNumber, 2);
  assert.equal(overflowToGroupTwo.message.includes("Grupa 2"), true);

  // groupForCapacity: grupy 1 i 2 pełne -> przydział do grupy 3
  const overflowToGroupThree = await groupForCapacity({ capacity: 20 }, async (groupNumber) => (groupNumber <= 2 ? 20 : 0));
  assert.equal(overflowToGroupThree.groupNumber, 3);
  assert.equal(overflowToGroupThree.message.includes("Grupa 3"), true);
}

run().then(() => {
  console.log("registration-limits.test.js: OK");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
