import { Index, Lexeme, Parent, Ref, Snapshot } from '../types'
import { keyValueBy, getUserRef } from '../util'
import { error } from '../action-creators'
import { State } from '../util/initialState'
import { Updates } from '../util/subscriptionUtils'
import { Dispatch } from 'react'

export enum firebaseChangeTypes {
  create = 'child_added',
  update = 'child_changed',
  delete = 'child_removed',
}

interface FirebaseChangeHandlers {
  contextIndex: {
    [firebaseChangeTypes.create]: (change: Parent) => Updates
    [firebaseChangeTypes.update]: (change: Parent) => Updates
    [firebaseChangeTypes.delete]: (change: Parent) => Updates
  }
  thoughtIndex: {
    [firebaseChangeTypes.create]: (change: Lexeme) => Updates
    [firebaseChangeTypes.update]: (change: Lexeme) => Updates
    [firebaseChangeTypes.delete]: (change: Lexeme) => Updates
  }
}

/**
 * Get all firebase related functions as an object.
 */
const getFirebaseProvider = (state: State, dispatch: Dispatch<any>) => ({
  /** Deletes all data in the data provider. */
  clearAll: () => {
    throw new Error('NOT IMPLEMENTED')
  },

  /** Gets the Lexeme object by id. */
  async getThoughtById(id: string): Promise<Lexeme | undefined> {
    const userRef = getUserRef(state)
    const ref = userRef!.child('thoughtIndex').child(id)
    return new Promise(resolve =>
      ref.once('value', (snapshot: Snapshot<Lexeme>) => {
        resolve(snapshot.val())
      }),
    )
  },
  /** Gets multiple Lexeme objects by ids. */
  async getThoughtsByIds(ids: string[]): Promise<(Lexeme | undefined)[]> {
    const userRef = getUserRef(state)
    const snapshots = await Promise.all(ids.map(id => userRef?.child('thoughtIndex').child(id).once('value')))
    return snapshots.map(snapshot => snapshot?.val())
  },

  /**
   * Gets a context by id.
   *
   * @param conte,xt
   */
  async getContextById(id: string): Promise<Parent | undefined> {
    const userRef = getUserRef(state)
    const ref = userRef!.child('contextIndex').child(id)
    return new Promise(resolve =>
      ref.once('value', (snapshot: Snapshot<Parent>) => {
        resolve(snapshot.val())
      }),
    )
  },
  /** Gets multiple PrentEntry objects by ids. */
  getContextsByIds: async (ids: string[]): Promise<(Parent | undefined)[]> => {
    const userRef = getUserRef(state)
    const snapshots = await Promise.all(ids.map(id => userRef?.child('contextIndex').child(id).once('value')))
    return snapshots.map(snapshot => snapshot?.val())
  },
  /** Updates Firebase data. */
  async update(updates: Index<any>) {
    const userRef = getUserRef(state)
    return new Promise((resolve, reject) => {
      userRef!.update(updates, (err: Error | null, ...args: any[]) => {
        if (err) {
          dispatch(error({ value: err.message }))
          console.error(err, updates)
          reject(err)
        } else {
          resolve(args)
        }
      })
    })
  },
  /** Updates a context in the contextIndex. */
  async updateContext(id: string, parentEntry: Parent): Promise<unknown> {
    return this.update({
      ['contextIndex/' + id]: parentEntry,
    })
  },
  /** Updates a thought in the thoughtIndex. */
  async updateThought(id: string, lexeme: Lexeme): Promise<unknown> {
    return this.update({
      ['thoughtIndex/' + id]: lexeme,
    })
  },
  /** Updates the contextIndex. */
  async updateContextIndex(contextIndex: Index<Parent>): Promise<unknown> {
    return this.update(
      keyValueBy(Object.entries(contextIndex), ([key, value]) => ({
        ['contextIndex/' + key]: value,
      })),
    )
  },
  /** Updates the thoughtIndex. */
  async updateThoughtIndex(thoughtIndex: Index<Lexeme>): Promise<unknown> {
    return this.update(
      keyValueBy(Object.entries(thoughtIndex), ([key, value]) => ({
        ['thoughtIndex/' + key]: value,
      })),
    )
  },
})

/** Subscribe to firebase. */
export const subscribe = (
  userId: string,
  callback: (updates: Updates) => void,
  firebaseChangeHandlers: FirebaseChangeHandlers,
) => {
  const contextIndexListener: Ref<Parent> = window.firebase?.database().ref(`users/${userId}/contextIndex`)
  const thoughtIndexListener: Ref<Lexeme> = window.firebase?.database().ref(`users/${userId}/thoughtIndex`)

  const { contextIndex: contextIndexChangeHandlers, thoughtIndex: thoughtIndexChangeHandlers } = firebaseChangeHandlers

  Object.keys(contextIndexChangeHandlers).forEach(key => {
    const changeType = key as firebaseChangeTypes
    contextIndexListener.on(changeType, snapshot => {
      const updates = contextIndexChangeHandlers[changeType](snapshot.val())
      callback(updates)
    })
  })

  Object.keys(thoughtIndexChangeHandlers).forEach(key => {
    const changeType = key as firebaseChangeTypes
    thoughtIndexListener.on(changeType, snapshot => {
      const updates = thoughtIndexChangeHandlers[changeType](snapshot.val())
      callback(updates)
    })
  })
}

export default getFirebaseProvider
