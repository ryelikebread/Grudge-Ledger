const test = require("node:test"), assert = require("node:assert");
const { spawn } = require("node:child_process");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");

const state = n => ({ v: 1, epoch: 0, profiles: [{ id: "p" + n, name: "P" + n, history: [] }], grudges: [], deleted: [], settings: {}, updatedAt: n });

async function start(env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gl-"));
  const port = 20000 + Math.floor(Math.random() * 20000);
  const child = spawn("node", [path.join(__dirname, "..", "server", "server.js")], { env: { ...process.env, PORT: port, DATA_DIR: dir, ...env } });
  await new Promise((res, rej) => { child.stdout.on("data", d => String(d).includes("listening") && res()); child.on("error", rej); setTimeout(() => rej(new Error("server did not start")), 5000); });
  const base = `http://127.0.0.1:${port}`;
  return { dir, base, child, stop: () => new Promise(r => { if (child.exitCode !== null || child.signalCode) return r(); child.on("exit", r); child.kill("SIGTERM"); }) };
}
const put = (base, body, headers = {}) => fetch(base + "/api/ledger", { method: "PUT", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

test("stores, versions, rejects stale writes, backs up, survives restart", async () => {
  const s = await start();
  try {
    let r = await fetch(s.base + "/api/ledger"); assert.deepEqual((await r.json()).state, null);
    r = await put(s.base, { baseRev: 0, state: state(1) }); assert.equal(r.status, 200); assert.equal((await r.json()).rev, 1);
    r = await put(s.base, { baseRev: 0, state: state(2) }); assert.equal(r.status, 409); assert.equal((await r.json()).rev, 1);
    r = await put(s.base, { baseRev: 1, state: state(3) }); assert.equal(r.status, 200);
    r = await put(s.base, { baseRev: 2, state: { nope: 1 } }); assert.equal(r.status, 400);
    const files = fs.readdirSync(path.join(s.dir, "backups")); assert.ok(files.length >= 1, "a backup was written");
    r = await fetch(s.base + "/api/backups/latest"); assert.equal(r.status, 200); assert.equal((await r.json()).rev >= 1, true);
    r = await fetch(s.base + "/api/backup", { method: "POST" }); assert.equal(r.status, 200);
    assert.equal((await fetch(s.base + "/api/backups/..%2Fledger.json")).status, 404);
    await s.stop();
    const s2 = await start({ DATA_DIR: s.dir });
    try { const j = await (await fetch(s2.base + "/api/ledger")).json(); assert.equal(j.rev, 2); assert.equal(j.state.profiles[0].id, "p3"); } finally { await s2.stop(); }
  } finally { try { await s.stop(); } catch (e) {} }
});

test("serves the app and blocks path traversal", async () => {
  const s = await start();
  try {
    const r = await fetch(s.base + "/"); assert.equal(r.status, 200); assert.match(await r.text(), /Grudge Ledger/);
    assert.equal((await fetch(s.base + "/merge.js")).status, 200);
    assert.equal((await fetch(s.base + "/..%2Fserver%2Fserver.js")).status, 403);
    assert.equal((await fetch(s.base + "/nope")).status, 404);
  } finally { await s.stop(); }
});

test("sync token is enforced when set", async () => {
  const s = await start({ SYNC_TOKEN: "secret" });
  try {
    assert.equal((await fetch(s.base + "/api/status")).status, 200);
    assert.equal((await fetch(s.base + "/api/ledger")).status, 401);
    assert.equal((await fetch(s.base + "/api/ledger", { headers: { Authorization: "Bearer wrong" } })).status, 401);
    assert.equal((await put(s.base, { baseRev: 0, state: state(1) }, { Authorization: "Bearer secret" })).status, 200);
    assert.equal((await (await fetch(s.base + "/api/status")).json()).auth, true);
  } finally { await s.stop(); }
});

test("CORS only for configured origins", async () => {
  const s = await start({ CORS_ORIGIN: "https://me.github.io/" });
  try {
    let r = await fetch(s.base + "/api/ledger", { method: "OPTIONS", headers: { Origin: "https://me.github.io", "Access-Control-Request-Method": "PUT", "Access-Control-Request-Private-Network": "true" } });
    assert.equal(r.status, 204); assert.equal(r.headers.get("access-control-allow-origin"), "https://me.github.io");
    assert.match(r.headers.get("access-control-allow-headers"), /Authorization/); assert.equal(r.headers.get("access-control-allow-private-network"), "true");
    r = await fetch(s.base + "/api/status", { headers: { Origin: "https://me.github.io" } }); assert.equal(r.headers.get("access-control-allow-origin"), "https://me.github.io");
    r = await fetch(s.base + "/api/status", { headers: { Origin: "https://evil.example" } }); assert.equal(r.headers.get("access-control-allow-origin"), null);
  } finally { await s.stop(); }
  const s2 = await start();
  try { const r = await fetch(s2.base + "/api/status", { headers: { Origin: "https://me.github.io" } }); assert.equal(r.headers.get("access-control-allow-origin"), null); } finally { await s2.stop(); }
});
