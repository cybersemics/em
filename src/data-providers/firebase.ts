import { Dispatch } from 'react'
import { hashContext, hashThought, keyValueBy, getUserRef } from '../util'
import { error } from '../action-creators'
import { Firebase, Index, Lexeme, Parent, State, ThoughtUpdates } from '../@types'

export enum FirebaseChangeTypes {
  Create = 'child_added',
  Update = 'child_changed',
  Delete = 'child_removed',
}

export interface FirebaseChangeHandlers {
  contextIndex?: {
    [FirebaseChangeTypes.Create]?: (updates: ThoughtUpdates) => void
    [FirebaseChangeTypes.Update]?: (updates: ThoughtUpdates) => void
    [FirebaseChangeTypes.Delete]?: (updates: ThoughtUpdates) => void
  }
  thoughtIndex?: {
    [FirebaseChangeTypes.Create]?: (updates: ThoughtUpdates) => void
    [FirebaseChangeTypes.Update]?: (updates: ThoughtUpdates) => void
    [FirebaseChangeTypes.Delete]?: (updates: ThoughtUpdates) => void
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
    const ref = userRef!.child('thoughtIndex').child<Lexeme>(id)
    return new Promise(resolve =>
      ref.once('value', (snapshot: Firebase.Snapshot<Lexeme>) => {
        resolve(snapshot.val())
      }),
    )
  },
  /** Gets multiple Lexeme objects by ids. */
  async getThoughtsByIds(ids: string[]): Promise<(Lexeme | undefined)[]> {
    const userRef = getUserRef(state)
    const snapshots = await Promise.all(ids.map(id => userRef?.child('thoughtIndex').child<Lexeme>(id).once('value')))
    return snapshots.map(snapshot => snapshot?.val())
  },

  /**
   * Gets a context by id.
   *
   * @param conte,xt
   */
  async getContextById(id: string): Promise<Parent | undefined> {
    const userRef = getUserRef(state)
    const ref = userRef!.child('contextIndex').child<Parent>(id)
    return new Promise(resolve =>
      ref.once('value', (snapshot: Firebase.Snapshot<Parent>) => {
        resolve(snapshot.val())
      }),
    )
  },
  /** Gets multiple PrentEntry objects by ids. */
  getContextsByIds: async (ids: string[]): Promise<(Parent | undefined)[]> => {
    const userRef = getUserRef(state)
    const snapshots = await Promise.all(ids.map(id => userRef?.child('contextIndex').child<Parent>(id).once('value')))
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
    [FirebaseChangeTypes.Create]: (parent: Parent) => ({
      contextIndex: parent ? { [hashContext(parent.context)]: parent } : {},
      thoughtIndex: {},
    }),
    [FirebaseChangeTypes.Update]: (parent: Parent) => ({
      contextIndex: parent ? { [hashContext(parent.context)]: parent } : {},
      thoughtIndex: {},
    }),
    [FirebaseChangeTypes.Delete]: (parent: Parent) => ({
      contextIndex: parent ? { [hashContext(parent.context)]: null } : {},
      thoughtIndex: {},
    }),
  },
  thoughtIndex: {
    [FirebaseChangeTypes.Create]: (lexeme: Lexeme) => ({
      contextIndex: {},
      thoughtIndex: lexeme ? { [hashThought(lexeme.value)]: lexeme } : {},
    }),
    [FirebaseChangeTypes.Update]: (lexeme: Lexeme) => ({
      contextIndex: {},
      thoughtIndex: lexeme ? { [hashThought(lexeme.value)]: lexeme } : {},
    }),
    [FirebaseChangeTypes.Delete]: (lexeme: Lexeme) => ({
      contextIndex: {},
      thoughtIndex: lexeme ? { [hashThought(lexeme.value)]: null } : {},
    }),
  },
}

/** Subscribe to firebase. */
export const subscribe = (userId: string, onUpdate: (updates: ThoughtUpdates) => void) => {
  const contextIndexListener: Firebase.Ref<Parent> = window.firebase?.database().ref(`users/${userId}/contextIndex`)
  const thoughtIndexListener: Firebase.Ref<Lexeme> = window.firebase?.database().ref(`users/${userId}/thoughtIndex`)

  const { contextIndex: contextIndexChangeHandlers, thoughtIndex: thoughtIndexChangeHandlers } = changeHandlers

  Object.keys(contextIndexChangeHandlers).forEach(key => {
    const changeType = key as keyof typeof contextIndexChangeHandlers
    contextIndexListener.on(key, snapshot => {
      const updates = contextIndexChangeHandlers[changeType](snapshot.val())
      onUpdate(updates)
    })
  })

  Object.keys(thoughtIndexChangeHandlers).forEach(key => {
    const changeType = key as keyof typeof thoughtIndexChangeHandlers
    thoughtIndexListener.on(key, snapshot => {
      const updates = thoughtIndexChangeHandlers[changeType](snapshot.val())
      onUpdate(updates)
    })
  })
}

export default getFirebaseProvider
