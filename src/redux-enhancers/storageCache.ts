import _ from 'lodash'
import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import ShortcutId from '../@types/ShortcutId'
import State from '../@types/State'
import StorageCache from '../@types/StorageCache'
import ValueOf from '../@types/ValueOf'
import { tsidShared } from '../data-providers/yjs'
import { getStateSetting } from '../selectors/getSetting'
import getUserToolbar from '../selectors/getUserToolbar'
import keyValueBy from '../util/keyValueBy'
import storage from '../util/storage'

interface CacheController<T> {
  /** Decode storageCache values from stored strings. Used to generate the initial cache from localStorage. */
  decode: (s: string | null) => T
  /** Parses storage cache keys from state. */
  parse: (s: string | null) => T
  /** Selects cached values from state. Selectors should return a string that can be parsed by its respective parser, or undefined if the thought is not loaded. */
  select: (state: State) => string | null | undefined
}

// number of milliseconds to throtle storage setters
const STORAGE_WRITE_THROTTLE = 100

/** Builds the local storage key from a cache selector key. */
const buildKey = (key: string) => `storageCache/${key}`

const cacheControllers: { [key: string]: CacheController<ValueOf<StorageCache>> } = {
  theme: {
    decode: s => (s || 'Dark') as 'Dark' | 'Light',
    parse: s => (s || 'Dark') as 'Dark' | 'Light',
    select: state => getStateSetting(state, 'Theme'),
  },
  tutorialComplete: {
    decode: s => s === 'true',
    parse: s => s === 'Off',
    select: state => getStateSetting(state, 'Tutorial'),
  },
  tutorialStep: {
    decode: s => +(s || 1),
    parse: s => +(s || 1),
    select: state => getStateSetting(state, 'Tutorial Step'),
  },
  userToolbar: {
    decode: s => (s ? (s.split(',') as ShortcutId[]) : undefined),
    parse: s => (s ? (s.split(',') as ShortcutId[]) : undefined),
    select: state => getUserToolbar(state)?.join(','),
  },
}

// load the initial cache synchronously from local storage
// decode strings into proper types
const initialCache: State['storageCache'] = keyValueBy(cacheControllers, (key, controller) => ({
  // disable the tutorial if this is a shared thoughtspace
  [key]: (key === 'tutorialComplete' && tsidShared) || controller.decode(storage.getItem(buildKey(key))),
}))

// Each cache entry has its own throttled setter.
// This allows the last value of each to be persisted.
const throttledSetters = keyValueBy(cacheControllers, key => ({
  [key]: _.throttle(
    (value: ValueOf<StorageCache>) => {
      const storageKey = buildKey(key)
      if (value != null) {
        storage.setItem(storageKey, value.toString())
      } else {
        storage.removeItem(storageKey)
      }
    },
    STORAGE_WRITE_THROTTLE,
    { leading: false },
  ),
}))

/** Caches selectors in local storage and state.storageCache. */
const storageCacheStoreEnhancer: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> =>
    createStore((state: State | undefined = initialState, action: A): State => {
      const stateNew: State = reducer(state, action)

      // initialize storage cache
      if (!state) return { ...stateNew, storageCache: initialCache }

      // generate an object with all changed selector results that can be merged into state.storageCache
      const cacheUpdates = keyValueBy(cacheControllers, (key, controller) => {
        const value = controller.select(state)
        if (value == null) return null
        const valueParsed = controller.parse(value)
        return valueParsed !== state.storageCache?.[key as keyof State['storageCache']]
          ? {
              [key]: valueParsed,
            }
          : null
      })

      // update local storage
      Object.entries(cacheUpdates).forEach(([key, value]) => throttledSetters[key](value))

      // update state
      return Object.keys(cacheUpdates).length > 0
        ? { ...stateNew, storageCache: { ...state.storageCache, ...cacheUpdates } }
        : stateNew
    }, initialState)

export default storageCacheStoreEnhancer
