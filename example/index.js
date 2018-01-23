const model = require('../src');

const thing = model({
  initial: () => ({
    firstname: null,
    lastname: null,
    nested: null,
  }),
  actions: state => ({
    setFirstName (first) {
      state.firstname = first; // no set state, no returns to merge
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

const instance = thing({ firstname: 'Tom' }); // merge stuff with the initial state

instance.subscribe('*', console.log);

instance.setLastName('Clancy');

const fromView = instance.fullname; // views turn into cached getters

console.log(fromView);

instance.setNested(thing()); // nested models also emit events to the parent

instance.nested.setFirstName('wow');

console.log(instance.getSnapshot()); // { firstname: 'Tom', lastname: 'Clancy',  nested: { firstname: 'wow', lastname: null, nested: null } }
