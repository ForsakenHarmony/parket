const model = require('./');

const foo = { connected: false };

const Test = model('test', () => ({
  ...foo,

  get isConnected() {
    return this.connected;
  },
}));

const instance = Test();
console.log(instance.connected); // true
console.log(instance.isConnected); // undefined
