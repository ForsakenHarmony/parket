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
