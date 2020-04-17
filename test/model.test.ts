import { model, clearCache } from '../src';

describe('model()', function () {
  beforeEach(() => {
    clearCache();
  });

  it('should create a model', () => {
    expect(model('Model', { initial: () => ({}) }));
  });

  it('should instantiate', () => {
    const Model = model('Model', { initial: () => ({}) });
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
    const Model = model('Model', {
      initial: () => ({
        obj: {
          test: true,
        },
        arr: [1, 2, 3],
      }),
    });
    const instance = Model();
    expect(instance);
  });

  it('should instantiate with objects / arrays in nested initial state', () => {
    const Nested = model('Nested', {
      initial: () => ({
        obj: {
          test: true,
        },
        arr: [1, 2, 3],
      }),
    });

    const Model = model('Model', {
      initial: () => ({
        nested: Nested(),
      }),
    });

    const instance = Model();
    expect(instance);
  });

  it('should have props, actions and views', () => {
    const Person = model('Person', {
      initial: () => ({
        firstname: 'Tom',
        lastname: 'Lennon',
      }),
      actions: (self) => ({
        setFirstName(first: string) {
          self.firstname = first;
        },
        setLastName(last: string) {
          self.lastname = last;
        },
      }),
      views: (state) => ({
        fullname: () => `${state.firstname} ${state.lastname}`,
      }),
    });

    const instance = Person({ firstname: 'John' });

    expect(instance).toMatchObject({
      firstname: 'John',
      lastname: 'Lennon',

      setFirstName: expect.any(Function),
      setLastName: expect.any(Function),

      fullname: 'John Lennon',
    });

    instance.setFirstName('Tom');
    instance.setLastName('Clancy');

    expect(instance.fullname).toBe('Tom Clancy');
  });

  it('should emit on change', () => {
    const Model = model('Model', {
      initial: () => ({
        test: 0,
      }),
      actions: (state) => ({
        increment: () => {
          state.test++;
        },
      }),
    });

    const instance = Model();

    const pSub = jest.fn();
    const aSub = jest.fn();

    instance.onPatch(pSub);
    instance.onAction(aSub);

    instance.increment();

    expect(pSub).toBeCalled();
    expect(aSub).toBeCalled();
  });

  it('should get events from nested objects', function () {
    const Model = model('Model', {
      initial: () => ({
        nested: {
          test: 0,
        },
      }),
      actions: (state) => ({
        increment: () => {
          state.nested.test++;
        },
      }),
    });

    const instance = Model();

    const sub = jest.fn();
    instance.onPatch(sub);
    instance.increment();
    expect(sub).toBeCalled();
  });

  it('should get events from nested models', function () {
    const Nested = model('Nested', {
      initial: () => ({
        test: 0,
      }),
      actions: (state) => ({
        increment: () => {
          state.test++;
        },
      }),
    });

    const Model = model('Model', {
      initial: () => ({
        nested: Nested(),
      }),
    });

    const instance = Model();

    const sub = jest.fn();
    instance.onPatch(sub);
    instance.nested.increment();
    expect(sub).toBeCalled();
  });

  it('should update on array methods', function () {
    const Model = model('Model', {
      initial: () => ({
        arr: [] as any[],
      }),
      actions: (self) => ({
        pushToArr(thing: any) {
          self.arr.push(thing);
        },
      }),
      views: (self) => ({
        firstElem: () => self.arr[0],
      }),
    });

    const instance = Model();

    const sub = jest.fn();
    instance.onPatch(sub);
    instance.pushToArr(2);
    expect(sub).toBeCalled();
    expect(instance.firstElem).toBe(2);
  });

  it('should handle dates', function () {
    const Model = model('Model', {
      initial: () => ({
        date: new Date(),
      }),
    });

    const instance = Model();
    instance.getSnapshot();
    instance.date.getDate();
  });

  it('should apply snapshots', function () {
    const Person = model('Person', {
      initial: () => ({
        firstname: 'John',
        lastname: 'Lennon',
      }),
      views: (state) => ({
        fullname: () => `${state.firstname} ${state.lastname}`,
      }),
    });

    const instance = Person();

    instance.applySnapshot({ firstname: 'Tom', lastname: 'Clancy' });

    expect(instance.fullname).toBe('Tom Clancy');
  });

  it('should get the root in nested models', () => {
    const Model2 = model('M1', {
      initial: () => ({}),
      actions: (self) => ({
        root(): string {
          const root = self.getRoot();
          if (typeof root.thing === 'string') {
            return root.thing;
          }
          return '';
        },
      }),
    });

    const Model1 = model('M1', {
      initial: () => ({
        nest: Model2(),
      }),
      actions: (self) => ({
        root() {
          const root = self.getRoot();
          return root.thing;
        },
      }),
    });

    const Model = model('M', {
      initial: () => ({
        nest: Model1(),
        thing: 'root',
      }),
    });

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
