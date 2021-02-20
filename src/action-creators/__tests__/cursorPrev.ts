import { HOME_PATH } from '../../constants'
import { cursorPrev, importText, setCursor } from '../../action-creators'
import { createTestStore } from '../../test-helpers/createTestStore'
import setCursorFirstMatch, { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

describe('normal view', () => {

  it('move cursor to previous sibling', () => {

    const store = createTestStore()

    store.dispatch(importText({
      path: HOME_PATH,
      text: `
        - a
          - a1
        - b`
    }))

    setCursorFirstMatch(['b'])(store.getState())
    store.dispatch(cursorPrev())

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a' }])

  })

  it('move to first root child when there is no cursor', () => {

    const store = createTestStore()

    store.dispatch([
      importText({
        path: HOME_PATH,
        text: `
          - a
          - b`
      }),
      setCursor({ path: null }),
      cursorPrev()
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a' }])

  })

  it('do nothing when the cursor on the first sibling', () => {

    const store = createTestStore()

    store.dispatch([
      importText({
        path: HOME_PATH,
        text: `
          - a
          - b`
      }),
      setCursorFirstMatchActionCreator(['a']),
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
      importText({
        path: HOME_PATH,
        text: `
          - SORT
            - a
            - c
            - b
              - b1`
      }),
      {
        type: 'toggleAttribute',
        context: ['SORT'],
        key: '=sort',
        value: 'Alphabetical'
      },
      setCursorFirstMatchActionCreator(['SORT', 'c']),
      cursorPrev()
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'SORT' }, { value: 'b' }])

  })

  it('skip descendants', () => {

    const store = createTestStore()

    store.dispatch(importText({
      path: HOME_PATH,
      text: `
          - a
            - a1
          - b`
    }))
    setCursorFirstMatch(['b'])(store.getState())
    store.dispatch(cursorPrev())

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a' }])

  })

})
