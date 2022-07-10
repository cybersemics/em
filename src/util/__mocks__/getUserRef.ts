import _, { noop } from 'lodash'
import * as Firebase from '../../@types/Firebase'
import Index from '../../@types/IndexType'

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
const ref = (refPath: string) => ({
  child: (key: string) => ref(`${refPath}/${key}`),
  once: (name: string, cb?: (snapshot: Firebase.Snapshot) => void) => {
    const result = wrapSnapshot(_.get(firebaseStore, refPath.split('/')))
    return Promise.resolve(cb ? cb(result) : result) as Promise<Firebase.Snapshot<any>>
  },
  update: (updates: Index<any>, cb: (err: Error | null, ...args: any[]) => void) => {
    Object.entries(updates).forEach(([key, value]) => {
      // split path on '/' since lodash get/set does not support the '/' delimiter (dot notation would also work)
      // join the key since it may also contain path segments
      const path = `${refPath}/${key}`.split('/')
      _.set(firebaseStore, path, value)
    })
    cb(null)
  },
  on: noop,
})

/**
 * Mock getUserRef.
 */
// NOTE: Mock user id must not start with a number, as lodash will try to create an array instead of an object
export const getUserRef = () => ref('users/abcde')
