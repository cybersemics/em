import State from '../../@types/State'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { setSortPreferenceActionCreator as setSortPreference } from '../../actions/setSortPreference'
import rootedParentOf from '../../selectors/rootedParentOf'
import simplifyPath from '../../selectors/simplifyPath'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import toggleSortPickerCommand from '../toggleSortPicker'

beforeEach(initStore)

/** Returns the error string reported by the Sort Picker command for the current state. */
const sortPickerError = (state: State) => toggleSortPickerCommand.error?.(state)

describe('toggleSortPicker error', () => {
  it('does not report an error when a duplicate thought is created under alphabetical sort', () => {
    store.dispatch([
      importText({
        text: `
          - One
        `,
      }),
      setCursor(['One']),
    ])

    const state = store.getState()
    // Enable alphabetical ascending sort on the home context.
    store.dispatch(
      setSortPreference({
        simplePath: simplifyPath(state, rootedParentOf(state, state.cursor!)),
        sortPreference: { type: 'Alphabetical', direction: 'Asc' },
      }),
    )

    // Create a duplicate thought with the same value.
    store.dispatch(newThought({ value: 'One' }))

    expect(sortPickerError(store.getState())).toBeNull()
  })
})
