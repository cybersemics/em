import { HOME_TOKEN } from '../../constants'
import { getAllChildren } from '../../selectors/getChildren'
import alertStore from '../../stores/alert'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { importFilesActionCreator as importFiles } from '../importFiles'

beforeEach(initStore)

it('shows an alert and skips unsupported binary files', async () => {
  const fileTextMock = vi.fn(async () => 'binary-data')

  await store.dispatch(
    importFiles({
      files: [
        {
          lastModified: Date.now(),
          name: 'photo.jpeg',
          size: 12,
          text: fileTextMock,
        },
      ],
    }),
  )

  expect(fileTextMock).not.toHaveBeenCalled()
  expect(alertStore.getState()).toBe('Import canceled. Unsupported file type: .jpeg.')
  expect(getAllChildren(store.getState(), HOME_TOKEN)).toEqual([])
})

it('shows one alert listing all unsupported file types', async () => {
  await store.dispatch(
    importFiles({
      files: [
        {
          lastModified: Date.now(),
          name: 'photo.jpeg',
          size: 12,
          text: async () => 'binary-data',
        },
        {
          lastModified: Date.now(),
          name: 'video.mp4',
          size: 12,
          text: async () => 'binary-data',
        },
      ],
    }),
  )

  expect(alertStore.getState()).toBe('Import canceled. Unsupported file types: .jpeg, .mp4.')
  expect(getAllChildren(store.getState(), HOME_TOKEN)).toEqual([])
})
