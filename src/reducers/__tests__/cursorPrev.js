import { RANKED_ROOT } from '../../constants'
import { importText, cursorNext } from '../../action-creators'

import { createTestStore } from '../../test-helpers/createTestStore'

// action-creators
import { cursorPrev } from '../../action-creators'

describe('normal view', () => {

  it('move cursor to previous sibling', async() => {

    const store = createTestStore()

    await store.dispatch(importText(RANKED_ROOT, `
    - a
      - a1
    - b`))

    await store.dispatch({
      type: 'setCursor',
      thoughtsRanked: [{ value: 'b', rank: 3 }],
    })

    store.dispatch(cursorPrev())

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a', rank: 0 }])

  })

  it('move to first root child when there is no cursor', async() => {

    const store = createTestStore()

    await store.dispatch(importText(RANKED_ROOT, `
    - a
    - b`))

    await store.dispatch({
      type: 'setCursor',
      thoughtsRanked: null,
    })

    store.dispatch(cursorPrev())

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a', rank: 0 }])

  })

  it('do nothing when the cursor on the first sibling', async() => {

    const store = createTestStore()

    await store.dispatch(importText(RANKED_ROOT, `
    - a
    - b`))

    await store.dispatch({
      type: 'setCursor',
      thoughtsRanked: [{ value: 'a', rank: 0 }],
    })

    store.dispatch(cursorPrev())

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a', rank: 0 }])

  })

  it('do nothing when there are no thoughts', () => {

    const store = createTestStore()

    store.dispatch(cursorPrev())

    expect(store.getState().cursor).toBe(null)

  })

  // it('work for sorted thoughts', async() => {

  //   const store = createTestStore()

  //   await store.dispatch(importText(RANKED_ROOT, `
  //   - SORT
  //     - a
  //     - c
  //     - b
  //       - b1`))

  //   await store.dispatch({
  //     type: 'toggleAttribute',
  //     context: ['SORT'],
  //     key: '=sort',
  //     value: 'Alphabetical'
  //   })

  //   await store.dispatch({
  //     type: 'setCursor',
  //     thoughtsRanked: [{ value: 'SORT', rank: 0 }, { value: 'c', rank: 2 }],
  //   })

  //   store.dispatch(cursorPrev())

  //   expect(store.getState().cursor)
  //     .toMatchObject([{ value: 'SORT', rank: 0 }, { value: 'b', rank: 3 }])

  // })

  it('skip descendants', async() => {

    const store = createTestStore()

    await store.dispatch(importText(RANKED_ROOT, `
    - a
      - a1
    - b`))

    await store.dispatch({
      type: 'setCursor',
      thoughtsRanked: [{ value: 'b', rank: 3 }],
    })

    store.dispatch(cursorPrev())

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a', rank: 0 }])

  })

})
