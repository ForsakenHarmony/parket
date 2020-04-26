import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  ComponentType,
  ReactNode,
} from 'react';

import { Model } from 'parket';

const EMPTY_OBJECT = {};

export function observe<P extends Record<string, any> = {}>(
  Child: ComponentType<P>
) {
  return function ObserveWrapper(props: P) {
    const [, update] = useState(EMPTY_OBJECT);

    useEffect(() => {
      const observed = Object.values(props)
        .filter((prop) => prop.__p_model && prop.onPatch)
        .map((model) => model.onPatch(() => update({})));

      return () => observed.forEach((unsub) => unsub());
    }, [props]);

    return createElement(Child, props);
  };
}

const ctx = createContext<Model<any> | null>(null);
export const Provider = ({
  store,
  children,
}: {
  store: Model<any>;
  children: ReactNode[];
}) => createElement(ctx.Provider, { value: store, children: children });

export function connect<P extends { store: Model<any> }>(
  Child: ComponentType<P>
) {
  return function ConnectWrapper(props: Omit<P, 'store'>) {
    const store = useContext(ctx);
    if (!store) throw new Error('Store not found in context');
    const [, update] = useState(EMPTY_OBJECT);

    useEffect(() => {
      const unsub = store.onPatch(() => update({}));
      return unsub;
    }, [store]);

    return createElement(Child, Object.assign({ store }, props) as P);
  };
}

export function useStore() {
  const store = useContext(ctx);
  if (!store) throw new Error('Store not found in context');
  const [, update] = useState(EMPTY_OBJECT);

  useEffect(() => {
    const unsub = store.onPatch(() => update({}));
    return unsub;
  }, [store]);

  return store;
}

export function useObserved(store: Model<any>) {
  const [, update] = useState(EMPTY_OBJECT);

  useEffect(() => {
    const unsub = store.onPatch(() => update({}));
    return unsub;
  }, [store]);

  return store;
}
