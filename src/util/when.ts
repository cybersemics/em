/** Creates a promise that resolves when the condition is met on the emitter event. Resolves to an array of event arguments. */
const when = <T>(
  emitter: {
    on: (eventName: string, f: (...eventArgs: T[]) => void) => void
    off: (eventName: string, f: (...eventArgs: T[]) => void) => void
  },
  eventName: string,
  predicate?: (...eventArgs: T[]) => boolean,
) =>
  new Promise<T[]>(resolve => {
    /** Resolves the promise when the condition is met. */
    const handler = (...eventArgs: T[]) => {
      if (!predicate || predicate(...eventArgs)) {
        resolve(eventArgs)
        emitter.off(eventName, handler)
      }
    }
    emitter.on(eventName, handler)
  })

export default when
