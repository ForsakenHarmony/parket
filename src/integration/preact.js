import { Component, h } from 'preact';

import { modelSymbol, observedSymbol } from '../symbols';

export function observe (Child) {
  function Wrapper (props) {
    const update = () => this.setState(null);
    this.componentDidMount = () => {
      this[observedSymbol] = Object.values(props).filter(prop => prop[modelSymbol]);
      this[observedSymbol].forEach(model => model.subscribe(update));
    };
    this.componentWillUnmount = () => {
      this[observedSymbol].forEach(model => model.unsubscribe(update));
    };
    this.render = props => h(Child, props);
  }

  return (Wrapper.prototype = new Component()).constructor = Wrapper;
}

export function connect (Child) {
  function Wrapper (props, { store }) {
    const update = () => this.setState(null);
    this.componentDidMount = () => {
      store.subscribe(update);
    };
    this.componentWillUnmount = () => {
      store.unsubscribe(update);
    };
    this.render = props => h(Child, props);
  }

  return (Wrapper.prototype = new Component()).constructor = Wrapper;
}

export function Provider (props) {
  this.getChildContext = () => ({ store: props.store });
}

Provider.prototype.render = props => props.children[0];
