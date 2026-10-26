const test = require("node:test"), assert = require("node:assert");
const { merge, canon } = require("../public/merge.js");

const P = (id, extra = {}) => ({ id, name: id, createdAt: 1, history: [{ at: 1, score: 0, label: "x", note: "Dossier opened" }], ...extra });
const G = (id, profileId, extra = {}) => ({ id, profileId, charge: id, severity: 10, status: "open", resolvedAt: null, ...extra });
const S = (o = {}) => ({ v: 1, epoch: 0, profiles: [], grudges: [], deleted: [], settings: { skin: "football" }, updatedAt: 1, ...o });

test("unites records from both sides", () => {
  const m = merge(S({ profiles: [P("a")], grudges: [G("g1", "a")] }), S({ profiles: [P("a"), P("b")], grudges: [G("g2", "b")] }));
  assert.deepEqual(m.profiles.map(p => p.id).sort(), ["a", "b"]);
  assert.deepEqual(m.grudges.map(g => g.id).sort(), ["g1", "g2"]);
});
test("closed beats open; later closing wins", () => {
  const open = S({ profiles: [P("a")], grudges: [G("g", "a")] });
  const forgiven = S({ profiles: [P("a")], grudges: [G("g", "a", { status: "forgiven", resolvedAt: 5 })] });
  assert.equal(merge(open, forgiven).grudges[0].status, "forgiven");
  assert.equal(merge(forgiven, open).grudges[0].status, "forgiven");
  const settled = S({ profiles: [P("a")], grudges: [G("g", "a", { status: "settled", resolvedAt: 9 })] });
  assert.equal(merge(forgiven, settled).grudges[0].status, "settled");
});
test("deletions stay deleted and drop a person's grudges", () => {
  const a = S({ profiles: [P("a")], grudges: [G("g1", "a"), G("g2", "a")] });
  const b = S({ profiles: [P("a")], grudges: [G("g1", "a"), G("g2", "a")], deleted: [{ id: "g1", at: 5 }] });
  assert.deepEqual(merge(a, b).grudges.map(g => g.id), ["g2"]);
  const c = S({ deleted: [{ id: "a", at: 6 }] });
  const m = merge(a, c);
  assert.equal(m.profiles.length, 0); assert.equal(m.grudges.length, 0);
});
test("profile history is united and sorted", () => {
  const a = S({ profiles: [P("a", { history: [{ at: 1, note: "n1" }, { at: 3, note: "n3" }] })] });
  const b = S({ profiles: [P("a", { history: [{ at: 1, note: "n1" }, { at: 2, note: "n2" }] })] });
  assert.deepEqual(merge(a, b).profiles[0].history.map(h => h.note), ["n1", "n2", "n3"]);
});
test("higher epoch wins outright (restore / burn)", () => {
  const old = S({ profiles: [P("a")], grudges: [G("g", "a")] });
  const burned = S({ epoch: 100, updatedAt: 100 });
  assert.equal(merge(old, burned).grudges.length, 0);
  assert.equal(merge(burned, old).grudges.length, 0);
});
test("merge is order-independent and idempotent", () => {
  const a = S({ profiles: [P("a")], grudges: [G("g1", "a")], updatedAt: 3 });
  const b = S({ profiles: [P("b")], grudges: [G("g2", "b", { status: "settled", resolvedAt: 4 })], updatedAt: 4 });
  assert.equal(canon(merge(a, b)), canon(merge(b, a)));
  const m = merge(a, b);
  assert.equal(canon(merge(m, m)), canon(m));
  assert.equal(canon(merge(m, a)), canon(m));
});
test("settings and timestamps don't count as content", () => {
  const a = S({ settings: { skin: "win98" }, updatedAt: 9 }), b = S({ settings: { skin: "football" }, updatedAt: 1 });
  assert.equal(canon(a), canon(b));
});
