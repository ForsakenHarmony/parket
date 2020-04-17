import {
  createContext,
  createElement,
  useContext,
  useState,
  useEffect,
} from 'react';

import { assign } from '../util.ts';

const EMPTY_OBJECT = {};

export function observe(Child) {
  return function ObserveWrapper(props) {
    const [_, update] = useState(EMPTY_OBJECT);

    useEffect(() => {
      const observed = Object.values(props)
        .filter((prop) => prop.__p_model && prop.onPatch)
        .map((model) => model.onPatch(() => update({})));

      return () => observed.forEach((unsub) => unsub());
    }, [props]);

    return createElement(Child, props);
  };
}

const ctx = createContext(null);
export const Provider = ({ store, children }) =>
  createElement(ctx.Provider, { value: store }, ...children);

export function connect(Child) {
  return function ConnectWrapper(props) {
    const store = useContext(ctx);
    const [_, update] = useState(EMPTY_OBJECT);

    useEffect(() => {
      const unsub = store.onPatch(() => update({}));
      return unsub;
    }, [store]);

    return createElement(Child, assign({ store }, props));
  };
}

export function useStore() {
  const store = useContext(ctx);
  const [_, update] = useState(EMPTY_OBJECT);

  useEffect(() => {
    const unsub = store.onPatch(() => update({}));
    return unsub;
  }, [store]);

  return store;
}

export function useObserved(store) {
  const [_, update] = useState(EMPTY_OBJECT);

  useEffect(() => {
    const unsub = store.onPatch(() => update({}));
    return unsub;
  }, [store]);

  return store;
}
