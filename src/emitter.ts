export type EventHandler = (event?: any) => void;

// A map of event types and their corresponding event handlers.
type EventHandlerMap = {
  [type: string]: EventHandler[];
};

export interface Emitter {
  on(type: string, handler: EventHandler): void;
  off(type: string, handler: EventHandler): void;
  emit(type: string, evt: any): void;
}

export function emitter(): Emitter {
  const all: EventHandlerMap = {};
  return {
    /**
     * Register an event handler for the given type.
     *
     * @param  {String} type	Type of event to listen for, or `"*"` for all events
     * @param  {Function} handler Function to call in response to given event
     * @memberOf emitter
     */
    on(type: string, handler: EventHandler) {
      (all[type] || (all[type] = [])).push(handler);
    },

    /**
     * Remove an event handler for the given type.
     *
     * @param  {String} type	Type of event to unregister `handler` from, or `"*"`
     * @param  {Function} handler Handler function to remove
     * @memberOf emitter
     */
    off(type: string, handler: EventHandler) {
      if (all[type]) {
        all[type].splice(all[type].indexOf(handler) >>> 0, 1);
      }
    },

    /**
     * Invoke all handlers for the given type.
     * If present, `"*"` handlers are invoked after type-matched handlers.
     *
     * @param {String} type  The event type to invoke
     * @param {Any} [evt]  Any value (object is recommended and powerful), passed to each handler
     * @memberOf emitter
     */
    emit(type: string, evt: any) {
      (all[type] || []).slice().map((handler) => {
        handler(evt);
      });
    },
  };
}
