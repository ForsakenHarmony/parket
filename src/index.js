import mitt from 'mitt';

import { notifySymbol, modelSymbol, parentSymbol, apc, vpc } from './symbols';

const cViewProxy = (obj, ext) => new Proxy(obj, {
  get (target, prop) {
    let res = target[prop];
    if (res != null && typeof res === 'object' && !res[modelSymbol]) {
      return (res[vpc] = res[vpc] || cViewProxy(res, {}));
    }
    return res === undefined ? ext[prop] : res;
  },
  set () {
    throw new Error('You can\'t modify the state outside of actions');
  },
});

function cActionProxy (obj, ext, cb, view, symbol) {
  return new Proxy(obj, {
    get (target, prop) {
      if (prop === symbol) {
        return true;
      }
      const res = target[prop];
      if (typeof res === 'object' && !res[modelSymbol]) {
        return (res[apc] = res[apc] && res[apc][symbol] || cActionProxy(res, {}, cb, view, symbol));
      }
      return res || ext[prop];
    },
    set (target, prop, val) {
      if (typeof val === 'object' && val[modelSymbol]) {
        val[parentSymbol](view, '/' + prop);
      }
      cb('patch', { path: '/' + prop, op: 'replace', value: val });
      target[prop] = val;
      return true;
    },
  });
}

const model = ({ initial, actions, views }) => {
  if (actions != null && typeof actions !== 'function') {
    throw new TypeError('actions has to be a function');
  }
  if (views != null && typeof views !== 'function') {
    throw new TypeError('views has to be a function');
  }

  return (obj) => {
    const symbol = Symbol('model');

    let parent = null;
    let path = '';
    const emitter = mitt();
    const state = Object.assign({}, typeof initial === 'function' ? initial() : initial, obj);

    const common = {
      [modelSymbol]: true,
      [parentSymbol] (_parent, _path) {
        parent = _parent;
        path = _path || '';
      },
      [notifySymbol] (evt, val) {
        if (val.path != null) {
          val.path = path + val.path;
        }
        emitter.emit(evt, val);
        parent && parent[notifySymbol](evt, val, true);
      },
      subscribe (evt, fn) {
        emitter.on(evt, fn);
      },
      unsubscribe (evt, fn) {
        emitter.off(evt, fn);
      },
      getSnapshot () {
        return JSON.parse(JSON.stringify(state));
      },
    };

    const viewProxy = cViewProxy(state, common);
    const actionProxy = cActionProxy(state, common, common[notifySymbol], viewProxy, symbol);

    if (actions) {
      const boundActions = actions(actionProxy);
      const keys = Object.keys(boundActions);

      for (let key of keys) {
        const action = boundActions[key];

        common[key] = (...args) => {
          common[notifySymbol]('action', { name: key, path: '', args: args }, true);
          return action.apply(null, args);
        };
      }
    }

    if (views) {
      const boundViews = views(viewProxy);
      const keys = Object.keys(boundViews);
      const cache = {};

      for (let key of keys) {
        const viewFn = boundViews[key];

        Object.defineProperty(common, key, { get: () => cache[key] });
        cache[key] = viewFn();
      }

      // update the cache on change
      emitter.on('patch', () => {
        for (let key of keys) {
          cache[key] = boundViews[key]();
        }
      });
    }

    return viewProxy;
  };
};

export default model;
