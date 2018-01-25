import model from '../src';

describe('model()', function () {
  it('should create a model', () => {
    expect(model({ initial: {} }));
  });

  it('should instantiate', () => {
    const Model = model({ initial: {} });
    const instance = Model();

    expect(instance).toMatchObject({
      getSnapshot: expect.any(Function),
      applySnapshot: expect.any(Function),
      subscribe: expect.any(Function),
      unsubscribe: expect.any(Function),
    });
  });

  it('should have props, actions and views', () => {
    const Person = model({
      initial: () => ({
        firstname: 'Tom',
        lastname: 'Lennon',
      }),
      actions: state => ({
        setFirstName (first) {
          state.firstname = first;
        },
        setLastName (last) {
          state.lastname = last;
        },
      }),
      views: state => ({
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
    const Model = model({
      initial: {
        test: 0,
      },
      actions: state => ({
        increment: () => {
          state.test++;
        },
      }),
    });

    const instance = Model();

    const pSub = jest.fn();
    const aSub = jest.fn();

    instance.subscribe('patch', pSub);
    instance.subscribe('action', aSub);

    instance.increment();

    expect(pSub).toBeCalled();
    expect(aSub).toBeCalled();
  });

  it('should get events from nested objects', function () {
    const Model = model({
      initial: {
        nested: {
          test: 0,
        },
      },
      actions: state => ({
        increment: () => {
          state.nested.test++;
        },
      }),
    });

    const instance = Model();

    const sub = jest.fn();
    instance.subscribe('patch', sub);
    instance.increment();
    expect(sub).toBeCalled();
  });

  it('should get events from nested models', function () {
    const Nested = model({
      initial: {
        test: 0,
      },
      actions: state => ({
        increment: () => {
          state.test++;
        },
      }),
    });

    const Model = model({
      initial: () => ({
        nested: Nested(),
      }),
    });

    const instance = Model();

    const sub = jest.fn();
    instance.subscribe('patch', sub);
    instance.nested.increment();
    expect(sub).toBeCalled();
  });

  it('should apply snapshots', function () {
    const Person = model({
      initial: {
        firstname: 'John',
        lastname: 'Lennon',
      },
      views: state => ({
        fullname: () => `${state.firstname} ${state.lastname}`,
      })
    });

    const instance = Person();

    instance.applySnapshot({ firstname: 'Tom', lastname: 'Clancy' });

    expect(instance.fullname).toBe('Tom Clancy');
  });
});
