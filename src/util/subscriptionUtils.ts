import { debounce, clone, setWith } from 'lodash'

import { store } from '../store'
import { getSessionId, getSessionType, SessionType } from './sessionManager'
import { updateThoughts } from '../action-creators'

import { Parent, Index, Lexeme } from '../types'

export interface Updates {
  thoughtIndexUpdates?: Index<Lexeme | null>,
  contextIndexUpdates?: Index<Parent | null>,
}

/** Filter self triggered updates. */
export const shouldIncludeUpdate = (thoughtOrContext: any, updateType: SessionType) => {
  return thoughtOrContext.updatedBy !== getSessionId() && getSessionType() === updateType
}

/** Get object merged with path updates. */
export const getUpdatedObject = <T extends Index>(original: T, pathUpdates: Index) => Object.keys(pathUpdates).reduce((acc, key) => {
  return setWith(clone(acc), key, pathUpdates[key], clone)
}, original)

/** Get local value of thought from state. */
export const getThoughtLocal = (id: string) => {
  const state = store.getState()
  return state.thoughts.thoughtIndex[id]
}

/** Get local value of context from state. */
export const getContextLocal = (id: string) => {
  const state = store.getState()
  return state.thoughts.contextIndex[id]
}

let mergeAndApplyUpdates: (updates: Updates) => void
/** Returns the function that merges updates from subscription handlers and applies them to state. */
export const getMergeAndApplyUpdates = () => {

  if (!mergeAndApplyUpdates) {
    /** Merge multiple thought and context index updates, batching them for the debounced state updates. */
    const mergeUpdates = (cb: (updates: Updates, resetMergee: () => void) => void) => {
      let mergee = {
        contextIndexUpdates: {},
        thoughtIndexUpdates: {}
      }

      /** Reset mergee after dispatch is complete. */
      const resetMergee = () => {
        mergee = {
          contextIndexUpdates: {},
          thoughtIndexUpdates: {}
        }
      }

      return (updates: Updates) => {
        mergee = {
          thoughtIndexUpdates: { ...mergee.thoughtIndexUpdates, ...updates.thoughtIndexUpdates || {} },
          contextIndexUpdates: { ...mergee.contextIndexUpdates, ...updates.contextIndexUpdates || {} }
        }
        cb(mergee, resetMergee)
      }
    }
    /** Filters and updates thoughtIndexUpdates and contextIndexUpdates. */
    const filterAndUpdateThoughts = ({ thoughtIndexUpdates = {}, contextIndexUpdates = {} }: Updates, reset: () => void) => {

      const { dispatch } = store

      if (Object.keys({ ...thoughtIndexUpdates, ...contextIndexUpdates }).length !== 0) {
        dispatch(updateThoughts({ thoughtIndexUpdates, contextIndexUpdates, local: false, remote: false }))
      }
      reset()
    }
    mergeAndApplyUpdates = mergeUpdates(debounce(filterAndUpdateThoughts, 2000))
  }

  return mergeAndApplyUpdates
}
