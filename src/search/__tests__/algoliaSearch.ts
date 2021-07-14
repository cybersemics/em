import { Lexeme } from '../../@types'
import { NOOP } from '../../constants'
import getFirebaseProvider from '../../data-providers/firebase'
import { createMockStore } from '../../test-helpers/createMockStore'
import { initialState } from '../../util'
import initAlgoliaSearch, { getRemoteSearch } from '../algoliaSearch'

jest.mock('../../util/getAlgoliaApiKey')

// mock algolia search client
jest.mock('algoliasearch', () => () => {
  return {
    initIndex: () => ({
      search: (value: string) =>
        Promise.resolve({
          hits: [
            {
              thoughtHash: value,
              value,
            },
          ],
        }),
    }),
  }
})

describe('remote search', () => {
  beforeEach(async () => {
    const mockStore = createMockStore()
    const store = mockStore(initialState())

    await initAlgoliaSearch(
      'userId',
      {
        applicationId: 'test_application_id',
        index: 'test_index',
      },
      store,
    )
  })

  it('return context map from the remote search hits', async () => {
    const firebaseProvider = getFirebaseProvider(initialState(), NOOP)
    firebaseProvider.getThoughtsByIds = jest.fn().mockReturnValue([
      {
        value: 'test',
        contexts: [
          {
            context: ['a', 'b', 'c'],
          },
          {
            context: ['k', 'm', 'n'],
          },
        ],
      },
    ] as Lexeme[])

    const contextMap = await getRemoteSearch(firebaseProvider).searchAndGenerateContextMap('test')
    expect(Object.values(contextMap)).toEqual(
      expect.arrayContaining([
        ['a', 'b', 'c'],
        ['k', 'm', 'n'],
      ]),
    )
  })
})
