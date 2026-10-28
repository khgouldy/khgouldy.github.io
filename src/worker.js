// khgould.com: serves the static pages in ./public and handles the contact form.
//
// POST /contact  ->  emails the submission to CONTACT_TO via Cloudflare Email
// Routing's send_email binding (free when sending to a verified destination
// address), then redirects to /thanks.html. CONTACT_TO and CONTACT_FROM are
// Worker secrets, never committed, so no address appears in the page or repo.
// Every submission (sent, failed, spam-trapped, invalid) is also recorded in
// the khgould-contacts D1 database (binding DB); no raw IPs are stored.

const LIMITS = { name: 100, email: 200, message: 5000 };
// Caps for what gets stored in D1, so junk posts can't bloat the table.
const STORE_CAPS = { name: 200, email: 320, message: 10000, user_agent: 500, error: 500 };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/contact") {
      if (request.method !== "POST") {
        return Response.redirect(new URL("/#contact", url).toString(), 303);
      }
      return handleContact(request, env, ctx, url);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env, ctx, url) {
  // Every submission gets one row in D1 (env.DB). The write runs in the
  // background via waitUntil and never throws, so a database problem can't
  // break the visitor's email send or the page they see.
  const base = {
    created_at: new Date().toISOString(),
    user_agent: request.headers.get("user-agent"),
    country: (request.cf && request.cf.country) || null,
  };
  const record = (row) => ctx.waitUntil(saveContact(env, { ...base, ...row }));

  if (env.CONTACT_LIMITER) {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await env.CONTACT_LIMITER.limit({ key: ip });
    if (!success) {
      record({ status: "rate_limited" });
      return page(429, "Slow down", "Too many messages from you just now. Please try again in a minute.");
    }
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    record({ status: "invalid", error: "unreadable form body" });
    return page(400, "Oops", "Something was wrong with that form. Please go back and try again.");
  }

  const field = (k) => String(form.get(k) || "").trim();
  const name = field("name");
  const email = field("email");
  const message = field("message");
  const fields = { name, email, message };

  // Honeypot: real people never fill this hidden field. Pretend it worked.
  if (field("website")) {
    console.warn("contact honeypot field filled; message dropped");
    record({ ...fields, status: "spam_dropped" });
    return Response.redirect(new URL("/thanks", url).toString(), 303);
  }

  const emailOk = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email);
  if (!name || !message || !emailOk) {
    record({ ...fields, status: "invalid", error: "missing name or message, or bad email" });
    return page(400, "Oops", "Please fill in your name, a valid email address, and a message.");
  }
  if (name.length > LIMITS.name || email.length > LIMITS.email || message.length > LIMITS.message) {
    record({ ...fields, status: "invalid", error: "too long" });
    return page(400, "Oops", "That message is a bit too long. Please shorten it and try again.");
  }

  if (!env.EMAIL || !env.CONTACT_TO || !env.CONTACT_FROM) {
    console.error("contact form is not configured (EMAIL binding or CONTACT_TO/CONTACT_FROM secret missing)");
    record({ ...fields, status: "send_failed", error: "not configured" });
    return page(503, "Sorry", "The contact form isn't working right now. Please try again later.");
  }

  const oneLine = (s) => s.replace(/[\r\n]+/g, " ");
  try {
    const sent = await env.EMAIL.send({
      from: { email: env.CONTACT_FROM, name: "khgould.com contact form" },
      to: env.CONTACT_TO,
      replyTo: { email: oneLine(email), name: oneLine(name) },
      subject: `khgould.com: message from ${oneLine(name)}`.slice(0, 200),
      text: `From: ${name} <${email}>\nSent via: ${url.host}\n\n${message}\n`,
    });
    const messageId = (sent && sent.messageId) || null;
    // Log the recipient domain only, never the full address.
    console.log("contact sent", { messageId, toDomain: env.CONTACT_TO.split("@").pop() });
    record({ ...fields, status: "sent", message_id: messageId });
  } catch (err) {
    const code = String((err && (err.code || err.message)) || err);
    console.error("contact send failed", code);
    record({ ...fields, status: "send_failed", error: code });
    return page(502, "Sorry", "Your message couldn't be sent. Please try again later.");
  }

  return Response.redirect(new URL("/thanks", url).toString(), 303);
}

async function saveContact(env, row) {
  if (!env.DB) {
    console.error("contact log skipped: DB binding missing");
    return;
  }
  const cap = (v, n) => (v == null || v === "" ? null : String(v).slice(0, n));
  try {
    await env.DB.prepare(
      "INSERT INTO contacts (created_at, name, email, message, status, error, message_id, user_agent, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        row.created_at,
        cap(row.name, STORE_CAPS.name),
        cap(row.email, STORE_CAPS.email),
        cap(row.message, STORE_CAPS.message),
        row.status,
        cap(row.error, STORE_CAPS.error),
        row.message_id || null,
        cap(row.user_agent, STORE_CAPS.user_agent),
        row.country || null
      )
      .run();
  } catch (err) {
    console.error("contact log insert failed", String((err && err.message) || err));
  }
}

function page(status, title, text) {
  const body = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} - Kevin Gould</title>
<link rel="stylesheet" href="/style.css"></head>
<body>
<h1>${title}</h1>
<p>${text}</p>
<p><a href="/">&lt;&lt; Back to the home page</a></p>
</body></html>`;
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}
