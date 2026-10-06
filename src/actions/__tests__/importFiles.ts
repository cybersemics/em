import * as idb from 'idb-keyval'
import { HOME_PATH, HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import head from '../../util/head'
import removeHome from '../../util/removeHome'
import { clearActionCreator as clear } from '../clear'
import { importFilesActionCreator as importFiles } from '../importFiles'
import { importTextActionCreator as importText } from '../importText'
import { pullActionCreator as pull } from '../pull'

beforeEach(initStore)

// https://github.com/cybersemics/em/issues/2712
// A resumed import starts from what a previous session left behind: the resume manifest in localStorage, the raw text
// in IndexedDB, and the thoughts it already imported, which a reloaded page has not loaded yet. Their remaining
// descendants must still be imported into them, not skipped or imported elsewhere.
it('resumes an interrupted import into thoughts that are not loaded yet', async () => {
  vi.useFakeTimers()
  const { cleanup } = await initialize({ storage: 'memory' })

  const text = `
- a
  - b
    - c
      - d
- e`

  // the thoughts imported by the interrupted session: a, b, and c
  store.dispatch(
    importText({
      text: `
        - a
          - b
            - c
      `,
    }),
  )
  await waitForThoughtspaceIdle()

  // what the interrupted session persisted for resume
  localStorage.setItem(
    'resume-imports',
    JSON.stringify({
      resumeTest: {
        id: 'resumeTest',
        lastModified: 0,
        thoughtsImported: 3,
        name: 'from clipboard',
        path: HOME_PATH,
        size: text.length,
      },
    }),
  )
  // fake-indexeddb completes requests with setImmediate, which fake timers would never run
  vi.useRealTimers()
  await idb.set('resume-imports-resumeTest', text)
  vi.useFakeTimers()

  // reload from storage one level deep, so that a/b is pending, as after a page refresh
  store.dispatch(clear())
  await store.dispatch(pull([HOME_TOKEN], { maxDepth: 1 }))
  expect(getThoughtById(store.getState(), head(contextToPath(store.getState(), ['a', 'b'])!))?.pending).toBe(true)

  // the same call initialize makes on startup
  store.dispatch(importFiles({ resume: true }))
  await vi.runOnlyPendingTimersAsync()

  // load everything so the export shows the whole outline
  await store.dispatch(pull([HOME_TOKEN], { maxDepth: Infinity }))
  const exported = exportContext(store.getState(), HOME_PATH, 'text/plain')

  cleanup()

  expect(removeHome(exported)).toBe(`
- a
  - b
    - c
      - d
- e
`)
  expect(localStorage.getItem('resume-imports')).toBe('{}')
})

// https://github.com/cybersemics/em/issues/2712
// A resumed import finds the parent of the next thought by walking the values of its ancestors down from the
// destination. Now that duplicates are not merged, the interrupted session may have imported a thought with the same
// value as an existing sibling, and the remaining descendants belong under the imported thought, not the existing one.
// Skipped because descendantPath resolves each value to the first matching child, so b is imported into the existing a.
// The fix belongs to moving resume reconstruction out of importFiles. See https://github.com/cybersemics/em/issues/5174.
it.skip('resumes an interrupted import into an imported thought that duplicates an existing sibling', async () => {
  vi.useFakeTimers()
  const { cleanup } = await initialize({ storage: 'memory' })

  const text = `
- a
  - b
- c`

  // the existing a with its child x, followed by the a imported by the interrupted session
  store.dispatch(
    importText({
      text: `
        - a
          - x
        - a
      `,
    }),
  )
  await waitForThoughtspaceIdle()

  // what the interrupted session persisted for resume
  localStorage.setItem(
    'resume-imports',
    JSON.stringify({
      resumeTest: {
        id: 'resumeTest',
        lastModified: 0,
        thoughtsImported: 1,
        name: 'from clipboard',
        path: HOME_PATH,
        size: text.length,
      },
    }),
  )
  // fake-indexeddb completes requests with setImmediate, which fake timers would never run
  vi.useRealTimers()
  await idb.set('resume-imports-resumeTest', text)
  vi.useFakeTimers()

  // the same call initialize makes on startup
  store.dispatch(importFiles({ resume: true }))
  await vi.runOnlyPendingTimersAsync()

  const exported = exportContext(store.getState(), HOME_PATH, 'text/plain')

  cleanup()

  expect(removeHome(exported)).toBe(`
- a
  - x
- a
  - b
- c
`)
})
