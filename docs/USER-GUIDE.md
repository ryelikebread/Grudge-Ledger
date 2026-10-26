# Grudge Ledger — User Guide

**Open it** at the address where it is hosted. See the README for running it yourself. On a phone, use your browser's "Add to Home Screen" / "Install app" (needs https).

## The four tabs (bottom bar)

| Tab | What it's for |
|---|---|
| **Ledger** | The "Countdown to peace" clock, your outstanding grudges with live statute countdowns, and closed cases. |
| **File** | Log a new grudge: who, the charge, the hour it happened, severity knob, statute of limitations. |
| **Dossiers** | One profile per person who wronged you: current standing, a standing graph, standing history, open and past grudges, notes. |
| **Settings** | Skins, sound and vibration, backup/restore, erase everything, and a short in-app field manual. |

## Filing a grudge
1. Go to **File**. Pick the accused, or choose **+ New person…** and enter their name and relation (a dossier is created for them when you confirm).
2. Enter **the charge** (short headline) and optionally the full **account of events**.
3. Set **the hour of the offense**. Everything is recorded to the hour (shown like `26 OCT 2026 · 1500 HRS`). Future hours are refused.
4. Turn the **severity knob** (1–100):
   - Drag up/right to raise, down/left to lower. A mouse wheel or trackpad scroll on the knob also works, as do the − / + buttons and arrow keys (Page Up/Down = ±10).
   - Every step makes a mechanical click. When you let go, it **locks in**: a heavy "thunk", the meter flashes, and the phone vibrates (stronger for higher tiers).
   - The meter is a green → red semicircle: 1–20 Minor slight, 21–40 Misdemeanor, 41–60 Felony, 61–80 High crime, 81–100 Unforgivable.
5. Pick a **statute of limitations**: quick chips (24 hours, 7 days, 30 days, 6 months, 1 year, 7 years, Eternal) or any number of hours/days/weeks/months/years. The clock starts at the hour of the offense; the preview line shows the exact expiry. A statute that has already run out is refused.
6. Press **Enter into the ledger**. A full-screen confirmation shows the summary. **Press and hold** the red button until it fills (about 2 seconds): the screen shakes, a rising tone plays, the phone pulses. Letting go early cancels. On completion it plays a gavel triple-thud and a long vibration.

## Countdown to peace
- Peace = the moment the **last** outstanding grudge's statute runs out. The big clock counts down to it (days, hours, minutes, seconds; years appear once it's over 365 days).
- If any outstanding grudge is **Eternal**, the clock reads **NEVER** and names the grudge blocking peace.
- With nothing outstanding it reads **AT PEACE**.

## Closing grudges
- **Forgive** – closes it as forgiven.
- **Settled** – closes it as dealt with.
- **Strike** – deletes it completely (as if never filed).
- When a statute expires, the grudge closes itself as **Statute lapsed** (also caught up when you next open the app).
Every action asks for confirmation first.

## Dossier photos
- **Add one:** Dossiers → open a person → **Add photo** (or **Change photo**). On a phone you can take a picture or pick one from your library. When opening a new dossier there's also an optional Photo field.
- **Remove it:** open the dossier → **Remove photo**.
- The picture is cropped to a square and shrunk to 192×192 (about 5–15 KB) on your device before saving, so it never uploads a full-size photo. It shows on the dossier, in the dossier list and next to the name on each grudge, restyled by skin (rotated paper print in Case File, sepia in the Little Black Book, grey-green in Nuclear Football, square in Windows 98).
- Photos are part of the ledger, so they sync between devices and are included in server backups and Copy backup. The newest edit to a dossier wins if two devices change it at once.

## Standing (per person)
Standing = total severity of that person's open grudges:

| Score | Standing |
|---|---|
| 0 | In good standing |
| 1–49 | On notice |
| 50–149 | Under review |
| 150–299 | Persona non grata |
| 300+ | Excommunicated |

Each change (dossier opened, charged, forgiven, settled, lapsed, struck) is written to the person's **Standing history** with its hour, and drawn as a step graph.

## Skins
Settings → Skin. Each skin changes the look *and* the wording of the confirm ritual:
- **Nuclear Football** (default): olive console, amber readouts, hazard stripes, "Hold to arm and launch".
- **Windows 98**: teal desktop, grey bevelled windows, "Grudge Ledger.exe", "Hold to Commit".
- **Little Black Book**: black leather, gold foil, ruled ivory pages (every line of text sits on a ruled line), handwritten entries, "Hold to inscribe".
- **Case File**: manila folders with tabs, typewriter type, CONFIDENTIAL stamp, "Hold to file charges".

