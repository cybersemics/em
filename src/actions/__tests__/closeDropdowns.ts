import State from '../../@types/State'
import closeDropdowns from '../../actions/closeDropdowns'
import newThought from '../../actions/newThought'
import toggleDropdown from '../../actions/toggleDropdown'
import addMulticursorAtFirstMatch from '../../test-helpers/addMulticursorAtFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

describe('closeDropdowns', () => {
  it('closes every dropdown and clears the multicursors', () => {
    const steps = [
      newThought('a'),
      addMulticursorAtFirstMatch(['a']),
      (state: State) => toggleDropdown(state, { dropDownType: 'commandCenter', value: true }),
      (state: State) => toggleDropdown(state, { dropDownType: 'colorPicker', value: true }),
      closeDropdowns,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.showColorPicker).toBe(false)
    expect(stateNew.showCommandCenter).toBe(false)
    expect(stateNew.multicursors).toEqual({})
  })

  it('keepCommandCenter closes the toolbar dropdowns but keeps the Command Center and the multicursors', () => {
    const steps = [
      newThought('a'),
      addMulticursorAtFirstMatch(['a']),
      (state: State) => toggleDropdown(state, { dropDownType: 'commandCenter', value: true }),
      (state: State) => toggleDropdown(state, { dropDownType: 'colorPicker', value: true }),
      (state: State) => closeDropdowns(state, { keepCommandCenter: true }),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.showColorPicker).toBe(false)
    expect(stateNew.showCommandCenter).toBe(true)
    expect(Object.keys(stateNew.multicursors)).toHaveLength(1)
  })

  it('keepUndoSlider keeps the Undo Slider open and closes the other dropdowns', () => {
    const steps = [
      newThought('a'),
      (state: State) => toggleDropdown(state, { dropDownType: 'commandCenter', value: true }),
      (state: State) => toggleDropdown(state, { dropDownType: 'undoSlider', value: true }),
      (state: State) => closeDropdowns(state, { keepUndoSlider: true }),
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.showUndoSlider).toBe(true)
    expect(stateNew.showCommandCenter).toBe(false)
  })
})
