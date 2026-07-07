const { createSessionToken, sessionFromRequest, userFromCredentials } = require("../lib/admin-auth");
const { json, readBody } = require("../lib/supabase");

function publicUser(user) {
  return {
    login: user.login,
    role: user.role,
    access: user.access,
    label: user.label,
  };
}

module.exports = async function handler(request, response) {
  try {
    if (request.method === "POST") {
      const body = readBody(request);
      const user = userFromCredentials(body.login, body.password);
      if (!user) {
        json(response, 403, { ok: false, error: "Nieprawidłowy login lub hasło." });
        return;
      }

      const session = createSessionToken(user);
      json(response, 200, {
        ok: true,
        user: publicUser(user),
        token: session.token,
        expiresAt: session.expiresAt,
      });
      return;
    }

    if (request.method === "GET") {
      const session = sessionFromRequest(request);
      if (!session) {
        json(response, 401, { ok: false, error: "Sesja wygasła. Zaloguj się ponownie." });
        return;
      }
      json(response, 200, { ok: true, user: publicUser(session), expiresAt: session.expiresAt });
      return;
    }

    json(response, 405, { ok: false, error: "Method not allowed." });
  } catch (error) {
    json(response, 500, { ok: false, error: error.message || "Nie udało się uwierzytelnić." });
  }
};
