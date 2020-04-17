import { modelName } from './symbols.ts';

export default function connectReduxDevtools(model) {
  if (!window.__REDUX_DEVTOOLS_EXTENSION__) return;

  const devtools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
    name: model[modelName],
  });
  let applyingSnapshot = false;

  devtools.subscribe((msg) => {
    if (msg.type === 'DISPATCH') {
      handleMonitorActions(msg);
    }
  });

  const initialState = model.getSnapshot();
  devtools.init(initialState);

  model.onAction((action) => {
    if (applyingSnapshot) return;
    const copy = {};
    copy.type = action.name;
    if (action.args) action.args.forEach((v, i) => (copy[i] = v));
    devtools.send(copy, model.getSnapshot());
  }, true);

  function applySnapshot(model, state) {
    applyingSnapshot = true;
    model.applySnapshot(state);
    applyingSnapshot = false;
  }

  function handleMonitorActions(message) {
    switch (message.payload.type) {
      case 'RESET':
        applySnapshot(model, initialState);
        return devtools.init(initialState);
      case 'COMMIT':
        return devtools.init(model.getSnapshot());
      case 'ROLLBACK':
        return devtools.init(JSON.parse(message.state));
      case 'JUMP_TO_STATE':
      case 'JUMP_TO_ACTION':
        return applySnapshot(model, JSON.parse(message.state));
      case 'IMPORT_STATE':
        const nextLiftedState = message.payload.nextLiftedState;
        const computedStates = nextLiftedState.computedStates;
        applySnapshot(model, computedStates[computedStates.length - 1].state);
        devtools.send(null, nextLiftedState);
        return;
      default:
    }
  }
}
