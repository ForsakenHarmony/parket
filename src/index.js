import mitt from 'mitt';

import { modelSymbol, parentSymbol, apc, vpc } from './symbols';
import { assign } from './util';

export const modelName = '__p_model';

const modelMap = new Map();

const objKeys = Object.keys.bind(Object);

function diff(oldObj, newObj, whitelist) {
  if (oldObj === newObj) return oldObj;
  objKeys(oldObj)
    .reduce(
      (acc, val) => (~acc.indexOf(val) ? acc : acc.concat(val)),
      objKeys(newObj)
    )
    .forEach(key => {
      if (~whitelist.indexOf(key)) return;
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      if (oldVal === newVal) return oldObj;
      if (
        oldVal != null &&
        newVal != null &&
        typeof oldVal === 'object' &&
        typeof newVal === 'object'
      ) {
        oldVal[modelSymbol]
          ? oldVal.applySnapshot(newVal, true)
          : diff(oldVal, newVal, whitelist);
      } else {
        oldObj[apc][key] = newVal;
      }
    });
}

function setUpObject(obj, emit, symbol, path, parent = obj) {
  if (obj[modelName] && !obj[modelSymbol]) {
    obj = modelMap.has(obj[modelName])
      ? modelMap.get(obj[modelName])(obj)
      : obj;
  }
  if (obj[modelSymbol] && obj !== parent) {
    obj[parentSymbol](emit, parent, path);
    return obj;
  } else {
    obj[apc] =
      (obj[apc] && obj[apc][symbol]) ||
      cProxy(obj, emit, symbol, false, path, parent);
    obj[vpc] =
      (obj[vpc] && obj[vpc][symbol]) ||
      cProxy(obj, emit, symbol, true, path, parent);
  }

  for (let prop in obj) {
    const val = obj[prop];
    if (val != null && typeof val === 'object') {
      obj[prop] = setUpObject(val, emit, symbol, path + '/' + prop, parent);
    }
  }

  return obj;
}

function cProxy(obj, emit, symbol, view, path, parent) {
  return new Proxy(obj, {
    get(target, prop) {
      if (prop === symbol) return true;
      if (typeof prop === 'symbol') return target[prop];
      const res = target[prop];
      return (
        (res != null &&
          typeof res === 'object' &&
          (view ? res[vpc] : res[apc])) ||
        res
      );
    },
    set(target, prop, val) {
      if (view) {
        throw new Error("You can't modify the state outside of actions");
      }
      if (target[prop] === val) return true;
      if (val != null && typeof val === 'object') {
        val = setUpObject(
          val,
          emit,
          symbol,
          path + '/' + prop,
          parent || target[vpc]
        );
      }
      target[prop] = val;
      emit('patch', { path: path + '/' + prop, op: 'replace', value: val });
      return true;
    },
  });
}

function subscribe(emitter, evt, fn) {
  emitter.on(evt, fn);
  return () => emitter.off(evt, fn);
}

const model = (name, { initial, actions, views }) => {
  if (typeof initial !== 'function') {
    throw new Error(
      'You have to supply a function that returns the initial state'
    );
  }
  if (actions != null && typeof actions !== 'function') {
    throw new TypeError('actions has to be a function');
  }
  if (views != null && typeof views !== 'function') {
    throw new TypeError('views has to be a function');
  }

  const instantiate = obj => {
    const symbol = Symbol('model');

    let path = '';
    let parentEmit = null;
    let parent = null;
    const emitter = mitt();
    let state = assign(initial(), obj);

    const emit = (evt, val) => {
      if (evt === 'snapshot') {
        val = common.getSnapshot();
      } else if (val.path != null) {
        val.path = path + val.path;
      }
      emitter.emit(evt, val);
      parentEmit && parentEmit(evt, val);
    };

    const whitelist = [];

    const common = {
      onAction(fn, after) {
        const evt = after ? 'action-complete' : 'action';
        return subscribe(emitter, evt, fn);
      },
      onSnapshot(fn) {
        return subscribe(emitter, 'snapshot', fn);
      },
      onPatch(fn) {
        return subscribe(emitter, 'patch', fn);
      },
      getSnapshot() {
        return JSON.parse(JSON.stringify(state));
      },
      applySnapshot(snapshot, dontemit) {
        diff(state, snapshot, whitelist);
        !dontemit && emit('snapshot', {});
      },
      getParent() {
        return parent;
      },
      getRoot() {
        return parent ? (parent.getRoot() ? parent.getRoot() : parent) : null;
      },
    };

    whitelist.push.apply(whitelist, objKeys(common));

    assign(state, common);

    state[modelSymbol] = true;
    state[parentSymbol] = (emit, _parent, _path) => {
      parentEmit = emit;
      path = _path;
      parent = _parent;
    };
    state[modelName] = name;

    state = setUpObject(state, emit, symbol, '');

    if (actions) {
      const boundActions = actions(state[apc]);
      const keys = objKeys(boundActions);

      const emitSnapshot = (name, args) => {
        emit('action-complete', { name, path: '', args });
        emit('snapshot', {});
      };

      for (let key of keys) {
        const action = boundActions[key];

        state[key] = (...args) => {
          emit('action', { name: key, path: '', args: args });
          const res = action.apply(null, args);
          if (res != null && res.then) {
            res.then(emitSnapshot.bind(null, key, args));
          } else {
            emitSnapshot(key, args);
          }
          return res;
        };
      }

      whitelist.push.apply(whitelist, keys);
    }

    if (views) {
      const boundViews = views(state[vpc]);
      const keys = objKeys(boundViews);
      // r = refresh on get, v = value
      // I don't trust uglify here
      const caches = {};

      for (let key of keys) {
        Object.defineProperty(state, key, {
          get: () => {
            const cache = caches[key];
            if (cache.r) {
              cache.r = false;
              cache.v = boundViews[key]();
            }
            return cache.v;
          },
          configurable: false,
        });
        caches[key] = { v: boundViews[key](), r: false };
      }

      // update the cache on change
      state.onPatch(() => {
        for (let key of keys) {
          caches[key].r = true;
        }
      });
    }

    // typeof state.init === 'function' && state.init();

    return state;
  };

  modelMap.set(name, instantiate);
  return obj => instantiate(obj)[vpc];
};

export default model;

export function clearCache() {
  modelMap.clear();
}
