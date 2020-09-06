import * as firebase from '../firebase'
import dataProviderTest from '../../test-helpers/dataProviderTest'
import { Snapshot } from '../../types'
import { GenericObject } from '../../utilTypes'

jest.useFakeTimers()

// mock firebase object store
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      clearMockFirebaseStore: () => void,
    }
  }
}

// mock user authentication
jest.mock('../../store', () => {

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _ = require('lodash')

  // eslint-disable-next-line fp/no-let
  let firebaseStore = {}

  /** Returns a snapshot that returns the given value. */
  const wrapSnapshot = (val: any): Snapshot => ({
    val: () => val
  })

  /** Expose a function to clear the mock firebase store. */
  global.clearMockFirebaseStore = () => {
    firebaseStore = {}
  }

  /** Mock ref that uses the mock firebase store. */
  const ref = path => ({
    child: (key: string) => ref(`${path}/${key}`),
    once: (name: string, cb: (snapshot: Snapshot) => void) => {
      const result = wrapSnapshot(_.get(firebaseStore, path))
      if (cb) {
        cb(result)
      }
      else {
        return Promise.resolve(result)
      }
    },
    update: (updates: GenericObject<any>, cb: (err: Error | null, ...args: any[]) => void) => {
      Object.entries(updates).forEach(([key, value]) => {
        _.set(firebaseStore, `${path}/${key}`, value)
      })
      cb(null)
    }
  })

  return {
    store: {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      dispatch: () => {},
      getState: () => ({
        userRef: ref('users/12345')
      })
    }
  }
})

afterEach(() => {
  global.clearMockFirebaseStore()
})

dataProviderTest(firebase)
