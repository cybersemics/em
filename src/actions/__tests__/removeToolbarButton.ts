import Path from '../../@types/Path'
import { EM_TOKEN } from '../../constants'
import findDescendant from '../../selectors/findDescendant'
import { getChildrenRanked } from '../../selectors/getChildren'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { importTextActionCreator as importText } from '../importText'
import { removeToolbarButtonActionCreator as removeToolbarButton } from '../removeToolbarButton'

beforeEach(initStore)

/** Returns the command ids on the user toolbar, in rank order. */
const toolbarCommandIds = () => {
  const state = store.getState()
  return getChildrenRanked(state, findDescendant(state, EM_TOKEN, ['Settings', 'Toolbar'])).map(child => child.value)
}

it('remove a command from the middle of the user toolbar', () => {
  const settingsId = findDescendant(store.getState(), EM_TOKEN, ['Settings'])!
  store.dispatch(
    importText({
      path: [EM_TOKEN, settingsId] as Path,
      text: `
        - Toolbar
          - undo
          - redo
          - indent
      `,
      preventSetCursor: true,
    }),
  )
  expect(toolbarCommandIds()).toEqual(['undo', 'redo', 'indent'])

  store.dispatch(removeToolbarButton('redo'))

  expect(toolbarCommandIds()).toEqual(['undo', 'indent'])
})

it('remove the first command on the user toolbar', () => {
  const settingsId = findDescendant(store.getState(), EM_TOKEN, ['Settings'])!
  store.dispatch(
    importText({
      path: [EM_TOKEN, settingsId] as Path,
      text: `
        - Toolbar
          - undo
          - redo
          - indent
      `,
      preventSetCursor: true,
    }),
  )
  expect(toolbarCommandIds()).toEqual(['undo', 'redo', 'indent'])

  store.dispatch(removeToolbarButton('undo'))

  expect(toolbarCommandIds()).toEqual(['redo', 'indent'])
})

it('leave the user toolbar unchanged when the command is not on it', () => {
  const settingsId = findDescendant(store.getState(), EM_TOKEN, ['Settings'])!
  store.dispatch(
    importText({
      path: [EM_TOKEN, settingsId] as Path,
      text: `
        - Toolbar
          - undo
          - redo
          - indent
      `,
      preventSetCursor: true,
    }),
  )
  expect(toolbarCommandIds()).toEqual(['undo', 'redo', 'indent'])

  store.dispatch(removeToolbarButton('bold'))

  expect(toolbarCommandIds()).toEqual(['undo', 'redo', 'indent'])
})
