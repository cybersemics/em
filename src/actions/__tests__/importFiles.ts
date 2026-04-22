import { HOME_TOKEN } from '../../constants'
import { getAllChildren } from '../../selectors/getChildren'
import alertStore from '../../stores/alert'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { importFilesActionCreator as importFiles } from '../importFiles'

beforeEach(initStore)

it('shows an alert and skips unsupported binary files', async () => {
  const text = vi.fn(async () => 'binary-data')

  await store.dispatch(
    importFiles({
      files: [
        {
          lastModified: Date.now(),
          name: 'photo.jpeg',
          size: 12,
          text,
        },
      ],
    }),
  )

  expect(text).not.toHaveBeenCalled()
  expect(alertStore.getState()).toBe('Unsupported file type for import: .jpeg.')
  expect(getAllChildren(store.getState(), HOME_TOKEN)).toEqual([])
})
