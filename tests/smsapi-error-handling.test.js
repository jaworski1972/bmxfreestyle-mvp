const assert = require("assert/strict");
const { sendSms, sendSmsNotification } = require("../lib/sms");

const originalFetch = global.fetch;
const originalConsoleError = console.error;
const originalEnv = { ...process.env };

function response(body, { status = 200, statusText = "OK" } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    async text() {
      return body;
    },
  };
}

function configureSmsapi() {
  process.env.SMS_PROVIDER = "smsapi";
  process.env.SMS_API_TOKEN = "test-token";
  process.env.SMS_FROM = "BMX";
  process.env.SMS_DRY_RUN = "false";
  process.env.SMSAPI_TIMEOUT_MS = "20";
}

async function withMockFetch(mock, callback) {
  global.fetch = mock;
  try {
    await callback();
  } finally {
    global.fetch = originalFetch;
  }
}

function fakeSupabase() {
  const inserts = [];
  return {
    inserts,
    from(table) {
      assert.equal(table, "sms_logs");
      return {
        async insert(payload) {
          inserts.push(payload);
          return { data: null, error: null };
        },
      };
    },
  };
}

async function run() {
  configureSmsapi();
  console.error = () => {};

  await withMockFetch(async () => response(JSON.stringify({ list: [{ id: "smsapi-ok-1" }] })), async () => {
    const result = await sendSms({ to: "+48500100100", message: "Test SMS" });
    assert.deepEqual(result, {
      status: "sent",
      providerMessageId: "smsapi-ok-1",
      error: null,
      to: "+48500100100",
    });
  });

  await withMockFetch(async () => response(JSON.stringify({ error: 14, message: "Invalid from field" })), async () => {
    const supabase = fakeSupabase();
    const result = await sendSmsNotification({
      supabase,
      event: { id: "event-1" },
      registration: {
        id: "registration-1",
        first_name: "Test",
        last_name: "Rider",
        phone: "+48500100101",
        status: "accepted",
        event_id: "event-1",
        event_categories: { code: "PRO" },
      },
      message: "Test SMS",
      force: true,
    });

    assert.equal(result.status, "failed");
    assert.equal(result.error, "SMSAPI error 14: Invalid from field");
    assert.equal(supabase.inserts.length, 1);
    assert.equal(supabase.inserts[0].send_status, "failed");
    assert.equal(supabase.inserts[0].provider_message_id, null);
    assert.equal(supabase.inserts[0].error_message, "SMSAPI error 14: Invalid from field");
  });

  await withMockFetch(async () => response(JSON.stringify({ message: "Unauthorized" }), { status: 401, statusText: "Unauthorized" }), async () => {
    const result = await sendSms({ to: "+48500100102", message: "Test SMS" });
    assert.equal(result.status, "failed");
    assert.equal(result.providerMessageId, null);
    assert.equal(result.error, "Unauthorized");
  });

  await withMockFetch(async () => response(JSON.stringify({ message: "Server error" }), { status: 500, statusText: "Internal Server Error" }), async () => {
    const result = await sendSms({ to: "+48500100105", message: "Test SMS" });
    assert.equal(result.status, "failed");
    assert.equal(result.providerMessageId, null);
    assert.equal(result.error, "Server error");
  });

  await withMockFetch(async () => response("not-json"), async () => {
    const result = await sendSms({ to: "+48500100103", message: "Test SMS" });
    assert.equal(result.status, "failed");
    assert.equal(result.providerMessageId, null);
    assert.equal(result.error, "SMSAPI returned invalid JSON.");
  });

  await withMockFetch(async () => response(""), async () => {
    const result = await sendSms({ to: "+48500100106", message: "Test SMS" });
    assert.equal(result.status, "failed");
    assert.equal(result.providerMessageId, null);
    assert.equal(result.error, "SMSAPI returned empty response.");
  });

  await withMockFetch((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = new Error("Aborted");
      error.name = "AbortError";
      reject(error);
    });
  }), async () => {
    const result = await sendSms({ to: "+48500100104", message: "Test SMS" });
    assert.equal(result.status, "failed");
    assert.equal(result.providerMessageId, null);
    assert.equal(result.error, "SMSAPI request timed out.");
  });
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    global.fetch = originalFetch;
    console.error = originalConsoleError;
    process.env = originalEnv;
  });
