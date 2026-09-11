import { importText } from '../../actions'
import { HOME_TOKEN } from '../../constants'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import exportContext from '../../selectors/exportContext'
import thoughtToPath from '../../selectors/thoughtToPath'
import contextToThought from '../../test-helpers/contextToThought'
import newThoughtAtFirstMatch from '../../test-helpers/newThoughtAtFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import deleteThought from '../deleteThought'

// https://github.com/cybersemics/em/issues/5531
it.skip('new subthought under a pending parent keeps its deallocated sibling in the childrenMap', () => {
  const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

  const state = importText(initialState(), {
    text: `
      - a
        - b
        - c
    `,
  })
  const b = contextToThought(state, ['a', 'b'])!

  const stateNew = reducerFlow([
    // deallocate b from memory without deleting it, as freeThoughts does
    // a is marked pending so that the pull queue restores b when it becomes visible again
    deleteThought({ pathParent: thoughtToPath(state, b.parentId), thoughtId: b.id, local: false, remote: false }),
    newThoughtAtFirstMatch({ at: ['a'], insertNewSubthought: true, value: 'd' }),
  ])(state)

  // restore before asserting so a failure cannot leave console.warn mocked for the rest of the file
  const warnings = [...consoleWarn.mock.calls]
  consoleWarn.mockRestore()

  // b is deallocated, so only the thoughts in memory are exported
  expect(exportContext(stateNew, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
    - c
    - d`)

  // b must still be referenced by a even though it is not in the thoughtIndex, otherwise nothing restores it until reload
  const a = contextToThought(stateNew, ['a'])!
  const cId = contextToThoughtId(stateNew, ['a', 'c'])!
  const dId = contextToThoughtId(stateNew, ['a', 'd'])!
  expect(a.childrenMap).toEqual({ [b.id]: b.id, [cId]: cId, [dId]: dId })

  // a stays pending until b is pulled back into memory
  expect(a.pending).toBe(true)

  expect(warnings).toEqual([])
})
