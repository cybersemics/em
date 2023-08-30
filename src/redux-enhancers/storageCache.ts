import _ from 'lodash'
import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import State from '../@types/State'
import { tsidShared } from '../data-providers/yjs'
import { getStateSetting } from '../selectors/getSetting'
import getUserToolbar from '../selectors/getUserToolbar'
import keyValueBy from '../util/keyValueBy'
import storage from '../util/storage'

export type StorageCacheKey = keyof NonNullable<State['storageCache']>

type Selector = (state: State) => string | null | undefined

// number of milliseconds to throtle storage setters
const STORAGE_WRITE_THROTTLE = 100

/** Builds the local storage key from a cache selector key. */
const buildKey = (key: string) => `storageCache/${key}`

// functions to decode storageCache values from strings
// must return the same defaults as parsers
const decoders: Record<StorageCacheKey, (s: string | null) => any> = {
  theme: s => s || 'Dark',
  tutorialComplete: s => s === 'true',
  tutorialStep: s => +(s || 1),
  userToolbar: s => (s ? s.split(',') : undefined),
}

// functions to parse storage cache keys from state
// must return the same defaults as decoders
const parsers: Record<StorageCacheKey, (s: string | null) => any> = {
  theme: s => s || 'Dark',
  tutorialComplete: s => s === 'Off',
  tutorialStep: s => +(s || 1),
  userToolbar: s => (s ? s.split(',') : undefined),
}

// define the allowable cache keys and their selectors
// selectors should return a string that can be parsed by its respective parser, or undefined if the thought is not loaded
const selectors: Record<StorageCacheKey, Selector> = {
  theme: state => getStateSetting(state, 'Theme'),
  tutorialComplete: state => getStateSetting(state, 'Tutorial'),
  tutorialStep: state => getStateSetting(state, 'Tutorial Step'),
  userToolbar: state => getUserToolbar(state)?.join(','),
}

// load the initial cache synchronously from local storage
// decode strings into proper types
const initialCache: State['storageCache'] = keyValueBy(decoders, (key, decode) => ({
  // disable the tutorial if this is a shared thoughtspace
  [key]: (key === 'tutorialComplete' && tsidShared) || decode(storage.getItem(buildKey(key))),
}))

// Each cache entry has its own throttled setter.
// This allows the last value of each to be persisted.
const throttledSetters = keyValueBy(selectors, key => ({
  [key]: _.throttle(
    (value: string | number | boolean | null | undefined) => {
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
      const stateNew = reducer(state, action)

      // initialize storage cache
      if (!state) return { ...stateNew, storageCache: initialCache }

      // generate an object with all changed selector results that can be merged into state.storageCache
      const cacheUpdates = keyValueBy<any, any>(selectors, (key: StorageCacheKey, select: Selector) => {
        const value = select(state)
        if (value == null) return value
        const valueParsed = parsers[key as StorageCacheKey](value)
        return valueParsed !== state.storageCache?.[key as StorageCacheKey]
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
