import { apc, modelName, modelSymbol, parentSymbol, vpc } from './symbols';
import mitt, { EventHandler, Emitter } from './emitter';

export interface Event {
  path?: string;
  value?: string;
  [index: string]: any;
}

export interface EmitFn {
  (evt: string, val: Event): void;
}

export interface ModelCommons<S> {
  onAction(fn: EventHandler, after?: boolean): Function;
  onSnapshot(fn: EventHandler): Function;
  onPatch(fn: EventHandler): Function;
  getSnapshot(): object;
  applySnapshot(snapshot: object, dontemit?: boolean): void;
  getParent(): Model<any> | null;
  getRoot(): Model<any>;

  [modelName]: string;
  [modelSymbol]: boolean;
  [parentSymbol](emit: EmitFn, _parent: Model<S>, _path: string): void;
}

export type Model<S> = ModelCommons<S> & {
  [vpc]: Model<S>;
  [apc]: Model<S>;
  [index: string]: any;
} & S;

export interface Init<S, T extends Model<S> = Model<S>> {
  [index: string]:
    | (<R>(this: T, ...args: any[]) => R)
    | string
    | number
    | object
    | boolean
    | null
    | undefined;
}

export type Obj = { [index: string]: any };

const objKeys = Object.keys.bind(Object);
function diff<S>(
  oldObj: Model<S>,
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
        oldObj[apc][key] = newVal;
      }
    });
}

function setUpObject<S>(
  obj: Model<S>,
  emit: EmitFn,
  symbol: Symbol,
  path: string,
  parent = obj
): Model<S> {
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
      obj[prop] = setUpObject(val, emit, symbol, path + '/' + prop, parent);
    }
  }

  return obj;
}

function cProxy<S>(
  obj: Model<S>,
  emit: EmitFn,
  symbol: Symbol,
  view: boolean,
  path: string,
  parent: Model<S>
) {
  return new Proxy(obj, {
    get(target: Model<S>, prop) {
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
    set(target: Model<S>, prop: string, val) {
      if (view) {
        throw new Error("You can't modify the state outside of actions");
      }
      if (target[prop] === val) return true;
      if (typeof prop === 'symbol') {
        target[prop] = val;
        return true;
      }
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

function subscribe(emitter: Emitter, evt: string, fn: EventHandler) {
  emitter.on(evt, fn);
  return () => emitter.off(evt, fn);
}

const modelMap = new Map();

export default function model<S extends Init<S, Model<S>>>(
  name: string,
  init: (obj?: Partial<S>) => S
): (obj?: Partial<S>) => Model<S> {
  function instantiate(obj: Partial<S> = {}): Model<S> {
    const symbol = Symbol('model');

    let path = '';
    let parentEmit: EmitFn | null = null;
    let parent: Model<any> | null = null;
    const emitter = mitt();

    const model = init(obj);

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

    let state = {} as Model<S>;

    const common: ModelCommons<S> = {
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
        diff<S>(state, snapshot, whitelist);
        !dontemit && emit('snapshot', {});
      },
      getParent() {
        return parent;
      },
      getRoot() {
        return parent ? parent.getRoot() : state;
      },
      [modelSymbol]: true,
      [parentSymbol]: (emit: EmitFn, _parent: Model<any>, _path: string) => {
        parentEmit = emit;
        path = _path;
        parent = _parent;
      },
      [modelName]: name,
    };

    whitelist.push.apply(whitelist, objKeys(common));

    state = setUpObject<S>(common as Model<S>, emit, symbol, '');

    // r = refresh on get, v = value
    const caches: { [index: string]: { v: any; r: boolean } } = {};

    const emitSnapshot = (name: string, args: any[]) => {
      emit('action-complete', { name, path: '', args });
      emit('snapshot', {});
    };

    for (const key in model) {
      const prop = Object.getOwnPropertyDescriptor(model, key);
      if (!prop) continue;

      if (typeof prop.get === 'function') {
        // view
        const view = prop.get;
        Object.defineProperty(state, key, {
          get: () => {
            const cache = caches[key];
            if (cache.r) {
              cache.r = false;
              cache.v = view.apply(state[vpc]);
            }
            return cache.v;
          },
          configurable: false,
        });
        caches[key] = { v: undefined, r: true };
      } else if (typeof prop.value === 'function') {
        // action
        const action: Function = prop.value;
        state[key] = ((...args: any[]) => {
          emit('action', { name: key, path: '', args: args });
          const res = action.apply(state[apc], args);
          if (res != null && res.then) {
            res.then(emitSnapshot.bind(null, key, args));
          } else {
            emitSnapshot(key, args);
          }
          return res;
        }) as any;
        whitelist.push(key);
      } else {
        // prop
        state[apc][key] = prop.value;
      }
    }

    // update the cache on change
    state.onPatch(() => {
      for (const key in caches) {
        caches[key].r = true;
      }
    });

    return state;
  }
  modelMap.set(name, instantiate);
  return obj => instantiate(obj)[vpc];
}

export function clearCache() {
  modelMap.clear();
}

// this is for non esm builds with microbundle
// @ts-ignore
model.clearCache = clearCache;
