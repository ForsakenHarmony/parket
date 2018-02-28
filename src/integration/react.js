import { Component, Children, createElement } from 'react';
import { assign } from '../util';
import { modelSymbol, observedSymbol } from '../symbols';

const CONTEXT_TYPES = {
  store: () => {},
};

const EMPTY_OBJECT = {};

export function observe(Child) {
  function Wrapper(props, context) {
    Component.call(this, props, context);
    const update = () => this.setState(EMPTY_OBJECT);
    this.componentDidMount = () => {
      this[observedSymbol] = Object.values(props)
        .filter(prop => prop.__p_model && prop.onPatch)
        .map(model => model.onPatch(update));
    };
    this.componentWillUnmount = () => {
      this[observedSymbol].forEach(unsub => unsub());
    };
    this.render = () => createElement(Child, props);
  }
  return ((Wrapper.prototype = Object.create(
    Component.prototype
  )).constructor = Wrapper);
}

export function connect(Child) {
  function Wrapper(props, context) {
    Component.call(this, props, context);
    const { store } = context;
    const update = () => this.setState(EMPTY_OBJECT);
    this.componentDidMount = () => {
      this.unsubscribe = store.onPatch(update);
    };
    this.componentWillUnmount = () => {
      this.unsubscribe();
    };
    this.render = () => createElement(Child, assign({ store }, props));
  }
  Wrapper.contextTypes = CONTEXT_TYPES;
  return ((Wrapper.prototype = Object.create(
    Component.prototype
  )).constructor = Wrapper);
}

export class Provider extends Component {
  getChildContext() {
    return { store: this.props.store };
  }
  render() {
    return Children.only(this.props.children);
  }
}
Provider.childContextTypes = CONTEXT_TYPES;
