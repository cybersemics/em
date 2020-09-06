import { EM_TOKEN, ROOT_TOKEN } from '../../constants'
import * as firebase from '../firebase'
import dataProviderTest from '../../test-helpers/dataProviderTest'
import _ from 'lodash'
import { hashContext, hashThought, never, timestamp } from '../../util'
import { Snapshot } from '../../types'
import { GenericObject } from '../../utilTypes'

jest.useFakeTimers()

// mock firebase object store
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      firebaseStore: GenericObject<any>,
    }
  }
}
global.firebaseStore = {}

// mock user authentication
jest.mock('../../store', () => {

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _ = require('lodash')

  return {
    store: {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      dispatch: () => {},
      getState: () => ({
        user: {
          uid: 12345
        },
        // mock userRef with update function that sets arbitrary data on the mock firebase store
        userRef: {
          update: (updates: GenericObject<any>, cb: (err: Error | null, ...args: any[]) => void) => {
            Object.entries(updates).forEach(([key, value]) => {
              _.set(global.firebaseStore, 'users/12345/' + key, value)
            })
            cb(null)
          }
        }
      })
    }
  }
})

/** Returns a snapshot that returns the given value. */
const wrapSnapshot = (val: any): Snapshot => ({
  val: () => val
})

// mock window.firebase
window.firebase = {
  database: () => ({
    ref: (path: string) => ({

      children: (keys: string[]) => {
        return {
          once: (name: string, cb: (snapshot: Snapshot) => void) => {
            cb(wrapSnapshot(keys.map(key => _.get(global.firebaseStore, `${path}/${key}`))))
          }
        }
      },

      once: (name: string, cb: (snapshot: Snapshot) => void) => {
        cb(wrapSnapshot(_.get(global.firebaseStore, path)))
      }

    })
  })
}

afterEach(() => {
  global.firebaseStore = {}
})

dataProviderTest(firebase)
