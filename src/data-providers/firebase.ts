import { Dispatch } from 'react'
import { hashThought, keyValueBy, getUserRef } from '../util'
import { error } from '../action-creators'
import {
  Firebase,
  Index,
  Lexeme,
  Thought,
  State,
  ThoughtId,
  ThoughtIndices,
  ThoughtSubscriptionUpdates,
} from '../@types'

export enum FirebaseChangeTypes {
  Create = 'child_added',
  Update = 'child_changed',
  Delete = 'child_removed',
}

export interface FirebaseChangeHandlers {
  thoughtIndex?: {
    [FirebaseChangeTypes.Create]?: (updates: ThoughtSubscriptionUpdates) => void
    [FirebaseChangeTypes.Update]?: (updates: ThoughtSubscriptionUpdates) => void
    [FirebaseChangeTypes.Delete]?: (updates: ThoughtSubscriptionUpdates) => void
  }
  lexemeIndex?: {
    [FirebaseChangeTypes.Create]?: (updates: ThoughtSubscriptionUpdates) => void
    [FirebaseChangeTypes.Update]?: (updates: ThoughtSubscriptionUpdates) => void
    [FirebaseChangeTypes.Delete]?: (updates: ThoughtSubscriptionUpdates) => void
  }
}

// Firebase omits empty arrays, so account for that in the type.
type FirebaseLexeme = Omit<Lexeme, 'contexts'> & { contexts?: ThoughtId[] }
type FirebaseThought = Omit<Thought, 'children'> & { children?: ThoughtId[] }

/** Converts a FirebaseLexeme to a proper Lexeme by ensuring contexts is defined. Firebase can omit empty arrays. */
const lexemeFromFirebase = (firebaseLexeme: FirebaseLexeme | undefined): Lexeme | undefined =>
  firebaseLexeme?.contexts
    ? (firebaseLexeme as Lexeme)
    : firebaseLexeme
    ? { ...firebaseLexeme, contexts: [] }
    : undefined

/** Converts a FirebaseLexeme to a proper Lexeme by ensuring contexts is defined. Firebase can omit empty arrays. */
const thoughtFromFirebase = (firebaseThought: FirebaseThought | undefined): Thought | undefined =>
  firebaseThought?.children
    ? (firebaseThought as Thought)
    : firebaseThought
    ? { ...firebaseThought, children: [] }
    : undefined

/**
 * Get all firebase related functions as an object.
 */
