import store from '../../stores/app'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import { clearActionCreator as clear } from '../clear'
import { toggleDropdownActionCreator as toggleDropdown } from '../toggleDropdown'

beforeEach(initStore)

it('closes an open toolbar dropdown', async () => {
  await dispatch(toggleDropdown({ dropDownType: 'undoSlider' }))
  expect(store.getState().showUndoSlider).toBe(true)

  await dispatch(clear({ full: true }))

  expect(store.getState().showUndoSlider).toBe(false)
})
