const { createClient } = require("@supabase/supabase-js");

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function json(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function readBody(request) {
  if (!request.body) return {};
  return typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body;
}

function cleanText(value, maxLength = 220) {
  return String(value || "").trim().slice(0, maxLength);
}

module.exports = {
  cleanText,
  getSupabase,
  json,
  readBody,
};
