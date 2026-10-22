import Command from '../../@types/Command'
import DropThoughtZone from '../../@types/DropThoughtZone'
import Path from '../../@types/Path'
import State from '../../@types/State'
import ThoughtId from '../../@types/ThoughtId'
import { HOME_TOKEN, LongPressState } from '../../constants'
import { expandHoverDownActionCreator as expandHoverDown } from '../expandHoverDown'
import { expandOnHoverTopActionCreator as expandHoverUp } from '../expandHoverUp'
import { showLatestCommandsActionCreator as showLatestCommands } from '../showLatestCommands'
import { suppressExpansionActionCreator as suppressExpansion } from '../suppressExpansion'

// Each pair below depends on its order: the first test arms an action's timer and ends without advancing the clock,
// and the second asserts at its start that nothing is pending. The fake clock is installed once for the whole file,
// so no test reinstalls it and discards what the last one left, and nothing flushes it; the only thing that can cancel
// the timer between the two is the reset that setupTests runs after every test.
// https://github.com/cybersemics/em/issues/5250

const path = ['a', 'b'] as ThoughtId[] as Path

/** A drag in progress over the thought at path, which is also the expanded top so that expandHoverUp arms to expand its parent. Holds only the fields that the four actions read before arming. */
const dragState = {
  alert: null,
  cursor: null,
  expandHoverUpPath: path,
  hoveringPath: path,
  hoverZone: DropThoughtZone.ThoughtDrop,
  latestCommands: [],
  longPress: LongPressState.DragInProgress,
  rootContext: [HOME_TOKEN],
} as unknown as State

/** Runs a thunk against dragState, running any thunk it dispatches and ignoring plain actions. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = (action: any): any => (typeof action === 'function' ? action(run, () => dragState) : undefined)

beforeAll(() => {
  vi.useFakeTimers()
})

afterAll(() => {
  vi.useRealTimers()
})

describe.each([
  ['expandHoverDown', () => run(expandHoverDown())],
  ['expandHoverUp', () => run(expandHoverUp())],
  ['showLatestCommands', () => run(showLatestCommands({ id: 'newThought' } as Command))],
  ['suppressExpansion', () => run(suppressExpansion())],
])('%s', (_, arm) => {
  it('arm a timer and end without advancing the clock', () => {
    arm()
    expect(vi.getTimerCount()).toBe(1)
  })

  it('start the next test with no timer pending', () => {
    expect(vi.getTimerCount()).toBe(0)
  })
})
