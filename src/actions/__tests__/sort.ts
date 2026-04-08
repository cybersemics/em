import importText from '../../actions/importText'
import sort from '../../actions/sort'
import updateThoughts from '../../actions/updateThoughts'
import { HOME_TOKEN } from '../../constants'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import exportContext from '../../selectors/exportContext'
import contextToThought from '../../test-helpers/contextToThought'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

describe('sort', () => {
  it('no-op when context is already in sorted order', () => {
    const text = `
      - =sort
        - Alphabetical
      - a
      - b
      - c
    `
    const state = reducerFlow([importText({ text })])(initialState())

    // Apply sort to the home context
    const stateAfterSort = sort(state, HOME_TOKEN)

    // State reference should be the same (true no-op)
    expect(stateAfterSort).toBe(state)
  })

  it('no-op when context is already in sorted order but has non-zero ranks (e.g. 5, 6, 7)', () => {
    const text = `
      - =sort
        - Alphabetical
      - a
      - b
      - c
    `
    const state1 = reducerFlow([importText({ text })])(initialState())

    // Manually update ranks to 5, 6, 7 (non-contiguous, non-zero)
    const aId = contextToThoughtId(state1, ['a'])!
    const bId = contextToThoughtId(state1, ['b'])!
    const cId = contextToThoughtId(state1, ['c'])!
    const a1 = contextToThought(state1, ['a'])!
    const b1 = contextToThought(state1, ['b'])!
    const c1 = contextToThought(state1, ['c'])!

    const stateWithGappedRanks = updateThoughts(state1, {
      thoughtIndexUpdates: {
        [aId]: { ...a1, rank: 5 },
        [bId]: { ...b1, rank: 6 },
        [cId]: { ...c1, rank: 7 },
      },
      lexemeIndexUpdates: {},
      preventExpandThoughts: true,
    })

    // Verify ranks are 5, 6, 7
    expect(contextToThought(stateWithGappedRanks, ['a'])!.rank).toBe(5)
    expect(contextToThought(stateWithGappedRanks, ['b'])!.rank).toBe(6)
    expect(contextToThought(stateWithGappedRanks, ['c'])!.rank).toBe(7)

    // Apply sort — should be a no-op since the order is already correct
    const stateAfterSort = sort(stateWithGappedRanks, HOME_TOKEN)

    // State reference should be the same (true no-op)
    expect(stateAfterSort).toBe(stateWithGappedRanks)

    // Ranks should remain 5, 6, 7 (not normalized to 0, 1, 2)
    expect(contextToThought(stateAfterSort, ['a'])!.rank).toBe(5)
    expect(contextToThought(stateAfterSort, ['b'])!.rank).toBe(6)
    expect(contextToThought(stateAfterSort, ['c'])!.rank).toBe(7)
  })

  it('only updates thoughts whose ranks change when sorting is needed', () => {
    // Import in order a, c, b so that after alphabetical sort, b and c must swap.
    // After importText, ranks will be 0=a, 1=c, 2=b.
    const text = `
      - =sort
        - Alphabetical
      - a
      - c
      - b
    `
    const state = reducerFlow([importText({ text })])(initialState())

    const a1 = contextToThought(state, ['a'])!
    const b1 = contextToThought(state, ['b'])!
    const c1 = contextToThought(state, ['c'])!

    // Sanity-check the initial ranks assigned by importText
    expect(a1.rank).toBeLessThan(c1.rank)
    expect(c1.rank).toBeLessThan(b1.rank)

    const stateAfterSort = sort(state, HOME_TOKEN)
    const exported = exportContext(stateAfterSort, HOME_TOKEN, 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
  - a
  - b
  - c`)

    const a2 = contextToThought(stateAfterSort, ['a'])!
    const b2 = contextToThought(stateAfterSort, ['b'])!
    const c2 = contextToThought(stateAfterSort, ['c'])!

    // a was already at normalized rank 0 and its position did not change, so its rank should be unchanged
    expect(a2.rank).toBe(a1.rank)

    // b moved from rank 2 to rank 1 — rank changes
    expect(b2.rank).not.toBe(b1.rank)

    // c moved from rank 1 to rank 2 — rank changes
    expect(c2.rank).not.toBe(c1.rank)
  })
})
