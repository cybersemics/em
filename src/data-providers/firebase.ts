import { Dispatch } from 'react'
import { Store } from 'redux'
import { hashContext, hashThought, keyValueBy, getUserRef } from '../util'
import { error } from '../action-creators'
import { State } from '../util/initialState'
import { shouldIncludeUpdate, updateThoughtsFromSubscription } from '../util/subscriptionUtils'
import { SessionType } from '../util/sessionManager'
import { Index, Lexeme, Parent, Ref, Snapshot } from '../types'

enum FirebaseChangeTypes {
  Create = 'child_added',
  Update = 'child_changed',
  Delete = 'child_removed',
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

const changeHandlers = {
  contextIndex: {
    [FirebaseChangeTypes.Create]: (state: State, parent: Parent) => ({
      contextIndexUpdates:
        parent && shouldIncludeUpdate(state, parent, SessionType.REMOTE)
          ? { [hashContext(parent.context)]: parent }
          : {},
    }),
    [FirebaseChangeTypes.Update]: (state: State, parent: Parent) => ({
      contextIndexUpdates:
        parent && shouldIncludeUpdate(state, parent, SessionType.REMOTE)
          ? { [hashContext(parent.context)]: parent }
          : {},
    }),
    [FirebaseChangeTypes.Delete]: (state: State, parent: Parent) => ({
      contextIndexUpdates:
        parent && shouldIncludeUpdate(state, parent, SessionType.REMOTE) ? { [hashContext(parent.context)]: null } : {},
    }),
  },
  thoughtIndex: {
    [FirebaseChangeTypes.Create]: (state: State, lexeme: Lexeme) => ({
      thoughtIndexUpdates:
        lexeme && shouldIncludeUpdate(state, lexeme, SessionType.REMOTE) ? { [hashThought(lexeme.value)]: lexeme } : {},
    }),
    [FirebaseChangeTypes.Update]: (state: State, lexeme: Lexeme) => ({
      thoughtIndexUpdates:
        lexeme && shouldIncludeUpdate(state, lexeme, SessionType.REMOTE) ? { [hashThought(lexeme.value)]: lexeme } : {},
    }),
    [FirebaseChangeTypes.Delete]: (state: State, lexeme: Lexeme) => ({
      thoughtIndexUpdates:
        lexeme && shouldIncludeUpdate(state, lexeme, SessionType.REMOTE) ? { [hashThought(lexeme.value)]: null } : {},
    }),
  },
}

/** Subscribe to firebase. */
export const subscribe = (userId: string, store: Store<State, any>) => {
  const contextIndexListener: Ref<Parent> = window.firebase?.database().ref(`users/${userId}/contextIndex`)
  const thoughtIndexListener: Ref<Lexeme> = window.firebase?.database().ref(`users/${userId}/thoughtIndex`)

  const { contextIndex: contextIndexChangeHandlers, thoughtIndex: thoughtIndexChangeHandlers } = changeHandlers

  Object.keys(contextIndexChangeHandlers).forEach(key => {
    const changeType = key as keyof typeof contextIndexChangeHandlers
    contextIndexListener.on(key, snapshot => {
      const state = store.getState()
      const updates = contextIndexChangeHandlers[changeType](state, snapshot.val())
      updateThoughtsFromSubscription(updates)
    })
  })

  Object.keys(thoughtIndexChangeHandlers).forEach(key => {
    const changeType = key as keyof typeof thoughtIndexChangeHandlers
    thoughtIndexListener.on(key, snapshot => {
      const state = store.getState()
      const updates = thoughtIndexChangeHandlers[changeType](state, snapshot.val())
      updateThoughtsFromSubscription(updates)
    })
  })
}

export default getFirebaseProvider
