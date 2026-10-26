"use strict";
/* Grudge Ledger server: serves the app from public/ and keeps one copy of the ledger on disk
   with timestamped backups. No dependencies; needs Node 18+.

   Environment:
     PORT                       port to listen on (default 8080)
     DATA_DIR                   where ledger.json and backups/ live (default /data)
     SYNC_TOKEN                 optional shared password; if set the app asks for it
     BACKUP_MIN_INTERVAL_MIN    at most one backup per this many minutes (default 10)
     BACKUP_KEEP                newest backups always kept (default 500); the newest one per day is also kept for 90 days
     CORS_ORIGIN                optional, comma-separated web origins allowed to call the API from another site,
                                e.g. https://yourname.github.io  (default: none; same-origin only)
*/
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = +process.env.PORT || 8080;
const PUBLIC = path.resolve(process.env.PUBLIC_DIR || path.join(__dirname, "..", "public"));
const DATA = path.resolve(process.env.DATA_DIR || "/data");
const TOKEN = process.env.SYNC_TOKEN || "";
const BACKUP_MIN = (+process.env.BACKUP_MIN_INTERVAL_MIN || 10) * 60e3;
const BACKUP_KEEP = +process.env.BACKUP_KEEP || 500;
const CORS = (process.env.CORS_ORIGIN || "").split(",").map(x => x.trim().replace(/\/+$/, "")).filter(Boolean);
const MAX_BODY = 5 * 1024 * 1024;
const LEDGER = path.join(DATA, "ledger.json");
const BACKUPS = path.join(DATA, "backups");
const NAME_RE = /^ledger-\d{8}-\d{6}(-[a-z0-9]+)?\.json$/;

fs.mkdirSync(BACKUPS, { recursive: true });
const log = (...a) => console.log(new Date().toISOString(), ...a);

