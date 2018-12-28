import model, { clearCache } from '../src';

describe('model()', function() {
  beforeEach(() => {
    clearCache();
  });

  it('should create a model', () => {
    expect(model('Model', () => ({})));
  });

  it('should instantiate', () => {
    const Model = model('Model', () => ({}));
    const instance = Model();

    expect(instance).toMatchObject({
      getSnapshot: expect.any(Function),
      applySnapshot: expect.any(Function),
      onPatch: expect.any(Function),
      onAction: expect.any(Function),
      onSnapshot: expect.any(Function),
    });
  });

  it('should instantiate with objects / arrays in initial state', () => {
    const Model = model('Model', () => ({
      obj: {
        test: true,
      },
      arr: [1, 2, 3],
    }));
    const instance = Model();
    expect(instance);
  });

  it('should instantiate with objects / arrays in nested initial state', () => {
    const Nested = model('Nested', () => ({
      obj: {
        test: true,
      },
      arr: [1, 2, 3],
    }));

    const Model = model('Model', () => ({
      nested: Nested(),
    }));

    const instance = Model();
    expect(instance);
  });

  it('should have props, actions and views', () => {
    const Person = model('Person', ({ firstname }) => ({
      firstname,
      lastname: 'Lennon',

      setFirstName(first: string) {
        this.firstname = first;
      },
      setLastName(last: string) {
        this.lastname = last;
      },

      get fullname() {
        return `${this.firstname} ${this.lastname}`;
      },
    }));

    const instance = Person({ firstname: 'John' });

    expect(instance).toMatchObject({
      firstname: 'John',
      lastname: 'Lennon',

      setFirstName: expect.any(Function),
      setLastName: expect.any(Function),

      fullname: 'John Lennon',
    });

    function test(thing: string) {
      console.log(thing);
    }

    const name = instance.fullname;

    test(name);

    instance.setFirstName('Tom');
    instance.setLastName('Clancy');

    expect(instance.fullname).toBe('Tom Clancy');
  });

  it('should allow arbitrary props', () => {
    const Person = model('Person', () => ({
      a: 'foo',
      b: 1337,
      c: null,
      d: 'bob' as null | string,
      e: null as null | number | string,
    }));

    const instance = Person();
    expect(instance.d).toBe('bob');
  });

  it('should emit on change', () => {
    const Model = model('Model', () => ({
      test: 0,

      increment() {
        this.test++;
      },
    }));

    const instance = Model();

    const pSub = jest.fn();
    const aSub = jest.fn();

    instance.onPatch(pSub);
    instance.onAction(aSub);

    instance.increment();

    expect(pSub).toBeCalled();
    expect(aSub).toBeCalled();
  });

  it('should get events from nested objects', function() {
    const Model = model('Model', () => ({
      nested: {
        test: 0,
      },
      increment() {
        this.nested.test++;
      },
    }));

    const instance = Model();

    const sub = jest.fn();
    instance.onPatch(sub);
    instance.increment();
    expect(sub).toBeCalled();
  });

  it('should get events from nested models', function() {
    const Nested = model('Nested', () => ({
      test: 0,
      increment() {
        this.test++;
      },
    }));

    const Model = model('Model', () => ({
      nested: Nested(),
    }));

    const instance = Model();

    const sub = jest.fn();
    instance.onPatch(sub);
    instance.nested.increment();
    expect(sub).toBeCalled();
  });

  it('should update on array methods', function() {
    const Model = model('Model', () => ({
      arr: [] as any[],
      pushToArr(thing: any) {
        this.arr.push(thing);
      },
      get firstElem() {
        return this.arr[0];
      },
    }));

    const instance = Model();

    const sub = jest.fn();
    instance.onPatch(sub);
    instance.pushToArr(2);
    expect(sub).toBeCalled();
    expect(instance.firstElem).toBe(2);
  });

  it('should handle dates', function() {
    const Model = model('Model', () => ({
      date: new Date(),
    }));

    const instance = Model();
    instance.getSnapshot();
    instance.date.getDate();
  });

  it('should apply snapshots', function() {
    const Person = model('Person', () => ({
      firstname: 'John',
      lastname: 'Lennon',
      get fullname() {
        return `${this.firstname} ${this.lastname}`;
      },
    }));

    const instance = Person();

    instance.applySnapshot({ firstname: 'Tom', lastname: 'Clancy' });

    expect(instance.fullname).toBe('Tom Clancy');
  });

  it('should get the root in nested models', () => {
    const Model2 = model('M1', () => ({
      root() {
        return this.getRoot().thing;
      },
    }));

    const Model1 = model('M1', () => ({
      nest: Model2(),
      root() {
        return this.getRoot().thing;
      },
    }));

    const Model = model('M', () => ({
      nest: Model1(),
      thing: 'root',
    }));

    const instance = Model();

    expect(instance.nest.root()).toBe('root');
    expect(instance.nest.nest.root()).toBe('root');
  });

  // it('should call init when instantiated', () => {
  //   const init = jest.fn();
  //
  //   const Model = model('Model', {
  //     initial: () => ({}),
  //     actions: state => ({
  //       init,
  //     }),
  //   });
  //   Model();
  //   expect(init).toBeCalled();
  // });
});
