import { modelSymbol, parentSymbol, apc, vpc, modelName } from './symbols';
import { assign } from './util';
import { emitter as mitt, EventHandler, Emitter } from './emitter';

const modelMap = new Map();

const objKeys = Object.keys.bind(Object);

export type EmitFn = (evt: string, val: Event) => void;

interface ModelCommons {
  onAction(fn: EventHandler, after?: boolean): Function;
  onSnapshot(fn: EventHandler): Function;
  onPatch(fn: EventHandler): Function;
  getSnapshot(): object;
  applySnapshot(snapshot: object, dontemit?: boolean): void;
  getParent(): (UnknownObj & Model<UnknownObj>) | null;
  getRoot(): UnknownObj & Model<UnknownObj>;
}

export type FnMap = { [index: string]: Function };

type Obj = { [index: string]: any };
type UnknownObj = { [index: string]: unknown };

export interface Model<S extends Obj> extends ModelCommons {
  [vpc]: S & Model<S>;
  [apc]: S & Model<S>;
  [modelName]: string;
  [modelSymbol]: boolean;
  [parentSymbol]: (emit: EmitFn, _parent: Model<S>, _path: string) => void;
}

// export type Model<S> = ModelCommons & {
//   [vpc]: S & Model<S>;
//   [apc]: S & Model<S>;
//   [modelName]: string;
//   [modelSymbol]: boolean;
//   [parentSymbol]: (emit: EmitFn, _parent: Model<S>, _path: string) => void;
// };

export type Event = {
  path?: string;
  value?: string;
  [index: string]: any;
};

export type ModelArgs<S extends Obj, A extends FnMap, V extends FnMap> = {
  initial: () => S;
  actions?: (self: S & Model<S>) => A;
  views?: (self: S & Model<S>) => V;
};

function diff<S extends Obj>(
  oldObj: S & Model<S>,
  newObj: { [index: string]: any },
  whitelist: string[]
) {
  if (oldObj === newObj) return;
  objKeys(oldObj)
    .reduce(
      (acc: string[], val: string) =>
        ~acc.indexOf(val) ? acc : acc.concat(val),
      objKeys(newObj)
    )
    .forEach((key: string) => {
      if (~whitelist.indexOf(key)) return;
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      if (oldVal === newVal) return;
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
        (oldObj[apc] as Obj)[key] = newVal;
      }
    });
}

function setUpObject<S extends Obj, K extends keyof S>(
  obj: S & Model<S>,
  emit: EmitFn,
  symbol: Symbol,
  path: string,
  parent = obj
) {
  if (obj[modelName] && !obj[modelSymbol]) {
    obj = modelMap.has(obj[modelName])
      ? modelMap.get(obj[modelName])(obj)
      : obj;
  }
  if (obj[modelSymbol] && obj !== parent) {
    obj[parentSymbol](emit, parent, path);
    return obj;
  } else {
    // have to ignore errors because typescript doesn't like indexing with symbols
    if (
      !obj[apc] ||
      // @ts-ignore
      !obj[apc][symbol]
    )
      obj[apc] = cProxy(obj, emit, symbol, false, path, parent);

    if (
      !obj[vpc] ||
      // @ts-ignore
      !obj[vpc][symbol]
    )
      obj[vpc] = cProxy(obj, emit, symbol, true, path, parent);
  }

  for (let prop in obj) {
    const val = obj[prop];
    if (val != null && typeof val === 'object') {
      obj[prop as K] = setUpObject<any, any>(
        val,
        emit,
        symbol,
        path + '/' + prop,
        parent
      );
    }
  }

  return obj;
}

function cProxy<S extends Obj, K extends keyof (S & Model<S>)>(
  obj: S & Model<S>,
  emit: EmitFn,
  symbol: Symbol,
  view: boolean,
  path: string,
  parent: S & Model<S>
): S & Model<S> {
  return new Proxy(obj, {
    get(target: S & Model<S>, prop) {
      if (prop === symbol) return true;
      // @ts-ignore
      if (typeof prop === 'symbol') return target[prop];
      const res = target[prop];
      // check if there are other built in constructors that need this
      if (target instanceof Date && typeof res === 'function')
        return res.bind(target);
      return (
        (res != null &&
          typeof res === 'object' &&
          (view ? res[vpc] : res[apc])) ||
        res
      );
    },
    set(target: S & Model<S>, prop: string, val) {
      if (view) {
        throw new Error("You can't modify the state outside of actions");
      }
      if (target[prop] === val) return true;
      if (typeof prop === 'symbol') {
        target[prop as K] = val;
        return true;
      }
      if (val != null && typeof val === 'object') {
        val = setUpObject(
          val,
          emit,
          symbol,
          path + '/' + prop,
          parent || (target[vpc] as S & Model<S>)
        );
      }
      target[prop as K] = val;
      emit('patch', { path: path + '/' + prop, op: 'replace', value: val });
      return true;
    },
  }) as S & Model<S>;
}

function subscribe(emitter: Emitter, evt: string, fn: EventHandler) {
  emitter.on(evt, fn);
  return () => emitter.off(evt, fn);
}

export function model<
  S extends Obj,
  K extends keyof S,
  A extends FnMap = {},
  V extends FnMap = {}
>(
  name: string,
  { initial, actions, views }: ModelArgs<S, A, V>
): (obj?: object | undefined) => S & A & V & Model<S> {
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

  function instantiate(obj: object = {}) {
    const symbol = Symbol('model');

    let path = '';
    let parentEmit: EmitFn | null = null;
    let parent: Model<any> | null = null;
    const emitter = mitt();
    let state = assign(initial(), obj) as S & Model<S>;

    const emit: EmitFn = (evt, val) => {
      if (evt === 'snapshot') {
        val = common.getSnapshot();
      } else if (val.path != null) {
        val.path = path + val.path;
      }
      emitter.emit(evt, val);
      parentEmit && parentEmit(evt, val);
    };

    const whitelist: string[] = [];

    const common: ModelCommons = {
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
      getParent<M extends Model<M>>() {
        return parent as M | null;
      },
      getRoot<M extends Model<M>>() {
        return (parent
          ? parent.getRoot()
            ? parent.getRoot()
            : parent
          : state) as M;
      },
    };

    whitelist.push.apply(whitelist, objKeys(common));

    assign(state, common);

    state[modelSymbol] = true;
    state[parentSymbol] = (
      emit: EmitFn,
      _parent: Model<any>,
      _path: string
    ) => {
      parentEmit = emit;
      path = _path;
      parent = _parent;
    };
    state[modelName] = name;

    state = setUpObject(state, emit, symbol, '');

    if (actions) {
      const boundActions = actions(state[apc] as Model<S> & S);
      const keys = objKeys(boundActions);

      const emitSnapshot = (name: string, args: any[]) => {
        emit('action-complete', { name, path: '', args });
        emit('snapshot', {});
      };

      for (let key of keys) {
        const action = boundActions[key];

        (state[key as K] as any) = (...args: any[]) => {
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
      const boundViews = views(state[vpc] as Model<S> & S);
      const keys = objKeys(boundViews);
      // r = refresh on get, v = value
      // I don't trust uglify here
      const caches: { [index: string]: { v: any; r: boolean } } = {};

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
  }

  modelMap.set(name, instantiate);
  return (obj) => instantiate(obj)[vpc] as S & A & V & Model<S>;
}

export function clearCache() {
  modelMap.clear();
}