const getFirebaseProvider = (state: State, dispatch: Dispatch<any>) => ({
  /** Deletes all data in the data provider. */
  clearAll: () => {
    throw new Error('NOT IMPLEMENTED')
  },

  /** Gets the Lexeme object by id. */
  async getLexemeById(id: string): Promise<Lexeme | undefined> {
    const userRef = getUserRef(state)
    const ref = userRef!.child('lexemeIndex').child<FirebaseLexeme>(id)
    return new Promise(resolve =>
      ref.once('value', (snapshot: Firebase.Snapshot<FirebaseLexeme>) => {
        const val = snapshot.val()
        resolve(lexemeFromFirebase(val))
      }),
    )
  },
  /** Gets multiple Lexeme objects by ids. */
  async getLexemesByIds(ids: string[]): Promise<(Lexeme | undefined)[]> {
    const userRef = getUserRef(state)
    const snapshots = await Promise.all(
      ids.map(id => userRef?.child('lexemeIndex').child<FirebaseLexeme>(id).once('value')),
    )
    return snapshots.map(snapshot => lexemeFromFirebase(snapshot?.val()))
  },

  /**
   * Gets a Thought by id.
   */
  async getThoughtById(id: string): Promise<Thought | undefined> {
    const userRef = getUserRef(state)
    const ref = userRef!.child('thoughtIndex').child<Thought>(id)
    return new Promise(resolve =>
      ref.once('value', (snapshot: Firebase.Snapshot<Thought>) => {
        resolve(thoughtFromFirebase(snapshot.val()))
      }),
    )
  },
  /** Gets multiple PrentEntry objects by ids. */
  getThoughtsByIds: async (ids: string[]): Promise<(Thought | undefined)[]> => {
    const userRef = getUserRef(state)
    const snapshots = await Promise.all(ids.map(id => userRef?.child('thoughtIndex').child<Thought>(id).once('value')))
    return snapshots.map(snapshot => thoughtFromFirebase(snapshot?.val()))
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
  /** Updates a context in the thoughtIndex. */
  async updateThought(id: string, parentEntry: Thought): Promise<unknown> {
    return this.update({
      ['thoughtIndex/' + id]: parentEntry,
    })
  },
  /** Updates a thought in the lexemeIndex. */
  async updateLexeme(id: string, lexeme: Lexeme): Promise<unknown> {
    return this.update({
      ['lexemeIndex/' + id]: lexeme,
    })
  },
  /** Updates the thoughtIndex. */
  async updateThoughtIndex(thoughtIndex: Index<Thought>): Promise<unknown> {
    return this.update(
      keyValueBy(Object.entries(thoughtIndex), ([key, value]) => ({
        ['thoughtIndex/' + key]: value,
      })),
    )
  },
  /** Updates the lexemeIndex. */
  async updateLexemeIndex(lexemeIndex: Index<Lexeme>): Promise<unknown> {
    return this.update(
      keyValueBy(Object.entries(lexemeIndex), ([key, value]) => ({
        ['lexemeIndex/' + key]: value,
      })),
    )
  },
})

/** Creates a subscription handler that converts a Parent snapshot to a ThoughtUpdate and invokes a callback.
 *
 * @param value The Parent value to set in the update. Defaults to the snapshot Parent. Useful for setting to null.
 */
const parentSubscriptionHandler =
  (onUpdate: (updates: ThoughtSubscriptionUpdates) => void, { value }: { value?: Thought | null } = {}) =>
  (snapshot: Firebase.Snapshot<Thought>) => {
    // only contains fields that have changed
    const parentPartial = snapshot.val()
    if (!parentPartial) return null
    const updates = {
      thoughtIndex: {
        [parentPartial.id]: {
          // snapshot contains updatedBy of deleted thought
          updatedBy: parentPartial.updatedBy,
          value:
            value !== undefined
              ? value
              : {
                  // pass id from snapshot since snapshot only contains changed fields
                  ...parentPartial,
                  id: snapshot.key as ThoughtId,
                },
        },
      },
      lexemeIndex: {},
    }
    onUpdate(updates)
  }

/** Creates a subscription handler that converts a Lexeme snapshot to a ThoughtUpdate and invokes a callback.
 *
 * @param value The Lexeme value to set in the update. Defaults to the snapshot Lexeme. Useful for setting to null.
 */
const lexemeSubscriptionHandler =
  (onUpdate: (updates: ThoughtSubscriptionUpdates) => void, { value }: { value?: Lexeme | null } = {}) =>
  (snapshot: Firebase.Snapshot<Lexeme>) => {
    const lexemePartial = snapshot.val()
    if (!lexemePartial) return null
    const updates = {
      thoughtIndex: {},
      lexemeIndex: {
        [hashThought(lexemePartial.value)]: {
          // snapshot contains updatedBy of deleted thought
          updatedBy: lexemePartial.updatedBy,
          value:
            value !== undefined
              ? value
              : {
                  // pass id from snapshot since snapshot only contains changed fields
                  id: snapshot.key,
                  ...lexemePartial,
                },
        },
      },
    }
    onUpdate(updates)
  }

/** Subscribe to firebase. */
export const subscribe = (userId: string, onUpdate: (updates: ThoughtSubscriptionUpdates) => void) => {
  const thoughtsRef: Firebase.Ref<ThoughtIndices> = window.firebase?.database().ref(`users/${userId}`)
  const thoughtIndexRef: Firebase.Ref<Thought> = thoughtsRef.child('thoughtIndex')
  const lexemeIndexRef: Firebase.Ref<Lexeme> = thoughtsRef.child('lexemeIndex')

  // thoughtIndex subscriptions
  thoughtIndexRef
    .orderByChild('lastUpdated')
    .startAt(new Date().toISOString())
    .on('child_added', parentSubscriptionHandler(onUpdate))
  thoughtIndexRef.on('child_changed', parentSubscriptionHandler(onUpdate))
  thoughtIndexRef.on('child_removed', parentSubscriptionHandler(onUpdate, { value: null }))

  // lexemeIndex subscriptions
  lexemeIndexRef
    .orderByChild('lastUpdated')
    .startAt(new Date().toISOString())
    .on('child_added', lexemeSubscriptionHandler(onUpdate))
  lexemeIndexRef.on('child_changed', lexemeSubscriptionHandler(onUpdate))
  lexemeIndexRef.on('child_removed', lexemeSubscriptionHandler(onUpdate, { value: null }))
}

export default getFirebaseProvider
