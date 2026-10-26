/* Grudge Ledger: merge two copies of a ledger (used by the app for sync; also loaded by the tests).
   Rules:
   - A copy with a higher "epoch" wins outright (set by Restore from backup and Burn the ledger).
   - Otherwise profiles and grudges are united by id. Deleted ids are remembered in "deleted" so they stay deleted.
   - The same grudge on both sides: a closed one beats an open one; two closed ones keep the later closing.
   - A profile's history entries are united. Settings come from the most recently updated copy. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GrudgeMerge = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var MAX_TOMBS = 500;

  function arr(x) { return Array.isArray(x) ? x : []; }

  function tombMap(a, b) {
    var m = {};
    [a, b].forEach(function (s) {
      arr(s.deleted).forEach(function (t) {
        if (t && t.id && (!m[t.id] || t.at > m[t.id])) m[t.id] = t.at || 0;
      });
    });
    return m;
  }

  function pickGrudge(x, y) {
    if (!y) return x;
    if (!x) return y;
    var xo = x.status === "open", yo = y.status === "open";
    if (xo !== yo) return xo ? y : x;
    if (!xo && !yo) return (y.resolvedAt || 0) > (x.resolvedAt || 0) ? y : x;
    return x;
  }

  function mergeProfile(x, y) {
    if (!y) return x;
    if (!x) return y;
    var newer = (y.updatedAt || y.createdAt || 0) > (x.updatedAt || x.createdAt || 0) ? y : x;
    var seen = {}, hist = [];
    arr(x.history).concat(arr(y.history)).forEach(function (h) {
      var k = h.at + "|" + h.note;
      if (!seen[k]) { seen[k] = 1; hist.push(h); }
    });
    hist.sort(function (p, q) { return p.at - q.at; });
    var out = {};
    Object.keys(newer).forEach(function (k) { out[k] = newer[k]; });
    out.history = hist;
    return out;
  }

  function merge(a, b) {
    var ea = +a.epoch || 0, eb = +b.epoch || 0;
    if (ea !== eb) return JSON.parse(JSON.stringify(ea > eb ? a : b));

    var tombs = tombMap(a, b);
    var profiles = {}, order = [];
    arr(a.profiles).concat(arr(b.profiles)).forEach(function (p) {
      if (!p || !p.id || tombs[p.id]) return;
      if (!profiles[p.id]) order.push(p.id);
      profiles[p.id] = mergeProfile(profiles[p.id], p);
    });
    var grudges = {}, gorder = [];
    arr(a.grudges).concat(arr(b.grudges)).forEach(function (g) {
      if (!g || !g.id || tombs[g.id] || tombs[g.profileId]) return;
      if (!grudges[g.id]) gorder.push(g.id);
      grudges[g.id] = pickGrudge(grudges[g.id], g);
    });
    var newer = (+b.updatedAt || 0) > (+a.updatedAt || 0) ? b : a;
    var deleted = Object.keys(tombs).map(function (id) { return { id: id, at: tombs[id] }; })
      .sort(function (p, q) { return q.at - p.at; }).slice(0, MAX_TOMBS);

    return {
      v: 1,
      epoch: ea,
      profiles: order.map(function (id) { return profiles[id]; }),
      grudges: gorder.map(function (id) { return grudges[id]; }),
      settings: JSON.parse(JSON.stringify(newer.settings || {})),
      deleted: deleted,
      updatedAt: Math.max(+a.updatedAt || 0, +b.updatedAt || 0)
    };
  }

  /* Order-independent text form, so two copies can be compared for "same content". */
  function canon(s) {
    var c = JSON.parse(JSON.stringify(s));
    c.profiles = arr(c.profiles).sort(function (p, q) { return p.id < q.id ? -1 : 1; });
    c.grudges = arr(c.grudges).sort(function (p, q) { return p.id < q.id ? -1 : 1; });
    c.deleted = arr(c.deleted).sort(function (p, q) { return p.id < q.id ? -1 : 1; });
    delete c.settings; delete c.updatedAt; /* device preferences and timestamps don't count as content */
    return JSON.stringify(c);
  }

  return { merge: merge, canon: canon };
});
