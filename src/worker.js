// khgould.com: serves the static pages in ./public and handles the contact form.
//
// POST /contact  ->  emails the submission to CONTACT_TO via Cloudflare Email
// Routing's send_email binding (free when sending to a verified destination
// address), then redirects to /thanks.html. CONTACT_TO and CONTACT_FROM are
// Worker secrets, never committed, so no address appears in the page or repo.

const LIMITS = { name: 100, email: 200, message: 5000 };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/contact") {
      if (request.method !== "POST") {
        return Response.redirect(new URL("/#contact", url).toString(), 303);
      }
      return handleContact(request, env, url);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env, url) {
  if (env.CONTACT_LIMITER) {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await env.CONTACT_LIMITER.limit({ key: ip });
    if (!success) return page(429, "Slow down", "Too many messages from you just now. Please try again in a minute.");
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return page(400, "Oops", "Something was wrong with that form. Please go back and try again.");
  }

  const field = (k) => String(form.get(k) || "").trim();
  const name = field("name");
  const email = field("email");
  const message = field("message");

  // Honeypot: real people never fill this hidden field. Pretend it worked.
  if (field("website")) {
    console.warn("contact honeypot field filled; message dropped");
    return Response.redirect(new URL("/thanks", url).toString(), 303);
  }

  const emailOk = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email);
  if (!name || !message || !emailOk) {
    return page(400, "Oops", "Please fill in your name, a valid email address, and a message.");
  }
  if (name.length > LIMITS.name || email.length > LIMITS.email || message.length > LIMITS.message) {
    return page(400, "Oops", "That message is a bit too long. Please shorten it and try again.");
  }

  if (!env.EMAIL || !env.CONTACT_TO || !env.CONTACT_FROM) {
    console.error("contact form is not configured (EMAIL binding or CONTACT_TO/CONTACT_FROM secret missing)");
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
    // Log the recipient domain only, never the full address.
    console.log("contact sent", { messageId: sent && sent.messageId, toDomain: env.CONTACT_TO.split("@").pop() });
  } catch (err) {
    console.error("contact send failed", err && (err.code || err.message || err));
    return page(502, "Sorry", "Your message couldn't be sent. Please try again later.");
  }

  return Response.redirect(new URL("/thanks", url).toString(), 303);
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
