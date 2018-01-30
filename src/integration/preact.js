import { Component, h } from 'preact';

import { modelSymbol, observedSymbol } from '../symbols';

import { assign } from '../util';

const EMPTY_OBJECT = {};

export function observe(Child) {
  function Wrapper(props) {
    const update = () => this.setState(EMPTY_OBJECT);
    this.componentDidMount = () => {
      this[observedSymbol] = Object.values(props)
        .filter(prop => prop[modelSymbol])
        .map(model => model.onPatch(update));
    };
    this.componentWillUnmount = () => {
      this[observedSymbol].forEach(unsub => unsub());
    };
    this.render = props => h(Child, props);
  }

  return ((Wrapper.prototype = new Component()).constructor = Wrapper);
}

export function connect(Child) {
  function Wrapper(props, { store }) {
    const update = () => this.setState(EMPTY_OBJECT);
    this.componentDidMount = () => {
      this.unsubscribe = store.onPatch(update);
    };
    this.componentWillUnmount = () => {
      this.unsubscribe();
    };
    this.render = props => h(Child, assign({ store }, props));
  }

  return ((Wrapper.prototype = new Component()).constructor = Wrapper);
}

export function Provider(props) {
  this.getChildContext = () => ({ store: props.store });
}

Provider.prototype.render = props => props.children[0];
