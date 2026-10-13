import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { closeDropdownsActionCreator as closeDropdowns } from '../closeDropdowns'
import { importTextActionCreator as importText } from '../importText'
import { toggleDropdownActionCreator as toggleDropdown } from '../toggleDropdown'

beforeEach(initStore)

it('moves the same picker to another surface in one activation, then toggles that target closed', async () => {
  await dispatch(toggleDropdown({ dropDownType: 'colorPicker' }))
  expect(store.getState().activeDropdown).toEqual({ surface: 'toolbar', picker: 'colorPicker' })

  await dispatch(toggleDropdown({ dropDownType: 'colorPicker', surface: 'formattingBar' }))
  expect(store.getState().activeDropdown).toEqual({ surface: 'formattingBar', picker: 'colorPicker' })

  await dispatch(toggleDropdown({ dropDownType: 'colorPicker', surface: 'formattingBar' }))
  expect(store.getState().activeDropdown).toBeNull()
})

it('replaces an open picker instead of opening another alongside it', async () => {
  await dispatch(toggleDropdown({ dropDownType: 'bulletPicker' }))
  await dispatch(toggleDropdown({ dropDownType: 'undoSlider' }))

  expect(store.getState().activeDropdown).toEqual({ surface: 'toolbar', picker: 'undoSlider' })
})

it('ignores a close from the previous surface or picker after another target replaces it', async () => {
  await dispatch(toggleDropdown({ dropDownType: 'colorPicker' }))
  await dispatch(toggleDropdown({ dropDownType: 'colorPicker', surface: 'formattingBar' }))
  await dispatch(toggleDropdown({ dropDownType: 'colorPicker', value: false }))
  expect(store.getState().activeDropdown).toEqual({ surface: 'formattingBar', picker: 'colorPicker' })

  await dispatch(toggleDropdown({ dropDownType: 'sortPicker' }))
  await dispatch(toggleDropdown({ dropDownType: 'colorPicker', surface: 'formattingBar', value: false }))
  expect(store.getState().activeDropdown).toEqual({ surface: 'toolbar', picker: 'sortPicker' })

  await dispatch(toggleDropdown({ dropDownType: 'sortPicker', value: false }))
  expect(store.getState().activeDropdown).toBeNull()
})

it('keeps the Command Center open while replacing dropdowns and preserves the dropdown when closing it', async () => {
  await dispatch(toggleDropdown({ dropDownType: 'commandCenter', value: true }))
  await dispatch(toggleDropdown({ dropDownType: 'colorPicker', surface: 'formattingBar' }))
  await dispatch(toggleDropdown({ dropDownType: 'sortPicker' }))
  expect(store.getState().showCommandCenter).toBe(true)

  await dispatch(toggleDropdown({ dropDownType: 'commandCenter', value: false }))
  expect(store.getState().showCommandCenter).toBe(false)
  expect(store.getState().activeDropdown).toEqual({ surface: 'toolbar', picker: 'sortPicker' })
})

it('preserves a multiselection when opening the Command Center and clears it when closing', async () => {
  await dispatch([importText({ text: '- a\n- b' }), setCursor(['a']), addMulticursor(['b'])])
  const selected = store.getState().multicursors
  expect(Object.keys(selected).length).toBeGreaterThan(0)

  await dispatch(toggleDropdown({ dropDownType: 'commandCenter', value: true }))
  expect(store.getState().multicursors).toEqual(selected)

  await dispatch(toggleDropdown({ dropDownType: 'commandCenter', value: false }))
  expect(store.getState().multicursors).toEqual({})
})

it('closes both presentation states and clears multiselection without changing thought data', async () => {
  await dispatch([importText({ text: '- a\n- b' }), setCursor(['a']), addMulticursor(['b'])])
  const thoughts = store.getState().thoughts
  await dispatch(toggleDropdown({ dropDownType: 'commandCenter', value: true }))
  await dispatch(toggleDropdown({ dropDownType: 'letterCase', surface: 'formattingBar' }))
  expect(Object.keys(store.getState().multicursors).length).toBeGreaterThan(0)

  await dispatch(closeDropdowns())

  expect(store.getState().activeDropdown).toBeNull()
  expect(store.getState().showCommandCenter).toBe(false)
  expect(store.getState().multicursors).toEqual({})
  expect(store.getState().thoughts).toBe(thoughts)
})
