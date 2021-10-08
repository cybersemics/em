import { Firebase, Index } from '../../@types'
import _, { noop } from 'lodash'

// eslint-disable-next-line fp/no-let
let firebaseStore = {}

/** Returns a snapshot that returns the given value. */
const wrapSnapshot = <T>(val: T): Firebase.Snapshot<T> => ({
  key: 'WRAP_SNAPSHOT_KEY_MOCK',
  val: () => val,
})

/** Expose a function to clear the mock firebase store. */
global.clearMockFirebaseStore = () => {
  firebaseStore = {}
}

/** Mock ref that uses the mock firebase store. */
const ref = (path: string) => ({
  child: (key: string) => ref(`${path}/${key}`),
  once: (name: string, cb?: (snapshot: Firebase.Snapshot) => void) => {
    const result = wrapSnapshot(_.get(firebaseStore, path))
    return Promise.resolve(cb ? cb(result) : result) as Promise<Firebase.Snapshot<any>>
  },
  update: (updates: Index<any>, cb: (err: Error | null, ...args: any[]) => void) => {
    Object.entries(updates).forEach(([key, value]) => {
      _.set(firebaseStore, `${path}/${key}`, value)
    })
    cb(null)
  },
  on: noop,
})

/**
 * Mock getUserRef.
 */
export const getUserRef = () => ref('users/12345')
