# khgould.com

Kevin Gould's personal page. Deliberately plain, old-school HTML: no framework,
no build step, one tiny hand-written stylesheet (~2 KB), no JavaScript in the page.

```
public/        the static pages (index.html, thanks.html, 404.html, style.css)
src/worker.js  Cloudflare Worker: serves public/ and handles POST /contact
wrangler.jsonc Worker config (static assets, send_email + rate-limit bindings)
```

## Contact form

The form posts to `/contact` (a plain HTML form POST, works without JS). The
Worker checks a hidden honeypot field, validates the input, rate-limits to
5 posts per minute per IP, and emails the message using Cloudflare Email
Routing's `send_email` binding. Reply-To is set to the visitor's address, so
replying in the mail client answers them directly. No email address appears
in the page or the repo.

Sending to a verified Email Routing destination address is free on the
Workers Free plan. The addresses are Worker secrets, not committed:

```bash
npx wrangler secret put CONTACT_TO     # a verified Email Routing destination address
npx wrangler secret put CONTACT_FROM   # an address on a domain with Email Routing enabled
```

## Preview / deploy

```bash
npx wrangler dev       # local preview at http://localhost:8787
npx wrangler deploy    # deploys to https://khgould.kevin-815.workers.dev
```

## Going live on khgould.com (not done yet)

The `khgould.com` zone is on Cloudflare. Its apex records still point at the
old Google Sites IPs (216.239.3x.21), which no longer serve a certificate for
the domain, hence the 525. To go live, remove those old A/AAAA records and attach
the domain to this Worker as a Custom Domain (`khgould.com`, optionally
`www.khgould.com`), either in the dashboard or by adding a `routes` entry with
`"custom_domain": true` to `wrangler.jsonc` and redeploying.

The old GitHub Pages version of this repo (`khgouldy.github.io`) served the
repo root; after this change the site lives in `public/` and is served by the
Worker, so GitHub Pages for this repo can be turned off.
