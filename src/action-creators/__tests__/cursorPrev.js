import { RANKED_ROOT } from '../../constants'

// action-creators
import {
  cursorPrev,
  importText,
} from '../../action-creators'

import { createTestStore } from '../../test-helpers/createTestStore'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'

describe('normal view', () => {

  it('move cursor to previous sibling', () => {

    const store = createTestStore()

    store.dispatch(importText(RANKED_ROOT, `
      - a
        - a1
      - b`))

    setCursorFirstMatch(['b'])(store.getState())
    store.dispatch(cursorPrev())

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a' }])

  })

  it('move to first root child when there is no cursor', () => {

    const store = createTestStore()

    store.dispatch([
      importText(RANKED_ROOT, `
      - a
      - b`),
      { type: 'setCursor', thoughtsRanked: null },
      cursorPrev()
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a' }])

  })

  it('do nothing when the cursor on the first sibling', () => {

    const store = createTestStore()

    store.dispatch([
      importText(RANKED_ROOT, `
      - a
      - b`),
      { type: 'setCursor', thoughtsRanked: [{ value: 'a', rank: 0 }] },
      cursorPrev()
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a' }])

  })

  it('do nothing when there are no thoughts', () => {

    const store = createTestStore()

    store.dispatch(cursorPrev())

    expect(store.getState().cursor).toBe(null)

  })

  // it('work for sorted thoughts', () => {

  //   const store = createTestStore()

  //   store.dispatch(importText(RANKED_ROOT, `
  //   - SORT
  //     - a
  //     - c
  //     - b
  //       - b1`))

  //   store.dispatch({
  //     type: 'toggleAttribute',
  //     context: ['SORT'],
  //     key: '=sort',
  //     value: 'Alphabetical'
  //   })

  //   store.dispatch({
  //     type: 'setCursor',
  //     thoughtsRanked: [{ value: 'SORT', rank: 0 }, { value: 'c', rank: 2 }],
  //   })

  //   store.dispatch(cursorPrev())

  //   expect(store.getState().cursor)
  //     .toMatchObject([{ value: 'SORT', rank: 0 }, { value: 'b', rank: 3 }])

  // })

  it('skip descendants', () => {

    const store = createTestStore()

    store.dispatch(importText(RANKED_ROOT, `
      - a
        - a1
      - b`))
    setCursorFirstMatch(['b'])(store.getState())
    store.dispatch(cursorPrev())

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a' }])

  })

})
