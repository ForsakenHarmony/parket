import mitt from 'mitt';

import { modelSymbol, parentSymbol, apc, vpc } from './symbols';
import { assign } from './util';

function setUpObject (obj, emit, symbol, path) {
  for (let prop in obj) {
    const val = obj[prop];
    if (val != null && typeof val === 'object') {
      if (val[modelSymbol]) {
        val[parentSymbol](emit, path + '/' + prop);
      } else {
        val[apc] = val[apc] && val[apc][symbol] || cProxy(val, emit, symbol, false, path);
        val[vpc] = val[vpc] && val[vpc][symbol] || cProxy(val, emit, symbol, true, path);
        setUpObject(val);
      }
    }
  }
}

function cProxy (obj, emit, symbol, view, path) {
  return new Proxy(
    obj,
    {
      get (target, prop) {
        if (prop === symbol) return true;
        const res = target[prop];
        return (res != null && typeof res === 'object' && (view ? res[vpc] : res[apc])) || res;
      },
      set (target, prop, val) {
        if (view) throw new Error('You can\'t modify the state outside of actions');
        if (target[prop] === val) return true;
        if (val != null && typeof val === 'object') {
          setUpObject(val, emit, symbol);
        }
        target[prop] = val;
        emit('patch', { path: path + '/' + prop, op: 'replace', value: val });
        return true;
      },
    },
  );
}

const model = ({ initial, actions, views }) => {
  if (initial == null || typeof initial !== 'object' && typeof initial !== 'function') {
    throw new Error('You have to supply an object or a function as the initial state');
  }
  if (actions != null && typeof actions !== 'function') {
    throw new TypeError('actions has to be a function');
  }
  if (views != null && typeof views !== 'function') {
    throw new TypeError('views has to be a function');
  }

  return obj => {
    const symbol = Symbol('model');

    let path = '';
    let parentEmit = null;
    const emitter = mitt();
    const state = assign(
      typeof initial === 'function' ? initial() : initial,
      obj,
    );

    const emit = (evt, val) => {
      if (evt === 'snapshot') {
        val = common.getSnapshot();
      } else if (val.path != null) {
        val.path = path + val.path;
      }
      emitter.emit(evt, val);
      parentEmit && parentEmit(evt, val);
    };

    const common = {
      subscribe (evt, fn) {
        emitter.on(evt, fn);
      },
      unsubscribe (evt, fn) {
        emitter.off(evt, fn);
      },
      getSnapshot () {
        return JSON.parse(JSON.stringify(state));
      },
      applySnapshot (snapshot) {
        // FIXME will override nested models
        setUpObject(snapshot, emit, symbol, '');
        assign(state, snapshot);
        emit('snapshot', {})
      },
    };
    assign(state, common);

    state[modelSymbol] = true;
    state[parentSymbol] = (emit, _path) => {
      parentEmit = emit;
      path = _path;
    };

    setUpObject(state, emit, symbol, '');
    const viewProxy = cProxy(state, emit, symbol, true, '');
    const actionProxy = cProxy(state, emit, symbol, false, '');

    if (actions) {
      const boundActions = actions(actionProxy);

      const emitSnapshot = () => {
        emit('snapshot', {});
      };

      for (let key in boundActions) {
        const action = boundActions[key];

        state[key] = (...args) => {
          emit(
            'action',
            { name: key, path: '', args: args },
            true,
          );
          const res = action.apply(null, args);
          if (res != null && res.then) {
            res.then(emitSnapshot);
          } else {
            emitSnapshot();
          }
          return res;
        };
      }
    }

    if (views) {
      const boundViews = views(viewProxy);
      const keys = Object.keys(boundViews);
      const cache = {};

      for (let key of keys) {
        const viewFn = boundViews[key];

        Object.defineProperty(state, key, { get: () => cache[key], configurable: false });
        cache[key] = viewFn();
      }

      // update the cache on change
      emitter.on('*', () => {
        for (let key of keys) {
          cache[key] = boundViews[key]();
        }
      });
    }

    return viewProxy;
  };
};

export default model;
