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

## Live on khgould.com

`khgould.com` and `www.khgould.com` are attached to this Worker as Custom
Domains via `routes` in `wrangler.jsonc` (Cloudflare manages their DNS records
and certificates). The old Google Sites apex records were removed; a backup of
the zone's DNS from before the switch is kept outside the repo.

The old GitHub Pages version of this repo (`khgouldy.github.io`) served the
repo root; after this change the site lives in `public/` and is served by the
Worker, so GitHub Pages for this repo can be turned off.
