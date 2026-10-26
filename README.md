# Grudge Ledger

A dramatic, phone-first app for logging grudges to the hour. Pick a severity on a clicking, vibrating 1–100 knob that drives a green-to-red meter, set a statute of limitations, and watch the countdown to peace. Keeps a dossier on every offender (current and past standing), with four skins: Nuclear Football, Windows 98, Little Black Book and Case File.

Two ways to run it:

| | **Server edition** (default) | **Static edition** |
|---|---|---|
| What runs | A tiny Node.js server (no dependencies) that serves the app and stores your ledger | Just web files behind nginx, or any static host |
| Data | Saved in the browser **and** synced to the server; the server keeps timestamped backups | Saved in each browser only |
| Several devices | Phone, laptop and tablet stay in step | Independent copies (move data by Copy/Restore backup) |
| Works offline | Yes, syncs when the server is reachable again | Yes |

## Run it

### Server edition (Docker)
```sh
git clone https://github.com/ryelikebread/Grudge-Ledger.git
cd Grudge-Ledger
docker compose up -d --build        # http://your-server:8080
```
- **Another port:** `PORT=8090 docker compose up -d --build` (or write `PORT=8090` in a `.env` file next to `docker-compose.yml`).
- **Sync password (recommended if others can reach the port):** put `SYNC_TOKEN=a-long-password` in `.env`. The app then asks for it once under Settings → Server sync.
- **Your data** lives in the Docker volume `grudge-data`: `ledger.json` (current) and `backups/` (timestamped copies).
- **HTTPS with a domain:** `DOMAIN=grudges.example.com docker compose -f docker-compose.https.yml up -d --build` (needs ports 80/443 free). HTTPS is what lets a phone install it as an app and keep the offline cache; over plain `http://` on your LAN it still works as a normal web page. You can also keep the plain setup and put Tailscale (`tailscale serve --bg 8080`), a Cloudflare Tunnel or your own reverse proxy in front.

### Static edition
```sh
docker compose -f docker-compose.static.yml up -d --build      # nginx, no sync, no backups
```
Or serve the contents of `public/` from any web server (nginx, Apache, Caddy, GitHub Pages, Netlify, S3…). Locally, no install: `python3 -m http.server 8080 -d public`. If a browser has the app open from a static host, the Server sync panel simply doesn't appear.

### Without Docker
```sh
PUBLIC_DIR=public DATA_DIR=./data PORT=8080 node server/server.js     # Node 18+
```

### GitHub Pages edition (static, free HTTPS)
A workflow (`.github/workflows/pages.yml`) publishes `public/` to GitHub Pages at **https://<your-username>.github.io/Grudge-Ledger/** on every push to `main` that changes the app.

One-time setup: in the repo go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**, then run the workflow (Actions tab → *Deploy to GitHub Pages* → Run workflow) or push a change.

- It's the **static edition**: no server, so by default each browser keeps its own data (use Settings → Copy backup / Restore from backup to move it). Because Pages is HTTPS, phones can **install it as an app** and it works offline.
- It all works under the `/Grudge-Ledger/` subpath (every path in the app is relative).
- **Optional sync:** Settings → Server sync lets this copy talk to *your own* Grudge Ledger server. The address must be `https://` (a Tailscale `tailscale serve` address works), and the server must allow the Pages site: set `CORS_ORIGIN=https://<your-username>.github.io` in the server's `.env` and rebuild. Add `SYNC_TOKEN` as well if the server is reachable by others.
- **Privacy note:** every site under `<your-username>.github.io` shares one browser origin, so another page hosted there could read this app's saved data. Don't host untrusted pages on the same account, or use a custom domain.
- Changes can take a few minutes to show up (Pages caches for 10 minutes).

## Updating
```sh
cd Grudge-Ledger && git pull && docker compose up -d --build
```
Your data is in a volume, so it survives rebuilds. If you changed files in `public/`, bump `VERSION` in `public/sw.js` so devices pick up the new version.

## How sync works

- Every device keeps a full copy in the browser (localStorage), so the app works with no connection.
- When the server is reachable (on open, when you return to the app, every 30 seconds, and about a second after each change) the app downloads the server's copy, **merges** it with its own, and uploads the result. Grudges and dossiers from different devices are united by id, a grudge that was closed anywhere stays closed, deletions stay deleted, and dossier history is united.
- Two devices editing at once can't overwrite each other: the server rejects an upload made against an out-of-date version, and the app re-merges and retries.
- **Restore from backup** and **Burn the ledger** are deliberate "replace everything" actions; they win over other devices' older copies. Anything another device entered offline *before* the restore is discarded.
- Sound, vibration and skin choices are per device and are not synced.

## Backups

- The server writes `backups/ledger-YYYYMMDD-HHMMSS.json` (UTC) after changes, at most one every 10 minutes (`BACKUP_MIN_INTERVAL_MIN`), plus one when it shuts down with unsaved changes. It keeps the newest 500 (`BACKUP_KEEP`) and the newest one from each of the last 90 days.
- In the app: Settings → Server sync → **Back up on server now** / **Download latest server backup**.
- On the server, copy them out of the volume:
  ```sh
  docker cp grudge-ledger:/data/backups ./grudge-backups
  ```
- **Restoring:** in the app, Settings → Records → Restore from backup, paste the contents of a backup file (or any Copy-backup text). Or stop the container and put a backup file's contents in `ledger.json` inside the volume.

## Security

`CORS_ORIGIN` (comma-separated origins, default none) lets a page served from another site, such as the GitHub Pages copy, call the API. The sync API has no accounts. Anyone who can reach the port can read and change the ledger unless you set `SYNC_TOKEN`. On plain HTTP the password is sent unencrypted, so keep it on a trusted network, or put HTTPS/Tailscale in front. Nothing is sent to third parties; fonts are bundled.

## What's in the repo

| Path | Purpose |
|---|---|
| `public/index.html` | The whole app (HTML + CSS + JS). |
| `public/merge.js` | The merge rules used for sync (also unit tested). |
| `public/sw.js`, `manifest.webmanifest`, `icons/` | Offline cache and installable-app metadata. Bump `VERSION` in `sw.js` when `public/` changes. |
| `public/fonts/` | Self-hosted Google Fonts (SIL Open Font License). |
| `server/server.js` | The sync server: serves `public/`, stores the ledger, writes backups. Node standard library only. |
| `.github/workflows/pages.yml` | Runs the tests and publishes `public/` to GitHub Pages. |
| `Dockerfile`, `docker-compose.yml` | Server edition (default). |
| `docker-compose.https.yml` | Server edition behind Caddy with automatic HTTPS. |
| `Dockerfile.static`, `nginx.conf`, `docker-compose.static.yml` | Static edition. |
| `tests/` | `node --test tests/merge.test.js tests/server.test.js` |
| `docs/USER-GUIDE.md` | How to operate the app and what each part is for. |

API (all under `/api/`, JSON): `GET status`, `GET/PUT ledger` (PUT needs the `baseRev` you last read), `POST backup`, `GET backups`, `GET backups/<name|latest>`.

## Customising

Everything is in `public/index.html`. Skins are the `:root[data-skin="…"]` blocks in the CSS plus the `SKINS` object (wording) in the script. Severity tiers are `TIERS`; standing thresholds are `STANDINGS`; statute presets are `STAT_PRESETS`.

## Licence

MIT. Bundled fonts are under the SIL Open Font License 1.1.
