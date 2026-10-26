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
- **Little Black Book**: black leather, gold foil, ruled ivory pages, handwritten entries, "Hold to inscribe".
- **Case File**: manila folders with tabs, typewriter type, CONFIDENTIAL stamp, "Hold to file charges".

## Sound and vibration
- Sound uses your phone's speaker; it starts after your first tap (browsers require that). Toggle in Settings; "Test click" previews it.
- **Vibration works on Android** (Chrome and most Android browsers). **iPhones do not allow web pages to vibrate** (Safari and every iOS browser), so on iPhone you get sound and the visual lock only. "Test vibration" tells you whether your device buzzed.

## Where your data lives
- In your browser on the device you use (localStorage). Nothing is sent to any server, and it does not sync between devices.
- **Backup:** Settings → Copy backup puts the whole ledger on your clipboard as text. Restore from backup replaces the ledger with pasted text. Use this to move to another device.
- **Burn the ledger** erases all dossiers and grudges (settings stay).

---

## What's installed / technical details

Nothing is installed on your phone. It's a static web page served from `public/`.

| Piece | Purpose |
|---|---|
| `public/index.html` | The whole app: layout, four skins, logic. No frameworks or libraries. |
| `public/sw.js` + `manifest.webmanifest` + `icons/` | Offline cache and "install as app" support. |
| `public/fonts/` (self-hosted) | Black Ops One and Share Tech Mono (Nuclear Football), Bodoni Moda, Cormorant Garamond and Caveat (Little Black Book), Special Elite and Courier Prime (Case File). Windows 98 uses the system Tahoma/Segoe font. |
| Web Audio API (built into browsers) | Synthesises every sound live: knob detent clicks, lock "thunk", hold-to-confirm drone, gavel. No audio files. |
| `navigator.vibrate` (Android browsers) | Haptics on knob lock, confirm, and test. Not available on iOS. |
| `localStorage` (key `grudge-ledger-v1`) | Where the ledger is stored. |
| Dockerfile + nginx (optional) | Tiny container that serves `public/` (port 8080 by default; set `PORT` to change it). |

**Data model** (what the backup text contains): `profiles[]` (id, name, relation, notes, createdAt, history[] of {at, score, label, note}), `grudges[]` (id, profileId, charge, details, severity 1–100, occurredAt, loggedAt, statN, statU h/d/w/m/y/eternal, expiresAt or null, status open/forgiven/settled/lapsed, resolvedAt), `settings` (skin, sound, haptics), `updatedAt`.
