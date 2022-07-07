import _ from 'lodash'
import { Dispatch } from 'react'
import DatabaseUpdates from '../@types/DatabaseUpdates'
import * as Firebase from '../@types/Firebase'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import LexemeDb, { fromLexemeDb, toLexemeDb } from '../@types/LexemeDb'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtIndices from '../@types/ThoughtIndices'
import ThoughtSubscriptionUpdates from '../@types/ThoughtSubscriptionUpdates'
import ThoughtWithChildren from '../@types/ThoughtWithChildren'
import error from '../action-creators/error'
import { createChildrenMapFromThoughts } from '../util/createChildrenMap'
import { getUserRef } from '../util/getUserRef'
import hashThought from '../util/hashThought'
import keyValueBy from '../util/keyValueBy'

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

// Firebase omits empty arrays and objects, so account for that in the type.
type FirebaseThought = Omit<ThoughtWithChildren, 'children'> & { children?: Index<Thought> }

/** Converts a FirebaseThought to a proper Thought by ensuring childrenMap is defined. Firebase omits empty objects. */
const thoughtFromFirebase = (firebaseThought?: FirebaseThought): Thought | undefined =>
  firebaseThought
    ? ({
        ..._.omit(firebaseThought, 'children'),
        childrenMap: createChildrenMapFromThoughts(Object.values(firebaseThought.children || {})),
      } as Thought)
    : undefined

/**
 * Get all firebase related functions as an object.
 */
