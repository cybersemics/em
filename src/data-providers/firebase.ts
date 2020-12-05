import { store } from '../store'
import { Index, Lexeme, Parent, Snapshot } from '../types'
import { keyValueBy, getUserRef } from '../util'
import { error } from '../action-creators'

/** Deletes all data in the data provider. */
export const clearAll = () => {
  throw new Error('NOT IMPLEMENTED')
}

/** Gets the Lexeme object by id. */
export const getThoughtById = async (id: string): Promise<Lexeme | undefined> => {
  const userRef = getUserRef(store.getState())
  const ref = userRef!.child('thoughtIndex').child(id)
  return new Promise(resolve => ref.once('value', (snapshot: Snapshot<Lexeme>) => {
    resolve(snapshot.val())
  }))
}

/** Gets multiple Lexeme objects by ids. */
export const getThoughtsByIds = async (ids: string[]): Promise<(Lexeme | undefined)[]> => {
  const userRef = getUserRef(store.getState())
  const snapshots = await Promise.all(
    ids.map(id => userRef?.child('thoughtIndex').child(id).once('value'))
  )
  return snapshots.map(snapshot => snapshot?.val())
}

/**
 * Gets a context by id.
 *
 * @param context
 */
export const getContextById = async (id: string): Promise<Parent | undefined> => {
  const userRef = getUserRef(store.getState())
  const ref = userRef!.child('contextIndex').child(id)
  return new Promise(resolve => ref.once('value', (snapshot: Snapshot<Parent>) => {
    resolve(snapshot.val())
  }))
}

/** Gets multiple PrentEntry objects by ids. */
export const getContextsByIds = async (ids: string[]): Promise<(Parent | undefined)[]> => {
  const userRef = getUserRef(store.getState())
  const snapshots = await Promise.all(
    ids.map(id => userRef?.child('contextIndex').child(id).once('value'))
  )
  return snapshots.map(snapshot => snapshot?.val())
}

/** Updates Firebase data. */
export const update = async (updates: Index<any>) => {
  const userRef = getUserRef(store.getState())
  return new Promise((resolve, reject) => {
    userRef!.update(updates, (err: Error | null, ...args: any[]) => {
      if (err) {
        store.dispatch(error({ value: err.message }))
        console.error(err, updates)
        reject(err)
      }
      else {
        resolve(args)
      }
    })
  })
}

/** Updates a context in the contextIndex. */
export const updateContext = async (id: string, parentEntry: Parent): Promise<unknown> =>
  update({
    ['contextIndex/' + id]: parentEntry
  })

/** Updates a thought in the thoughtIndex. */
export const updateThought = async (id: string, thought: Lexeme): Promise<unknown> =>
  update({
    ['thoughtIndex/' + id]: thought
  })

/** Updates the contextIndex. */
export const updateContextIndex = async (contextIndex: Index<Parent>): Promise<unknown> =>
  update(keyValueBy(Object.entries(contextIndex), ([key, value]) => ({
    ['contextIndex/' + key]: value,
  })))

/** Updates the thoughtIndex. */
export const updateThoughtIndex = async (thoughtIndex: Index<Lexeme>): Promise<unknown> =>
  update(keyValueBy(Object.entries(thoughtIndex), ([key, value]) => ({
    ['thoughtIndex/' + key]: value,
  })))
