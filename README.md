# parket

<div align="center">
  <a href="https://www.npmjs.org/package/parket">
    <img src="https://img.shields.io/npm/v/parket.svg" alt="npm">
  </a>
  <a href="https://www.npmjs.com/package/parket">
    <img src="https://img.shields.io/npm/dm/parket.svg" alt="version" />
  </a>
  <a href="https://oss.ninja/mit/forsakenharmony">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
  </a>
</div>

## Installation

```
$ npm i parket
```

```js
// ES6
import model from 'parket';
// CJS
const model = require('parket');
```

## Usage

```js
import model from 'parket';

const Person = model({ // model returns a "constructor" function
  initial: () => ({
    firstname: null,
    lastname: null,
    nested: null,
  }),
  actions: state => ({
    setFirstName (first) {
      state.firstname = first; // no set state, no returns to merge, it's reactive™
    },
    setLastName (last) {
      state.lastname = last;
    },
    setNested (nested) {
      state.nested = nested;
    },
  }),
  views: state => ({
    fullname: () => `${state.firstname} ${state.lastname}`, // views are computed properties
  }),
});

// merge an object with the initial state
const instance = Person({ firstname: 'Tom' });

// you can subscribe to actions, patches (state updates) and snapshots (full state after actions)
instance.subscribe('*', console.log);

instance.setLastName('Clancy');

// views turn into cached getters
console.log(instance.fullname);

// nested models also bubble up events to the parent
instance.setNested(thing());

instance.nested.setFirstName('wow');

// you can get a snapshot of the state at any time
// { firstname: 'Tom', lastname: 'Clancy',  nested: { firstname: 'wow', lastname: null, nested: null } }
console.log(instance.getSnapshot());
```

### preact

```jsx
import { Component } from 'preact';
import { observe, connect, Provider } from 'parket/preact';

// observe keeps the component updated to models in the prop
@ovserve
class Observed extends Component {
  render({person}) {
    return (
      <div>
        <h1>{person.fullname}</h1>
      </div>
    )
  }
}

// connect inserts the store/instance into props
@connect
class Person extends Component {
  render({store}) {
    return (
      <div>
        <h1>{store.fullname}</h1>
      </div>
    )
  }
}

// Provider adds an instance to the context
const root = () => (
  <Provider store={instance}>
    <div id="app">
      <Person/>
      <Observed person={instance}/>
    </div>
  </Provider>
);
```

### react

```js
// same api
import { observe, connect, Provider } from 'parket/react';
```

## Credits

* [Mobx State Tree for Inspiration](https://github.com/mobxjs/mobx-state-tree)
* [unistore for the preact integration](https://github.com/developit/unistore/)

## License

[MIT © hrmny.pw](https://oss.ninja/mit/forsakenharmony)
