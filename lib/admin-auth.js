const crypto = require("crypto");

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(String(value || ""), "base64url").toString("utf8");
}

function authSecret() {
  return process.env.ADMIN_AUTH_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.ADMIN_PASSWORD
    || "bmx-freestyle-local-admin-secret";
}

function safeEqual(first, second) {
  const left = Buffer.from(String(first || ""));
  const right = Buffer.from(String(second || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function signPayload(encodedPayload) {
  return crypto.createHmac("sha256", authSecret()).update(encodedPayload).digest("base64url");
}

function createSessionToken(user) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = {
    login: user.login,
    role: user.role,
    access: user.access,
    label: user.label,
    exp: expiresAt,
    iat: Date.now(),
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return {
    token: `${encoded}.${signPayload(encoded)}`,
    expiresAt,
  };
}

function verifySessionToken(token) {
  const [encodedPayload, signature] = String(token || "").split(".");
  if (!encodedPayload || !signature) return null;
  if (!safeEqual(signature, signPayload(encodedPayload))) return null;

  let payload = null;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch (error) {
    return null;
  }

  if (!payload?.exp || Number(payload.exp) < Date.now()) return null;
  return {
    login: payload.login || "",
    role: payload.role || "",
    access: payload.access || "",
    label: payload.label || "",
    expiresAt: Number(payload.exp),
  };
}

function userFromCredentials(login, password) {
  const loginValue = String(login || "").trim().toLowerCase();
  const passwordValue = String(password || "");
  const adminLogin = String(process.env.ADMIN_LOGIN || "admin").trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");

  if (adminPassword && loginValue === adminLogin && safeEqual(passwordValue, adminPassword)) {
    return {
      login: adminLogin,
      role: "organizer",
      access: "admin",
      label: "Organizator BMX Freestyle Polska",
    };
  }

  return null;
}

function tokenFromRequest(request) {
  const auth = String(request.headers.authorization || request.headers.Authorization || "").trim();
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return String(request.headers["x-bmx-auth-token"] || "").trim();
}

function sessionFromRequest(request) {
  return verifySessionToken(tokenFromRequest(request));
}

function isAdminSession(session) {
  return Boolean(session && (session.access === "admin" || session.role === "organizer"));
}

function requireAdmin(request) {
  const session = sessionFromRequest(request);
  return isAdminSession(session) ? session : null;
}

module.exports = {
  createSessionToken,
  isAdminSession,
  requireAdmin,
  sessionFromRequest,
  userFromCredentials,
  verifySessionToken,
};