## Sound and vibration
- Sound uses your phone's speaker; it starts after your first tap (browsers require that). Toggle in Settings; "Test click" previews it.
- **Every control clicks.** Tabs, buttons, chips, skin tiles, switches, dropdowns, the photo picker and dialog buttons all make a short mechanical tap (a different pitch for each kind; destructive buttons like Strike get a low thud). It plays when you lift your finger, so scrolling past a button stays silent, and it also plays when you activate a control from a keyboard. The knob, its +/− buttons and the hold-to-confirm button have their own sounds. Turning **Knob clicks and sound effects** off silences all of it.
- **Vibration works on Android** (Chrome and most Android browsers). **iPhones do not allow web pages to vibrate** (Safari and every iOS browser), so on iPhone you get sound and the visual lock only. "Test vibration" tells you whether your device buzzed.

## Where your data lives and server sync
- **Always on your device first:** every change is saved in the browser immediately, so the app works with no connection.
- **If this copy of the app is served by the Grudge Ledger server** (the default Docker setup), it also syncs with the server. The top badge says **Synced with server**, or **Offline, will sync** when the server can't be reached (keep working; it sends everything later). Settings → **Server sync** shows the last sync time and how many backups the server holds.
- **Phone and laptop stay in step.** Changes merge: grudges and dossiers added on different devices are all kept, a closed grudge stays closed, and deleted things stay deleted. Open the app or tap **Sync now** to pull the latest.
- **Server backups:** the server saves timestamped copies automatically. **Back up on server now** makes one immediately; **Download latest server backup** saves one to your device.
- **Sync password:** if the server was set up with one, the Server sync panel asks for it once.
- **If the app is served from a plain static host** (including the GitHub Pages copy), data stays only in that browser unless you connect a server: in Settings → **Server sync** enter the `https://` address of your Grudge Ledger server and press **Connect** (the server must allow that site; see the README's `CORS_ORIGIN`). **Disconnect** stops syncing and leaves your data on the device. Without a server, use **Copy backup** / **Restore from backup** to move data between devices.
- **Restore from backup** and **Burn the ledger** replace everything on every device the next time they sync.
- **Copy backup** puts the whole ledger on your clipboard as text, in any edition.
- Sound, vibration and skin are per device.

---

## What's installed / technical details

Nothing is installed on your phone. The server edition is one small container; the static edition is just web files.

| Piece | Purpose |
|---|---|
| `public/index.html` | The whole app: layout, four skins, logic. No frameworks or libraries. |
| `public/merge.js` | Combines two copies of the ledger during sync (by id; closed beats open; deletions kept). |
| `.github/workflows/pages.yml` | Optional: publishes the static app to GitHub Pages. |
| `public/sw.js` + `manifest.webmanifest` + `icons/` | Offline cache and "install as app" support. |
| `public/fonts/` (self-hosted) | Black Ops One and Share Tech Mono (Nuclear Football), Bodoni Moda, Cormorant Garamond and Caveat (Little Black Book), Special Elite and Courier Prime (Case File). Windows 98 uses the system Tahoma/Segoe font. |
| `server/server.js` (Node.js 22, no packages) | Serves the app, stores the ledger (`/data/ledger.json`), writes timestamped backups (`/data/backups/`), optional `SYNC_TOKEN` password. |
| Docker volume `grudge-data` | Where the server keeps its data; survives rebuilds. |
| Web Audio API (built into browsers) | Synthesises every sound live: knob detent clicks, button taps, lock "thunk", hold-to-confirm drone, gavel. No audio files. |
| `navigator.vibrate` (Android browsers) | Haptics on knob lock, confirm, and test. Not available on iOS. |
| `localStorage` (key `grudge-ledger-v1`) | The on-device copy (also the only copy in the static edition). |
| Dockerfile.static + nginx (optional) | The static edition. |

**Server settings** (environment variables): `PORT` (host port in compose, default 8080), `SYNC_TOKEN`, `BACKUP_MIN_INTERVAL_MIN` (default 10), `BACKUP_KEEP` (default 500), `CORS_ORIGIN` (sites allowed to sync from elsewhere, e.g. your github.io address).

**Data model** (what the backup text contains): `profiles[]` (id, name, relation, notes, photo (small JPEG as a data URL, optional), createdAt, updatedAt, history[] of {at, score, label, note}), `grudges[]` (id, profileId, charge, details, severity 1–100, occurredAt, loggedAt, statN, statU h/d/w/m/y/eternal, expiresAt or null, status open/forgiven/settled/lapsed, resolvedAt), `deleted[]` (ids removed, so sync doesn't bring them back), `epoch` (bumped by Restore/Burn), `settings` (skin, sound, haptics), `updatedAt`.
