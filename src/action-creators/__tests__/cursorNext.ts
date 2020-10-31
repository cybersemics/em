import { RANKED_ROOT } from '../../constants'
import { cursorNext, importText } from '../../action-creators'
import { createTestStore } from '../../test-helpers/createTestStore'

describe('normal view', () => {

  it('move cursor to next sibling', () => {

    const store = createTestStore()

    store.dispatch([
      importText(RANKED_ROOT, `
      - a
        - a1
      - b`),
      { type: 'setCursor', path: [{ value: 'a', rank: 0 }] },
      cursorNext()
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'b' }])

  })

  it('move to first root child when there is no cursor', () => {

    const store = createTestStore()

    store.dispatch([
      importText(RANKED_ROOT, `
      - a
      - b`),
      { type: 'setCursor', path: null },
      cursorNext()
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a' }])

  })

  it('do nothing when the cursor on the last sibling', () => {

    const store = createTestStore()

    store.dispatch([
      importText(RANKED_ROOT, `
      - a
      - b`),
      { type: 'setCursor', path: [{ value: 'b', rank: 1 }] },
      cursorNext()
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'b' }])

  })

  it('do nothing when there are no thoughts', () => {

    const store = createTestStore()

    store.dispatch(cursorNext())

    expect(store.getState().cursor).toBe(null)

  })

  it('sorted thoughts', () => {

    const store = createTestStore()

    store.dispatch([
      importText(RANKED_ROOT, `
      - SORT
        - a
          - a1
        - c
        - b`),
      {
        type: 'toggleAttribute',
        context: ['SORT'],
        key: '=sort',
        value: 'Alphabetical'
      },
      {
        type: 'setCursor',
        path: [{ value: 'SORT', rank: 0 }, { value: 'a', rank: 1 }],
      },
      cursorNext(),
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'SORT' }, { value: 'b' }])

  })

  it('skip descendants', () => {

    const store = createTestStore()

    store.dispatch([
      importText(RANKED_ROOT, `
      - a
        - a1
      - b`),
      { type: 'setCursor', path: [{ value: 'a', rank: 0 }] },
      cursorNext()
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'b' }])

  })

})
