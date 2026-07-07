function normalizePolishPhone(phone) {
  const raw = String(phone ?? "").trim();

  if (!raw) {
    return { normalizedPhone: null, isValid: false, reason: "empty" };
  }

  const compact = raw.replace(/[\s\-().]/g, "");
  const digits = raw.replace(/\D/g, "");

  if (/^\+48\d{9}$/.test(compact)) {
    return { normalizedPhone: compact, isValid: true, reason: "ok" };
  }

  if (/^\d{9}$/.test(digits)) {
    return { normalizedPhone: `+48${digits}`, isValid: true, reason: "ok" };
  }

  if (/^48\d{9}$/.test(digits)) {
    return { normalizedPhone: `+${digits}`, isValid: true, reason: "ok" };
  }

  if (/^0048\d{9}$/.test(digits)) {
    return { normalizedPhone: `+48${digits.slice(4)}`, isValid: true, reason: "ok" };
  }

  if (compact.startsWith("+") && !compact.startsWith("+48")) {
    return { normalizedPhone: null, isValid: false, reason: "unsupported_country" };
  }

  return {
    normalizedPhone: null,
    isValid: false,
    reason: digits.length ? "invalid_length" : "invalid",
  };
}

module.exports = {
  normalizePolishPhone,
};
