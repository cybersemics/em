import { store } from '../../store'
import dataProviderTest from '../../test-helpers/dataProviderTest'
import getFirebaseProvider from '../firebase'

jest.useFakeTimers()

// mock getUserRef (firebase's database.ref)
jest.mock('../../util/getUserRef')
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      clearMockFirebaseStore: () => void
    }
  }
}

afterEach(() => {
  global.clearMockFirebaseStore()
})

dataProviderTest(getFirebaseProvider(store.getState(), store.dispatch))
