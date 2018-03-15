import { Component, h } from 'preact';

import { observed } from '../symbols.ts';
import { assign } from '../util.ts';

const EMPTY_OBJECT = {};

export function observe(Child) {
  function Wrapper(props) {
    const update = () => this.setState(EMPTY_OBJECT);
    this.componentDidMount = () => {
      this[observed] = Object.values(props)
        .filter(prop => prop.__p_model && prop.onPatch)
        .map(model => model.onPatch(update));
    };
    this.componentWillUnmount = () => {
      this[observed].forEach(unsub => unsub());
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
