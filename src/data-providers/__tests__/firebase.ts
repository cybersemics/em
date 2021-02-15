import getFirebaseProvider from '../firebase'
import dataProviderTest from '../../test-helpers/dataProviderTest'
import { store } from '../../store'

jest.useFakeTimers()

// mock getUserRef (firebase's database.ref)
jest.mock('../../util/getUserRef')
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      clearMockFirebaseStore: () => void,
    }
  }
}

afterEach(() => {
  global.clearMockFirebaseStore()
})

dataProviderTest(getFirebaseProvider(store.getState(), store.dispatch))
