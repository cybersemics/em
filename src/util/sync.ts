import { ICreateChange, IDeleteChange, IUpdateChange, IDatabaseChange } from 'dexie-observable/api'
import { db } from '../data-providers/dexie'
import { merge as mergeDeep, debounce, set } from 'lodash'

import { store } from '../store'
import { UpdateThoughtsOptions } from '../reducers/updateThoughts'
import { getSessionId } from './sessionManager'
import { updateThoughts } from '../action-creators'

import { State } from './initialState'
import { Parent, Index, Lexeme } from '../types'

const databaseChangeTypes = {
  created: 1,
  updated: 2,
  deleted: 3,
}

const tables = {
  thoughtIndex: 'thoughtIndex',
  contextIndex: 'contextIndex'
}

/** Get object merged with path updates. */
const getUpdatedObject = <T extends Index>(original: T, pathUpdates:T) => Object.keys(pathUpdates).reduce((acc, key) => {
  return set(acc, key, pathUpdates[key])
}, original)

/** Get thought merged with updates. */
const getThoughtUpdates = (state: State, id: string, updates: Index) => {
  const thought = state.thoughts.thoughtIndex[id]
  return thought ? { [id]: getUpdatedObject(thought, updates as Lexeme) } : {}
}
/** Get context merged with updates. */
const getContextUpdates = (state: State, id: string, updates: Index) => {
  const context = state.thoughts.contextIndex[id]
  return context ? { [id]: getUpdatedObject(context, updates as Parent) } : {}
}

const dexieChangeHandlers = {
  [databaseChangeTypes.created]: (change: IDatabaseChange, getState: () => State) => {
    const { table, key, obj } = change as ICreateChange
    return {
      thoughtIndexUpdates: table === tables.thoughtIndex ? { [key as string]: obj as Lexeme } : {},
      contextIndexUpdates: table === tables.contextIndex ? { [key as string]: obj as Parent } : {}
    }
  },
  [databaseChangeTypes.updated]: (change: IDatabaseChange, getState: () => State) => {
    const { key, table, mods: updates } = change as IUpdateChange
    const updated = {
      thoughtIndexUpdates: table === tables.thoughtIndex ? getThoughtUpdates(getState(), key, updates) : {},
      contextIndexUpdates: table === tables.contextIndex ? getContextUpdates(getState(), key, updates) : {}
    }
    return updated
  },
  [databaseChangeTypes.deleted]: (change: IDatabaseChange, getState: () => State) => {
    const { key, table, oldObj } = change as IDeleteChange
    return {
      thoughtIndexUpdates: table === tables.thoughtIndex && oldObj && oldObj.id && getState().thoughts.thoughtIndex[key] ? { [key as string]: null } : {},
      contextIndexUpdates: table === tables.contextIndex && oldObj && oldObj.id && getState().thoughts.contextIndex[key] ? { [key as string]: null } : {}
    }
  }
}

let listenersInitialized: boolean
/** Initializes Dexie's change subscriptions. */
const initDexieListeners = (getState: () => State, update: (updates: UpdateThoughtsOptions) => void) => {
  if (listenersInitialized) return
  db.on('changes', changes => {
    changes.forEach(change => {

      const updates = dexieChangeHandlers[change.type](change, getState)

      update(updates)
    })
  })
  listenersInitialized = true

}

/** Filter thought and contextindex updates, keeping the ones originating from other sessions, while discarding the self-triggered updates. */
const filterUpdates = ({ thoughtIndexUpdates, contextIndexUpdates }: UpdateThoughtsOptions) => {

  const sessionId = getSessionId()
  const filteredThoughtUpdates = Object.keys(thoughtIndexUpdates).reduce((acc, key) => {
    return { ...acc, ...thoughtIndexUpdates[key]?.updatedBy !== sessionId ? { [key]: thoughtIndexUpdates[key] } : {} }
  }, {})
  const filteredContextUpdates = Object.keys(contextIndexUpdates).reduce((acc, key) => {
    return { ...acc, ...contextIndexUpdates[key]?.updatedBy !== sessionId ? { [key]: contextIndexUpdates[key] } : {} }
  }, {})
  if (Object.keys({ ...filteredContextUpdates, ...filteredThoughtUpdates }).length === 0) return null
  return { thoughtIndexUpdates: filteredThoughtUpdates, contextIndexUpdates: filteredContextUpdates }
}

/** Setup dexie subscriptions to handle local sync. */
export const setupDexieSubscriptions = () => {

  const { getState, dispatch } = store
  /** Merge multiple thought and context index updates, batching them for the debounced state updates. */
  const mergeUpdates = (cb: (updates: UpdateThoughtsOptions) => void) => {
    let mergee = {
      contextIndexUpdates: {},
      thoughtIndexUpdates: {}
    }

    return (updates: UpdateThoughtsOptions) => {
      mergee = mergeDeep(mergee, updates)
      cb(mergee)
    }
  }
  /** Filters and updates thoughtIndexUpdates and contextIndexUpdates. */
  const filterAndUpdateThoughts = (updates: UpdateThoughtsOptions) => {

    const filteredUpdates = filterUpdates(updates)
    if (filteredUpdates) {

      dispatch(updateThoughts({ ...filteredUpdates, local: false }))
    }
  }

  initDexieListeners(getState, mergeUpdates(debounce(filterAndUpdateThoughts, 2000)))
}
