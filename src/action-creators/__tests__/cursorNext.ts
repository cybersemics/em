import { HOME_PATH } from '../../constants'
import { cursorNext, importText, setCursor } from '../../action-creators'
import { createTestStore } from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

describe('normal view', () => {

  it('move cursor to next sibling', () => {

    const store = createTestStore()

    store.dispatch([
      importText({
        path: HOME_PATH,
        text: `
          - a
            - a1
          - b`
      }),
      setCursorFirstMatchActionCreator(['a']),
      cursorNext()
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'b' }])

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
      cursorNext()
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'a' }])

  })

  it('do nothing when the cursor on the last sibling', () => {

    const store = createTestStore()

    store.dispatch([
      importText({
        path: HOME_PATH,
        text: `
          - a
          - b`
      }),
      setCursorFirstMatchActionCreator(['b']),
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
      importText({
        path: HOME_PATH,
        text: `
          - SORT
            - a
              - a1
            - c
            - b`
      }),
      {
        type: 'toggleAttribute',
        context: ['SORT'],
        key: '=sort',
        value: 'Alphabetical'
      },
      setCursorFirstMatchActionCreator(['SORT', 'a']),
      cursorNext(),
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'SORT' }, { value: 'b' }])

  })

  it('skip descendants', () => {

    const store = createTestStore()

    store.dispatch([
      importText({
        path: HOME_PATH,
        text: `
          - a
            - a1
          - b`
      }),
      setCursorFirstMatchActionCreator(['a']),
      cursorNext()
    ])

    expect(store.getState().cursor)
      .toMatchObject([{ value: 'b' }])

  })

})
