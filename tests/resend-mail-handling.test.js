const assert = require("assert/strict");
const { parseResendSendResponse, sendMail } = require("../lib/mail");

const originalEnv = { ...process.env };

function fakeClient(response) {
  return {
    emails: {
      async send(payload) {
        assert.equal(payload.from, "BMX Series <zapisy@example.test>");
        assert.equal(payload.to, "rider@example.test");
        assert.equal(payload.replyTo, "kontakt@example.test");
        assert.equal(payload.subject, "Test");
        assert.equal(payload.html, "<p>Test</p>");
        return response;
      },
    },
  };
}

async function run() {
  process.env.RESEND_API_KEY = "test-key";
  process.env.MAIL_FROM = "BMX Series <zapisy@example.test>";
  process.env.MAIL_REPLY_TO = "kontakt@example.test";

  assert.deepEqual(parseResendSendResponse({ data: { id: "email-ok-1" }, error: null }), {
    providerMessageId: "email-ok-1",
  });

  await assert.rejects(
    () => sendMail({
      to: "rider@example.test",
      subject: "Test",
      html: "<p>Test</p>",
      client: fakeClient({
        data: null,
        error: { name: "validation_error", message: "The bmxseries.pl domain is not verified." },
      }),
    }),
    /Resend email error: The bmxseries\.pl domain is not verified\. validation_error/,
  );

  await assert.rejects(
    () => sendMail({
      to: "rider@example.test",
      subject: "Test",
      html: "<p>Test</p>",
      client: fakeClient(null),
    }),
    /Resend returned empty response\./,
  );

  await assert.rejects(
    () => sendMail({
      to: "rider@example.test",
      subject: "Test",
      html: "<p>Test</p>",
      client: fakeClient({ data: {}, error: null }),
    }),
    /Resend did not confirm email delivery\./,
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.env = originalEnv;
  });
