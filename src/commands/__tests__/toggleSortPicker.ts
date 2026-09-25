import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { setSortPreferenceActionCreator as setSortPreference } from '../../actions/setSortPreference'
import { executeCommand } from '../../commands'
import rootedParentOf from '../../selectors/rootedParentOf'
import simplifyPath from '../../selectors/simplifyPath'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import splitSentencesCommand from '../splitSentences'
import toggleSortPickerCommand from '../toggleSortPicker'

beforeEach(initStore)

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

    expect(toggleSortPickerCommand.error?.(store.getState())).toBeNull()
  })

  it('does not report an error when duplicate thoughts are created among other thoughts under alphabetical sort', () => {
    store.dispatch([
      importText({
        text: `
          - a
        `,
      }),
      setCursor(['a']),
    ])

    const state = store.getState()
    // Enable alphabetical ascending sort on the home context.
    store.dispatch(
      setSortPreference({
        simplePath: simplifyPath(state, rootedParentOf(state, state.cursor!)),
        sortPreference: { type: 'Alphabetical', direction: 'Asc' },
      }),
    )

    // Create a duplicate 'a', then 'c', then two 'b's. Duplicate values make the comparator-sorted children
    // non-monotonic in rank, which previously caused getSortedRank to insert a thought with a rank that inverted
    // the sort order and turned the Sort icon red (#4483 follow-up).
    store.dispatch([
      newThought({ value: 'a' }),
      newThought({ value: 'c' }),
      newThought({ value: 'b' }),
      newThought({ value: 'b' }),
    ])

    expect(toggleSortPickerCommand.error?.(store.getState())).toBeNull()
  })

  // https://github.com/cybersemics/em/issues/4084
  it('does not report an error when a thought is split into sentences under updated sort', () => {
    store.dispatch([
      importText({
        text: `
          - One. Two. Three.
        `,
      }),
      setCursor(['One. Two. Three.']),
    ])

    const state = store.getState()
    // Enable updated ascending sort on the home context.
    store.dispatch(
      setSortPreference({
        simplePath: simplifyPath(state, rootedParentOf(state, state.cursor!)),
        sortPreference: { type: 'Updated', direction: 'Asc' },
      }),
    )

    executeCommand(splitSentencesCommand, { store })

    expect(toggleSortPickerCommand.error?.(store.getState())).toBeNull()
  })

  it.each(['Asc', 'Desc'] as const)(
    'does not report an error after Split Sentences in a context sorted by Created %s',
    direction => {
      store.dispatch([
        importText({
          text: `
            - One. Two. Three. Four. Five. Six.
          `,
        }),
        setCursor(['One. Two. Three. Four. Five. Six.']),
      ])

      // Advance the clock between each step so that the thought, the sort preference, and the split thoughts all have
      // distinct created timestamps, as they do when a user sorts a context and splits a thought in it some time later.
      vi.advanceTimersByTime(1000)

      const state = store.getState()
      store.dispatch(
        setSortPreference({
          simplePath: simplifyPath(state, rootedParentOf(state, state.cursor!)),
          sortPreference: { type: 'Created', direction },
        }),
      )

      vi.advanceTimersByTime(1000)

      // Split Sentences creates every thought within the same millisecond, so they tie on the sort condition and are
      // ordered by rank. Allocating those ranks against the timestamp alone inverted them against the sort condition
      // and turned the Sort icon red (#4085).
      executeCommand(splitSentencesCommand, { store })

      expect(toggleSortPickerCommand.error?.(store.getState())).toBeNull()
    },
  )
})
