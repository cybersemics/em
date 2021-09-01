import { cursorNext, importText, setCursor } from '../../action-creators'
import { createTestStore } from '../../test-helpers/createTestStore'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import globals from '../../globals'
import { childIdsToThoughts } from '../../selectors'

describe('normal view', () => {
  it('move cursor to next sibling', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - a
            - a1
          - b`,
      }),
      setCursorFirstMatchActionCreator(['a']),
      cursorNext(),
    ])

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: 'b' }])
  })

  it('move to first root child when there is no cursor', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - a
          - b`,
      }),
      setCursor({ path: null }),
      cursorNext(),
    ])

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: 'a' }])
  })

  it('do nothing when the cursor on the last sibling', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - a
          - b`,
      }),
      setCursorFirstMatchActionCreator(['b']),
      cursorNext(),
    ])

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: 'b' }])
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
        text: `
          - SORT
            - a
              - a1
            - c
            - b`,
      }),
      {
        type: 'toggleAttribute',
        context: ['SORT'],
        key: '=sort',
        value: 'Alphabetical',
      },
      setCursorFirstMatchActionCreator(['SORT', 'a']),
      cursorNext(),
    ])

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: 'SORT' }, { value: 'b' }])
  })

  it('skip descendants', () => {
    const store = createTestStore()

    store.dispatch([
      importText({
        text: `
          - a
            - a1
          - b`,
      }),
      setCursorFirstMatchActionCreator(['a']),
      cursorNext(),
    ])

    const cursorThoughts = childIdsToThoughts(store.getState(), store.getState().cursor!)

    expect(cursorThoughts).toMatchObject([{ value: 'b' }])
  })
})

describe('global suppress expansion', () => {
  beforeEach(() => {
    globals.suppressExpansion = false
  })

  it('suppress expansion path on cursorNext', async () => {
    const text = `
    - a
      - d
        - k
      - c
        - e
        - f`

    jest.useFakeTimers()
    const store = createTestStore()

    store.dispatch([
      importText({
        text,
      }),
      setCursorFirstMatchActionCreator(['a', 'd']),
      cursorNext(),
    ])

    expect(globals.suppressExpansion).toBe(true)
  })

  it('do not activate suppress expansion on cursorNext if new cursor is pinned', async () => {
    const text = `
    - a
      - d
        - k
      - c
        - =pin
          - true
        - e
        - f`

    jest.useFakeTimers()
    const store = createTestStore()

    store.dispatch([
      importText({
        text,
      }),
      setCursorFirstMatchActionCreator(['a', 'd']),
      cursorNext(),
    ])

    expect(globals.suppressExpansion).toBe(false)
  })

  it('do not activate suppress expansion on cursorNext if new cursor parent has pinned children', async () => {
    const text = `
    - a
      - =pinChildren
        - true
      - d
        - k
      - c
        - e
        - f`

    jest.useFakeTimers()
    const store = createTestStore()

    store.dispatch([
      importText({
        text,
      }),
      setCursorFirstMatchActionCreator(['a', 'd']),
      cursorNext(),
    ])

    expect(globals.suppressExpansion).toBe(false)
  })
})
