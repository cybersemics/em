import _ from 'lodash'
import moize from 'moize'
import Context from '../@types/Context'
import State from '../@types/State'
import { EM_TOKEN } from '../constants'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getAllChildren } from '../selectors/getChildren'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import { resolveArray } from '../util/memoizeResolvers'
import storage from '../util/storage'
import getThoughtById from './getThoughtById'

const LOCAL_KEY = 'EM_THOUGHTS'

/** Initializes cache of local storage on startup. */
const localStorageCache = JSON.parse(storage.getItem(LOCAL_KEY) || '{}')

/** Save cache to local storage (debounced). */
const saveCache = _.debounce(() => {
  storage.setItem(LOCAL_KEY, JSON.stringify(localStorageCache))
}, 100)

/** Returns the first subthought (or value if unary) of /em/...context, not including meta thoughts. If the thought is not in state, checks local storage (cached once). Use setDescendant to set. */
const getEmThought = (state: State, context: Context | string): string | undefined => {
  context = ([] as string[]).concat(context)

  const id = contextToThoughtId(state, [EM_TOKEN, ...context])
  const key = 'EM/' + context.join('/')
  const cached = localStorageCache[key]

  // if the settings does not exist in state, check the cache
  if (!id) return cached

  // if thought has children, return the first non-meta child
  // otherwise return the settings key (unary)
  const valueId = getAllChildren(state, id).find(childId => {
    const child = getThoughtById(state, childId)
    return child && !isAttribute(child.value)
  })

  const value = valueId ? getThoughtById(state, valueId).value : head(context)

  // cache to local storage
  if (!cached) {
    localStorageCache[key] = true
    saveCache()
  }

  return value
}

/** Memoize getEmThought by thoughtIndex and context. */
const getEmThoughtMemoized = moize(getEmThought, {
  maxSize: 1000,
  profileName: 'getEmThought',
  transformArgs: ([state, context]) => [
    state.thoughts.thoughtIndex,
    typeof context === 'string' ? context : resolveArray(context),
  ],
})

export default getEmThoughtMemoized
