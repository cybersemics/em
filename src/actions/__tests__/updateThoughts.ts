import Timestamp from '../../@types/Timestamp'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import getThoughtById from '../../selectors/getThoughtById'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importText from '../importText'
import updateThoughts from '../updateThoughts'

it('materialization replaces a loaded thought with a newer one', () => {
  const state = reducerFlow([importText({ text: '- a' })])(initialState())
  const a = getThoughtById(state, contextToThoughtId(state, ['a'])!)!

  const stateNew = updateThoughts(state, {
    thoughtIndexUpdates: { [a.id]: { ...a, value: 'b', lastUpdated: (a.lastUpdated + 1) as Timestamp } },
    lexemeIndexUpdates: {},
    local: false,
    remote: false,
    repairCursor: true,
  })

  expect(getThoughtById(stateNew, a.id)?.value).toBe('b')
})