const getFirebaseProvider = (state: State, dispatch: Dispatch<any>) => ({
  name: 'Firebase',

  /** Deletes all data in the data provider. */
  clearAll: () => {
    throw new Error('NOT IMPLEMENTED')
  },

  /** Gets the Lexeme object by id. */
  async getLexemeById(key: string): Promise<Lexeme | undefined> {
    const userRef = getUserRef(state)
    const ref = userRef!.child('lexemeIndex').child<LexemeDb>(key)
    return new Promise(resolve =>
      ref.once('value', (snapshot: Firebase.Snapshot<LexemeDb>) => {
        const val = snapshot.val()
        resolve(fromLexemeDb(val))
      }),
    )
  },
  /** Gets multiple Lexeme objects by keys. */
  async getLexemesByIds(keys: string[]): Promise<(Lexeme | undefined)[]> {
    const userRef = getUserRef(state)
    const snapshots = await Promise.all(
      keys.map(key => userRef?.child('lexemeIndex').child<LexemeDb>(key).once('value')),
    )
    return snapshots.map(snapshot => fromLexemeDb(snapshot?.val()))
  },

  /**
   * Gets a Thought by id. O(1).
   */
  async getThoughtById(id: string): Promise<Thought | undefined> {
    const userRef = getUserRef(state)
    const ref = userRef!.child('thoughtIndex').child<ThoughtWithChildren>(id)
    return new Promise(resolve =>
      ref.once('value', (snapshot: Firebase.Snapshot<ThoughtWithChildren>) => {
        resolve(thoughtFromFirebase(snapshot.val()))
      }),
    )
  },

  /**
   * Gets a Thought with its children. O(1).
   */
  async getThoughtWithChildren(id: string): Promise<{ thought: Thought; children: Index<Thought> } | undefined> {
    const userRef = getUserRef(state)
    const ref = userRef!.child('thoughtIndex').child<ThoughtWithChildren>(id)
    return new Promise(resolve =>
      ref.once('value', (snapshot: Firebase.Snapshot<ThoughtWithChildren | undefined>) => {
        const thoughtWithChildren = snapshot.val()
        const children = keyValueBy(thoughtWithChildren?.children || {}, (key, child) => ({
          // explicitly set childrenMap: {} because firebase does not store empty objects
          [key]: child.childrenMap ? child : { ...child, childrenMap: {} },
        }))
        resolve(
          thoughtWithChildren
            ? {
                thought: thoughtFromFirebase(thoughtWithChildren)!,
                children,
              }
            : undefined,
        )
      }),
    )
  },

  /** Gets multiple Thoughts by ids. O(n). */
  async getThoughtsByIds(ids: string[]): Promise<(Thought | undefined)[]> {
    const userRef = getUserRef(state)
    const snapshots = await Promise.all(ids.map(id => userRef?.child('thoughtIndex').child<Thought>(id).once('value')))
    return snapshots.map(snapshot => thoughtFromFirebase(snapshot?.val()))
  },

  /** Updates Firebase data. */
  async update(updates: DatabaseUpdates) {
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
  async updateThought(id: string, thoughtWithChildren: ThoughtWithChildren): Promise<unknown> {
    const hasPendingChildren = Object.values(thoughtWithChildren.children).some(child => child.pending)
    return this.update({
      ['thoughtIndex/' + id]: _.pick(thoughtWithChildren, [
        'id',
        'value',
        // do not save children if any are pending
        // pending thoughts should never be persisted
        // since this is an update rather than a set, the thought will retain any children it already has in the database
        // this can occur when editing an un-expanded thought whose children are still pending
        ...(hasPendingChildren ? [] : ['children']),
        'lastUpdated',
        'parentId',
        'rank',
        'updatedBy',
        'archived',
      ]),
    })
  },

  /** Updates a Lexeme in the lexemeIndex. */
  async updateLexeme(id: string, lexeme: Lexeme): Promise<unknown> {
    return this.update({
      ['lexemeIndex/' + id]: toLexemeDb(lexeme),
    })
  },

  /** Updates the thoughtIndex. */
  async updateThoughtIndex(thoughtIndex: Index<ThoughtWithChildren>): Promise<unknown> {
    return this.update(
      keyValueBy(Object.entries(thoughtIndex), ([id, thoughtWithChildren]) => ({
        // save only whitelisted properties since Typescript does not check for additional properties
        ['thoughtIndex/' + id]: _.pick(thoughtWithChildren, [
          'id',
          'value',
          'children',
          'archived',
          'lastUpdated',
          'parentId',
          'rank',
          'updatedBy',
        ]),
      })),
    )
  },

  /** Updates the lexemeIndex. */
  async updateLexemeIndex(lexemeIndex: Index<Lexeme>): Promise<unknown> {
    return this.update(
      keyValueBy(Object.entries(lexemeIndex), ([key, lexeme]) => ({
        ['lexemeIndex/' + key]: toLexemeDb(lexeme),
      })),
    )
  },
})

/** Creates a subscription handler that converts a Thought snapshot to a ThoughtUpdate and invokes a callback.
 *
 * @param value The Thought value to set in the update. Defaults to the snapshot Thought. Useful for setting to null.
 */
const thoughtSubscriptionHandler =
  (onUpdate: (updates: ThoughtSubscriptionUpdates) => void, { value }: { value?: Thought | null } = {}) =>
  (snapshot: Firebase.Snapshot<ThoughtWithChildren>) => {
    // only contains fields that have changed
    const thoughtPartial = snapshot.val()
    if (!thoughtPartial) return null
    const updates = {
      thoughtIndex: {
        [thoughtPartial.id]: {
          // snapshot contains updatedBy of deleted thought
          updatedBy: thoughtPartial.updatedBy,
          value:
            value !== undefined
              ? value
              : {
                  // pass id from snapshot since snapshot only contains changed fields
                  ..._.omit(thoughtPartial, ['children']),
                  childrenMap: createChildrenMapFromThoughts(Object.values(thoughtPartial)),
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
  const thoughtIndexRef: Firebase.Ref<ThoughtWithChildren> = thoughtsRef.child('thoughtIndex')
  const lexemeIndexRef: Firebase.Ref<Lexeme> = thoughtsRef.child('lexemeIndex')

  // child_added first triggers once for each existing item at the reference, which is extremely slow
  // Maybe limitToLast will work?
  // Disable subscriptions until an efficient solution is found.
  // https://stackoverflow.com/questions/43440908/firebase-child-added-for-new-items-only

  // thoughtIndex subscriptions
  thoughtIndexRef
    .orderByChild('lastUpdated')
    .startAt(new Date().toISOString())
    .on('child_added', thoughtSubscriptionHandler(onUpdate))
  thoughtIndexRef.on('child_changed', thoughtSubscriptionHandler(onUpdate))
  thoughtIndexRef.on('child_removed', thoughtSubscriptionHandler(onUpdate, { value: null }))

  // lexemeIndex subscriptions
  lexemeIndexRef
    .orderByChild('lastUpdated')
    .startAt(new Date().toISOString())
    .on('child_added', lexemeSubscriptionHandler(onUpdate))
  lexemeIndexRef.on('child_changed', lexemeSubscriptionHandler(onUpdate))
  lexemeIndexRef.on('child_removed', lexemeSubscriptionHandler(onUpdate, { value: null }))
}

export default getFirebaseProvider
