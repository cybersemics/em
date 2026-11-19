import Thought from '../../@types/Thought'
import Timestamp from '../../@types/Timestamp'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import getThoughtById from '../../selectors/getThoughtById'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
import updateThoughts from '../updateThoughts'

/** Imports a loaded thought a and returns the state with a newer copy of a whose value is b. */
const setup = () => {
  const state = reducerFlow([importText({ text: '- a' })])(initialState())
  const a = getThoughtById(state, contextToThoughtId(state, ['a'])!)!
  const newer: Thought = { ...a, value: 'b', lastUpdated: (a.lastUpdated + 1) as Timestamp }
  return { state, newer }
}

describe('a non-local update of a loaded thought', () => {
  it('is dropped when it comes from a pull, even if it is newer', () => {
    const { state, newer } = setup()

    const stateNew = updateThoughts(state, {
      thoughtIndexUpdates: { [newer.id]: newer },
      lexemeIndexUpdates: {},
      local: false,
      remote: false,
    })

    expect(getThoughtById(stateNew, newer.id)?.value).toBe('a')
  })

  it('is applied when it comes from materialization and is newer', () => {
    const { state, newer } = setup()

    const stateNew = updateThoughts(state, {
      thoughtIndexUpdates: { [newer.id]: newer },
      lexemeIndexUpdates: {},
      local: false,
      remote: false,
      repairCursor: true,
    })

    expect(getThoughtById(stateNew, newer.id)?.value).toBe('b')
  })
})
