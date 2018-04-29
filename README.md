<h1 align="center">
  <img src="https://github.com/ForsakenHarmony/parket/blob/master/.github/logo.png?raw=true">
</h1>

<br />

<div align="center">
  <a href="https://travis-ci.org/ForsakenHarmony/parket">
    <img src="https://travis-ci.org/ForsakenHarmony/parket.svg?branch=master" alt="travis">
  </a>
  <a href='https://coveralls.io/github/ForsakenHarmony/parket?branch=master'>
    <img src='https://coveralls.io/repos/github/ForsakenHarmony/parket/badge.svg?branch=master' alt='Coverage Status' />
  </a>
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

<br>

 * Small (~1.5KB)
 * Immutable from the outside, mutable in actions
 * Reactive (state emits updates without explicit calls to i.e. `setState`)
 * Modular (you can nest models inside each other)

## Why?

I was disappointed with all the current state management solutions.
Then I found mobx-state-tree, which seemed like a godsend to me (ok not really, but I liked the concept), but it was pretty big in terms of file size (mobx alone is big: 16.5kB).
So I thought it's surely possible to make a smaller version of it, that's how this started.
And after 2 failed attempts I can finally say: **Here it is in all of its "glory".**

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

Note: This library uses Proxies and Symbols. Proxies cannot be fully polyfilled so you have to target modern browers which support Proxies.

### Basic example

```js
import model from 'parket';
// model returns a "constructor" function
const Person = model('Person', { // name is used internally for serialization
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
const unsubscribe = instance.onSnapshot(console.log);

// you can unsubscribe by calling the function returned by the listener
// unsubscribe();

instance.setLastName('Clancy');

// views turn into cached getters
console.log(instance.fullname); // 'Tom Clancy'

// nested models also bubble up events to the parent
instance.setNested(Person());

instance.nested.setFirstName('wow');

// you can get a snapshot of the state at any time
// { firstname: 'Tom', lastname: 'Clancy',  nested: { firstname: 'wow', lastname: null, nested: null } }
console.log(instance.getSnapshot());
```

### Async example

```js
const Async = model('Async', {
  initial: () => ({
    loading: false,
    result: null,
  }),
  actions: self => ({
    async doSomethingAsync() { // actions can be async, parket doesn't care
      self.loading = true;
      self.result = await somethingAsync(); // be aware that you should handle errors
      self.loading = false;
    },
  })
});
```

### preact / react

```js
import { Component } from 'preact';
import { observe, connect, Provider } from 'parket/preact'; // or 'parket/react'

// observe keeps the component updated to models in the prop
@observe
class Observed extends Component {
  render({person}) { // if you're using react, props don't get passed to render so you have to use `const {person} = this.props;`
    return (
      <div>
        <h1>{person.fullname}</h1>
      </div>
    );
  }
}

// connect inserts the store/instance into props
@connect
class Person extends Component {
  render({store}) { // if you're using react, props don't get passed to render so you have to use `const {store} = this.props;`
    return (
      <div>
        <h1>{store.fullname}</h1>
      </div>
    );
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

## Credits

* [Mobx State Tree for Inspiration](https://github.com/mobxjs/mobx-state-tree)
* [unistore for the preact integration](https://github.com/developit/unistore/)
* [Zouhir for the awesome logo](https://twitter.com/_zouhir)

## License

[MIT © hrmny.pw](https://oss.ninja/mit/forsakenharmony)