/* ---------- storage ---------- */
function writeAtomic(file, text) {
  const tmp = file + "." + process.pid + ".tmp";
  const fd = fs.openSync(tmp, "w");
  try { fs.writeSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}
function loadLedger() {
  if (!fs.existsSync(LEDGER)) return { rev: 0, savedAt: 0, state: null };
  try {
    const d = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
    if (d && typeof d.rev === "number" && d.state) return d;
    throw new Error("unexpected shape");
  } catch (e) {
    const aside = LEDGER.replace(/\.json$/, ".corrupt-" + Date.now() + ".json");
    fs.renameSync(LEDGER, aside);
    log("ledger.json was unreadable and was moved to", aside, "-", e.message);
    return { rev: 0, savedAt: 0, state: null };
  }
}
let cur = loadLedger();
let lastBackupAt = 0, dirtySinceBackup = false, backupTimer = null;

function listBackups() {
  return fs.readdirSync(BACKUPS).filter(n => NAME_RE.test(n)).sort().reverse();
}
function stamp(d) {
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}
function pruneBackups() {
  const names = listBackups(); // newest first
  const keep = new Set(names.slice(0, BACKUP_KEEP));
  const days = new Set();
  const cutoff = Date.now() - 90 * 86400e3;
  names.forEach(n => {
    const day = n.slice(7, 15);
    const t = Date.UTC(+day.slice(0, 4), +day.slice(4, 6) - 1, +day.slice(6, 8));
    if (t >= cutoff && !days.has(day)) { days.add(day); keep.add(n); }
  });
  names.forEach(n => { if (!keep.has(n)) { try { fs.unlinkSync(path.join(BACKUPS, n)); } catch (e) {} } });
}
function backup(reason) {
  clearTimeout(backupTimer); backupTimer = null;
  if (!cur.state) return null;
  const now = new Date();
  let name = `ledger-${stamp(now)}.json`, n = 1;
  while (fs.existsSync(path.join(BACKUPS, name))) name = `ledger-${stamp(now)}-${n++}.json`;
  writeAtomic(path.join(BACKUPS, name), JSON.stringify(cur));
  lastBackupAt = now.getTime(); dirtySinceBackup = false;
  pruneBackups();
  log("backup", name, reason || "");
  return name;
}
function scheduleBackup() {
  dirtySinceBackup = true;
  if (Date.now() - lastBackupAt >= BACKUP_MIN) return backup("interval");
  if (!backupTimer) backupTimer = setTimeout(() => backup("deferred"), Math.max(1000, BACKUP_MIN - (Date.now() - lastBackupAt)));
}
{
  const latest = listBackups()[0];
  if (latest) lastBackupAt = fs.statSync(path.join(BACKUPS, latest)).mtimeMs;
  if (cur.state && Date.now() - lastBackupAt > 86400e3) backup("startup");
}

/* ---------- http helpers ---------- */
function corsFor(req) {
  const o = req.headers.origin;
  if (!o || !CORS.length || !(CORS.includes("*") || CORS.includes(o))) return {};
  return { "Access-Control-Allow-Origin": CORS.includes("*") ? "*" : o, "Vary": "Origin", "Access-Control-Expose-Headers": "Content-Disposition" };
}
function send(res, code, obj, headers = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(code, Object.assign({}, res.cors, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }, headers));
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error("too large"), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
const digest = s => crypto.createHash("sha256").update(String(s)).digest();
function authed(req) {
  if (!TOKEN) return true;
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  return !!m && crypto.timingSafeEqual(digest(m[1]), digest(TOKEN));
}
function validState(s) {
  return s && typeof s === "object" && !Array.isArray(s) && Array.isArray(s.profiles) && Array.isArray(s.grudges);
}

/* ---------- API ---------- */
async function api(req, res, url) {
  const p = url.pathname;
  res.cors = corsFor(req);
  if (req.method === "OPTIONS") { // browser preflight for calls from another origin
    const h = Object.assign({ "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "600" }, res.cors);
    if (res.cors["Access-Control-Allow-Origin"] && req.headers["access-control-request-private-network"]) h["Access-Control-Allow-Private-Network"] = "true";
    res.writeHead(204, h); return res.end();
  }
  if (p === "/api/status" && req.method === "GET") {
    const b = listBackups();
    return send(res, 200, { ok: true, sync: true, auth: !!TOKEN, rev: cur.rev, savedAt: cur.savedAt, backups: { count: b.length, latest: b[0] || null } });
  }
  if (!authed(req)) return send(res, 401, { error: "unauthorized" }, { "WWW-Authenticate": "Bearer" });

  if (p === "/api/ledger") {
    if (req.method === "GET") return send(res, 200, { rev: cur.rev, savedAt: cur.savedAt, state: cur.state });
    if (req.method === "PUT") {
      let body;
      try { body = JSON.parse(await readBody(req)); } catch (e) { return send(res, e.code === 413 ? 413 : 400, { error: e.code === 413 ? "too large" : "bad json" }); }
      if (!body || !validState(body.state)) return send(res, 400, { error: "bad state" });
      if (body.baseRev !== cur.rev) return send(res, 409, { error: "conflict", rev: cur.rev, savedAt: cur.savedAt, state: cur.state });
      cur = { rev: cur.rev + 1, savedAt: Date.now(), state: body.state };
      writeAtomic(LEDGER, JSON.stringify(cur));
      scheduleBackup();
      return send(res, 200, { rev: cur.rev, savedAt: cur.savedAt });
    }
    return send(res, 405, { error: "method not allowed" });
  }
  if (p === "/api/backup" && req.method === "POST") {
    const name = backup("manual");
    return name ? send(res, 200, { name }) : send(res, 409, { error: "nothing to back up yet" });
  }
  if (p === "/api/backups" && req.method === "GET") {
    const list = listBackups().slice(0, 1000).map(n => { const st = fs.statSync(path.join(BACKUPS, n)); return { name: n, size: st.size, mtime: st.mtimeMs }; });
    return send(res, 200, { backups: list });
  }
  const m = /^\/api\/backups\/([^/]+)$/.exec(p);
  if (m && req.method === "GET") {
    const name = m[1] === "latest" ? listBackups()[0] : m[1];
    if (!name || !NAME_RE.test(name) || !fs.existsSync(path.join(BACKUPS, name))) return send(res, 404, { error: "no such backup" });
    res.writeHead(200, { ...res.cors, "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" });
    return fs.createReadStream(path.join(BACKUPS, name)).pipe(res);
  }
  return send(res, 404, { error: "not found" });
}

/* ---------- static files ---------- */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ico": "image/x-icon" };
function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.resolve(PUBLIC, "." + path.sep + rel);
  if (file !== PUBLIC && !file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    const ext = path.extname(file).toLowerCase();
    const cache = rel.startsWith("/fonts/") ? "public, max-age=31536000, immutable" : rel.startsWith("/icons/") ? "public, max-age=86400" : "no-cache";
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    return serveStatic(req, res, url);
  } catch (e) {
    log("error", req.method, req.url, e && e.stack || e);
    if (!res.headersSent) send(res, 500, { error: "server error" }); else res.end();
  }
});
server.listen(PORT, () => log(`Grudge Ledger listening on :${PORT}, data in ${DATA}${TOKEN ? ", sync token required" : ", no sync token set"}`));
function shutdown() { try { if (dirtySinceBackup) backup("shutdown"); } catch (e) {} server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); }
process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
