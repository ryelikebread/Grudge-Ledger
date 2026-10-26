# Grudge Ledger

A dramatic, phone-first app for logging grudges to the hour. Pick a severity on a clicking, vibrating 1–100 knob that drives a green-to-red meter, set a statute of limitations, and watch the countdown to peace. Keeps a dossier on every offender (current and past standing), with four skins: Nuclear Football, Windows 98, Little Black Book and Case File.

It is a static web app: one HTML file, no framework, no build step, no database, no tracking. All data stays in the browser (localStorage) on whichever device you use it on.

## Run it

Pick one.

**Docker (recommended for a server)**
```sh
docker compose up -d --build        # http://your-server:8080
```
Port 8080 taken? Choose another: `PORT=8090 docker compose up -d --build` (or write `PORT=8090` in a `.env` file next to `docker-compose.yml`). The HTTPS option below needs ports 80 and 443 free.
With automatic HTTPS (needs a domain pointing at the server and ports 80/443 open):
```sh
DOMAIN=grudges.example.com docker compose -f docker-compose.https.yml up -d --build
```

**Any static web server** (nginx, Apache, Caddy, GitHub Pages, Netlify, S3…): serve the contents of `public/` as the web root. Nothing else is required.

**Locally, no install**
```sh
python3 -m http.server 8080 -d public    # http://localhost:8080
```

## Use it on a phone

- **HTTPS matters.** Browsers only let you "Install" / "Add to Home Screen" as a full-screen app, and only keep the offline cache, on `https://` or `localhost`. Plain `http://` over a LAN still works as a normal web page. Use the HTTPS compose file, or put it behind your own reverse proxy / Cloudflare Tunnel / Tailscale.
- **Vibration** works on Android browsers. iPhones don't allow web pages to vibrate; you still get sound and the visual lock.
- **Sound** starts after your first tap (a browser rule).

## Your data

- Stored in the browser's `localStorage` under the key `grudge-ledger-v1`. It does not sync between devices. Clearing site data erases it.
- **Settings → Copy backup** copies everything as text; **Restore from backup** pastes it back. Use that to move to another device or browser.

## What's in the repo

| Path | Purpose |
|---|---|
| `public/index.html` | The whole app (HTML + CSS + JS). |
| `public/sw.js` | Service worker: caches the app so it works offline. Bump `VERSION` inside it whenever you change a file in `public/`. |
| `public/manifest.webmanifest`, `public/icons/` | Installable-app metadata and icons. |
| `public/fonts/` | Self-hosted Google Fonts (SIL Open Font License): Black Ops One, Share Tech Mono, Bodoni Moda, Cormorant Garamond, Caveat, Special Elite, Courier Prime. No requests go to Google. |
| `Dockerfile`, `nginx.conf` | Tiny nginx image serving `public/` with sensible cache headers. |
| `docker-compose.yml` | Run on port 8080, or the port in the `PORT` variable. |
| `docker-compose.https.yml` | Run behind Caddy with automatic HTTPS. |
| `docs/USER-GUIDE.md` | How to operate the app and what each part is for. |

Browser features used: Web Audio API (all sounds are synthesised live, no audio files), `navigator.vibrate`, `localStorage`, service workers, web app manifest.

## Customising

Everything is in `public/index.html`. Skins are the `:root[data-skin="…"]` blocks in the CSS plus the `SKINS` object (wording) in the script. Severity tiers are `TIERS`; standing thresholds are `STANDINGS`; statute presets are `STAT_PRESETS`.

## Licence

MIT. Bundled fonts are under the SIL Open Font License 1.1.
