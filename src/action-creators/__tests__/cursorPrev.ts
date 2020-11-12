import { RANKED_ROOT } from '../../constants'
import { cursorPrev } from '../../action-creators'
import { createTestStore } from '../../test-helpers/createTestStore'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'

describe('normal view', () => {

  it('move cursor to previous sibling', () => {

    const store = createTestStore()

    store.dispatch({
      type: 'importText',
      path: RANKED_ROOT,
      text: `
        - a
          - a1
        - b`
    })

    setCursorFirstMatch(['b'])(store.getState())
    store.dispatch(cursorPrev())

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a' }])

  })

  it('move to first root child when there is no cursor', () => {

    const store = createTestStore()

    store.dispatch([
      {
        type: 'importText',
        path: RANKED_ROOT,
        text: `
          - a
          - b`
      },
      { type: 'setCursor', path: null },
      cursorPrev()
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a' }])

  })

  it('do nothing when the cursor on the first sibling', () => {

    const store = createTestStore()

    store.dispatch([
      {
        type: 'importText',
        path: RANKED_ROOT,
        text: `
          - a
          - b`
      },
      { type: 'setCursor', path: [{ value: 'a', rank: 0 }] },
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

  it('sorted thoughts', () => {

    const store = createTestStore()

    store.dispatch([
      {
        type: 'importText',
        path: RANKED_ROOT,
        text: `
          - SORT
            - a
            - c
            - b
              - b1`
      },
      {
        type: 'toggleAttribute',
        context: ['SORT'],
        key: '=sort',
        value: 'Alphabetical'
      },
      {
        type: 'setCursor',
        path: [{ value: 'SORT', rank: 0 }, { value: 'c', rank: 1 }],
      },
      cursorPrev()
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'SORT' }, { value: 'b' }])

  })

  it('skip descendants', () => {

    const store = createTestStore()

    store.dispatch({
      type: 'importText',
      path: RANKED_ROOT,
      text: `
          - a
            - a1
          - b`
    })
    setCursorFirstMatch(['b'])(store.getState())
    store.dispatch(cursorPrev())

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a' }])

  })

})
