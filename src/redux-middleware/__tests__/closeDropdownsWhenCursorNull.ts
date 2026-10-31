import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { toggleDropdownActionCreator as toggleDropdown } from '../../actions/toggleDropdown'
import { undoActionCreator as undo } from '../../actions/undo'
import { initialize } from '../../initialize'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'

beforeEach(initStore)

// https://github.com/cybersemics/em/pull/6159#issuecomment-6439306340
it('keeps the Undo Slider open when undo removes the cursor thought', async () => {
  await initialize({ storage: 'memory' })

  store.dispatch([newThought({ value: 'hello' }), toggleDropdown({ dropDownType: 'undoSlider' })])
  expect(store.getState().cursor).not.toBe(null)
  expect(store.getState().showUndoSlider).toBe(true)

  // undo the creation of the only thought, which leaves no cursor
  store.dispatch(undo())
  expect(store.getState().cursor).toBe(null)

  expect(store.getState().showUndoSlider).toBe(true)
})

it('closes the toolbar dropdowns when the cursor thought is removed', async () => {
  await initialize({ storage: 'memory' })

  store.dispatch([newThought({ value: 'hello' }), toggleDropdown({ dropDownType: 'colorPicker' })])
  expect(store.getState().showColorPicker).toBe(true)

  store.dispatch(undo())
  expect(store.getState().cursor).toBe(null)

  expect(store.getState().showColorPicker).toBe(false)
})
