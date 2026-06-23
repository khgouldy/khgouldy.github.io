# khgould.com

Personal site for Kevin Gould. A single, dependency-free static page —
no build step, no framework. Just `index.html`, a `photos/` folder, and a `CNAME`.

## Edit it

- **Text / projects / writing** — edit `index.html` directly. Sections are clearly commented.
- **Photos** — see [`photos/README.md`](photos/README.md). Drop images in `photos/` and swap the placeholders in the gallery.

## Preview locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy

Hosted on **GitHub Pages** from the `main` branch (root). Every push to `main`
redeploys automatically. The `CNAME` file binds the custom domain `khgould.com`.

### DNS (set these at Squarespace → khgould.com → DNS)

Point the apex and `www` at GitHub Pages:

| Type  | Host | Value                  |
|-------|------|------------------------|
| A     | @    | 185.199.108.153        |
| A     | @    | 185.199.109.153        |
| A     | @    | 185.199.110.153        |
| A     | @    | 185.199.111.153        |
| CNAME | www  | khgouldy.github.io     |

Remove any old A records pointing at the Google Sites IPs (`216.239.x.21`).
DNS can take a few minutes to a few hours to propagate; GitHub then issues a
free HTTPS certificate automatically.
