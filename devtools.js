var t = '__p_model',
  e = Object.keys.bind(Object);
function n(e) {
  var n = window.__REDUX_DEVTOOLS_EXTENSION__.connect({ name: e[t] }),
    a = !1;
  n.subscribe(function(t) {
    'DISPATCH' === t.type &&
      (function(t) {
        switch (t.payload.type) {
          case 'RESET':
            return r(e, s), n.init(s);
          case 'COMMIT':
            return n.init(e.getSnapshot());
          case 'ROLLBACK':
            return n.init(JSON.parse(t.state));
          case 'JUMP_TO_STATE':
          case 'JUMP_TO_ACTION':
            return r(e, JSON.parse(t.state));
          case 'IMPORT_STATE':
            var a = t.payload.nextLiftedState,
              c = a.computedStates;
            r(e, c[c.length - 1].state), n.send(null, a);
        }
      })(t);
  });
  var s = e.getSnapshot();
  function r(t, e) {
    (a = !0), t.applySnapshot(e), (a = !1);
  }
  n.init(s),
    e.onAction(function(t) {
      if (!a) {
        var s = {};
        (s.type = t.name),
          t.args &&
            t.args.forEach(function(t, e) {
              return (s[e] = t);
            }),
          n.send(s, e.getSnapshot());
      }
    }, !0);
}
module.exports = n;
//# sourceMappingURL=devtools.js.map
