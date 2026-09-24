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
  /** Releases any resource the state holds, then restores the state to the initial state that the store was created with. See MinistoreOptions.dispose. */
  reset: () => void
}

export interface MinistoreOptions<T> {
  /**
   * Releases the resources held in the state — a pending timer, a listener registration, a running animation — before
   * reset restores the initial state. A reset restores a value; it cannot know that a field is a setTimeout handle whose
   * timer is still pending, so a store that holds one declares here how to release it. Runs on every reset, including
   * when the state already equals the initial state, so it must tolerate the initial state (typically a null handle).
   * Stores that hold only values omit it.
   */
  dispose?: (state: T) => void
}

/** All ministores created by the factory, so that global state can be restored between tests. Derived stores are excluded, as they recompute from their sources. Ministores are module-level singletons, so the set does not grow at runtime. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stores = new Set<Ministore<any>>()

/** Resets registered by modules whose state is not a store but must be restored along with the stores. See registerReset. */
const resets = new Set<() => void>()

/**
 * Registers a function for resetStores to run. For module state that a store cannot hold because restoring it is an
 * action rather than a value: debugLog has to cancel an animation-frame loop, and its clean slate is an empty buffer
 * rather than its construction value, which is whatever localStorage held at import.
 *
 * Registering from the module itself, rather than having a test setup file import the module, matters: a setup
 * file's imports are cached before a test file's vi.mock calls apply, so importing a module with app dependencies
 * there would defeat every test that mocks one of them. This module has none.
 */
export const registerReset = (reset: () => void) => {
  resets.add(reset)
}

/** Resets all ministores to their initial state, after running every registered reset so that a self-rescheduling loop is stopped first. Called at test boundaries — by initStore and createTestApp at setup, by cleanupTestApp before it drains timers, and after every test by setupTests — so that module-level state does not leak from one test to the next. */
export const resetStores = () => {
  resets.forEach(reset => reset())
  stores.forEach(store => store.reset())
}

/** Removes a store from the reset registry. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unregister = (store: Ministore<any>) => {
  stores.delete(store)
}

/** Creates a mini store that tracks state and can update consumers. */
const ministore = <T>(initialState: T, { dispose }: MinistoreOptions<T> = {}): Ministore<T> => {
  let state: T = initialState
  const emitter = new Emitter()

  /** Updates one or more values in state. */
  const update = (updatesOrUpdater: Partial<T> | ((state: T) => Partial<T>)) => {
    const updates = typeof updatesOrUpdater === 'function' ? updatesOrUpdater(state) : updatesOrUpdater

    // short circuit if value(s) are unchanged; a null state can transition to an object
    if (
      updates && typeof updates === 'object'
        ? state !== null &&
          typeof state === 'object' &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  /** Releases whatever the current state holds, then restores the initial state, notifying subscribers if it changed. Disposal comes first so that no subscriber observes a state whose resource is still live, and runs unconditionally: the short circuit in update compares values, and an unchanged handle says nothing about whether its timer is still pending. */
  const reset = () => {
    dispose?.(state)
    update(initialState)
  }

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
