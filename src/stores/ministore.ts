import Emitter from 'emitter20'
import cancellable, { CancellablePromise } from '../util/cancellable'

export interface Ministore<T> {
  /* Get the full state of the store. */
  getState: () => T
  /** Subscribes to changes. Returns an unsubscribe function. */
  subscribe: (f: (state: T) => void) => () => void
  /** Subscribes to one update. */
  once: (predicate?: (state: T) => boolean) => CancellablePromise<T>
  /** Subscribes to changes to a slice of the state. Returns an unsubscribe function. */
  subscribeSelector: <S>(
    selector: (state: T) => S,
    f: (slice: S) => void,
    equals?: (a: S, b: S) => boolean,
  ) => () => void
  /** Updates the state. If the state is an object, accepts a partial update. Accepts an updater function that passes the old state. */
  update: (updatesOrUpdater: Partial<T> | ((oldState: T) => Partial<T>)) => void
  /** Restores the state to the initial state that the store was created with. */
  reset: () => void
}

/** All ministores created by the factory, so that global state can be restored between tests. Derived stores are excluded, as they recompute from their sources. Ministores are module-level singletons, so the set does not grow at runtime. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stores = new Set<Ministore<any>>()

/** Resets all ministores to their initial state. Called by the initStore test helper so that module-level store state does not leak from one test to the next. */
export const resetStores = () => {
  stores.forEach(store => store.reset())
}

/** Removes a store from the reset registry. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unregister = (store: Ministore<any>) => {
  stores.delete(store)
}

/** Creates a mini store that tracks state and can update consumers. */
const ministore = <T>(initialState: T): Ministore<T> => {
  let state: T = initialState
  const emitter = new Emitter()

  /** Updates one or more values in state. */
  const update = (updatesOrUpdater: Partial<T> | ((state: T) => Partial<T>)) => {
    const updates = typeof updatesOrUpdater === 'function' ? updatesOrUpdater(state) : updatesOrUpdater

    // short circuit if value(s) are unchanged
    if (
      updates && typeof updates === 'object'
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Object.entries(updates).every(([key, value]) => value === (state as any)[key])
        : updates === state
    )
      return

    state = updates && typeof updates === 'object' ? { ...state, ...updates } : updates

    emitter.trigger('change', updates)
  }

  /**
   * Subscribe directly to the state.
   *
   * @returns Unsubscribe function.
   */
  const subscribe = (f: (state: T) => void): (() => void) => {
    emitter.on('change', f)
    return () => emitter.off('change', f)
  }

  /** Subscribe to a slice of the state. */
  const subscribeSelector = <S>(
    selector: (state: T) => S,
    f: (slice: S) => void,
    equals: (a: S, b: S) => boolean = (a, b) => a === b,
  ) => {
    let value = selector(state)
    return subscribe(() => {
      const valueOld = value
      value = selector(state)
      if (!equals(value, valueOld)) {
        f(value)
      }
    })
  }

  /**
   * Subscribes to a single update. Optionally takes a predicate that can be used to wait until a specific condition is met before resolving.
   */
  const once = (predicate?: (state: T) => boolean): CancellablePromise<T> => {
    let onChange: (stateNew: T) => void

    /** Unsubscribes from the emitter. */
    const unsubscribe = () => emitter.off('change', onChange)

    const promise = new Promise<T>(resolve => {
      onChange = (stateNew: T) => {
        if (predicate && !predicate(stateNew)) return
        unsubscribe()
        resolve(stateNew)
      }
      emitter.on('change', onChange)
    })

    return cancellable<T>(promise, unsubscribe)
  }

  /** Restores the initial state, notifying subscribers if it changed. */
  const reset = () => update(initialState)

  const store = {
    getState: () => state,
    once,
    reset,
    subscribe,
    subscribeSelector,
    update,
  }

  stores.add(store)

  return store
}

/** Create a read-only computed ministore that derives its state from one or more ministores. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function compose<T, S extends any[]>(
  compute: (...states: S) => T,
  // accept the same number of Ministores as states, with corresponding generic types, by using a mapped type generated from the states array
  stores: { [K in keyof S]: Ministore<S[K]> },
) {
  /** Gets the computed state from the stores. */
  const computeFromStores = () => compute(...(stores.map(store => store.getState()) as S))

  const store = ministore(computeFromStores())

  // A derived store is never written to directly, so exclude it from the reset registry. It recomputes when its sources are reset.
  unregister(store)

  /** Update the composite store with the computed state. */
  const updateCompositeState = () => {
    store.update(computeFromStores())
  }

  const unsubscribes = stores.map(store => store.subscribe(updateCompositeState))

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { update, reset, ...readonlyStore } = store

  return {
    ...readonlyStore,
    /** Destroys the composite store. */
    destroy: () => {
      unsubscribes.forEach(unsubscribe => unsubscribe())
    },
  }
}

ministore.compose = compose

export default ministore
