import { addMulticursorActionCreator } from '../../actions/addMulticursor'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { AlertType, HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import hashPath from '../../util/hashPath'
import newGrandChildCommand from '../newGrandChild'

beforeEach(initStore)

describe('canExecute', () => {
  it('requires the current thought to have a visible child', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
            - c
        `,
      }),
      setCursor(['a']),
    ])

    expect(newGrandChildCommand.canExecute(store.getState())).toBe(false)

    store.dispatch(setCursor(['b']))

    expect(newGrandChildCommand.canExecute(store.getState())).toBe(true)
  })

  it('can execute on a selected thought with a visible child when the cursor is on a thought with none', () => {
    // The selected thought is not necessarily the cursor, e.g. when a thought is long pressed while the cursor is elsewhere.
    store.dispatch([
      importText({
        text: `
          - a
          - b
            - c
        `,
      }),
      setCursor(['a']),
      addMulticursor(['b']),
    ])

    expect(newGrandChildCommand.canExecute(store.getState())).toBe(true)
  })

  it('requires the root to have a visible child when there is no cursor', () => {
    store.dispatch(setCursor(null))

    expect(newGrandChildCommand.canExecute(store.getState())).toBe(false)

    store.dispatch([
      importText({
        text: `
          - a
          - b
        `,
      }),
      setCursor(null),
    ])

    expect(newGrandChildCommand.canExecute(store.getState())).toBe(true)
  })
})

describe('no cursor', () => {
  it('creates a new empty thought in the first visible child of the root', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - x
          - b
        `,
      }),
      setCursor(null),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    const state = store.getState()

    expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - x
    - ${''}
  - b`)

    // the cursor must end in the new empty thought, ready to type
    expectPathToEqual(state, state.cursor, ['a', ''])
  })
})

describe('multicursor', () => {
  // https://github.com/cybersemics/em/pull/5129
  it('does not execute unless every selected thought has a visible child', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['a', 'b']),
    ])

    expect(newGrandChildCommand.canExecute(store.getState())).toBe(false)

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - b
  - c`)
  })

  // https://github.com/cybersemics/em/issues/5335
  it('alerts the selected thoughts that have no visible child', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
          - a thought too long to be named in full
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['c']),
      addMulticursor(['a thought too long to be named in full']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store, type: 'gesture' })

    expect(store.getState().alert).toMatchObject({
      alertType: AlertType.MulticursorError,
      value: 'New Grandchild cannot be executed on 2 of the selected thoughts: "c", "a thought too ..."',
    })
  })

  it('alerts every selected thought when none has a visible child', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store, type: 'gesture' })

    expect(store.getState().alert).toMatchObject({
      alertType: AlertType.MulticursorError,
      value: 'New Grandchild cannot be executed on 2 of the selected thoughts: "a", "b"',
    })
  })

  it('alerts the cursor thought when it has no visible child', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
        `,
      }),
      setCursor(['a']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store, type: 'gesture' })

    expect(store.getState().alert).toMatchObject({
      alertType: AlertType.MulticursorError,
      value: 'New Grandchild cannot be executed on "a"',
    })
  })

  it('calls an empty cursor thought an empty thought', () => {
    store.dispatch([
      importText({
        text: `
          - a
        `,
      }),
      setCursor(['a']),
      newThought({ value: '' }),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store, type: 'gesture' })

    expect(store.getState().alert).toMatchObject({
      alertType: AlertType.MulticursorError,
      value: 'New Grandchild cannot be executed on an empty thought',
    })
  })

  it('names a selected empty thought after the selected thoughts that have a value', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
            - c
        `,
      }),
      setCursor(['a']),
      newThought({ value: '' }),
    ])
    const emptyPath = store.getState().cursor!
    store.dispatch([addMulticursorActionCreator({ path: emptyPath }), addMulticursor(['a']), addMulticursor(['b'])])

    executeCommandWithMulticursor(newGrandChildCommand, { store, type: 'gesture' })

    expect(store.getState().alert).toMatchObject({
      alertType: AlertType.MulticursorError,
      value: 'New Grandchild cannot be executed on 2 of the selected thoughts: "a", an empty thought',
    })
  })

  it('counts several selected empty thoughts', () => {
    store.dispatch([
      importText({
        text: `
          - a
        `,
      }),
      setCursor(['a']),
      newThought({ value: '' }),
    ])
    const firstEmptyPath = store.getState().cursor!
    store.dispatch(newThought({ value: '' }))
    const secondEmptyPath = store.getState().cursor!
    store.dispatch([
      addMulticursor(['a']),
      addMulticursorActionCreator({ path: firstEmptyPath }),
      addMulticursorActionCreator({ path: secondEmptyPath }),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store, type: 'gesture' })

    expect(store.getState().alert).toMatchObject({
      alertType: AlertType.MulticursorError,
      value: 'New Grandchild cannot be executed on 3 of the selected thoughts: "a", 2 empty thoughts',
    })
  })

  // https://github.com/cybersemics/em/pull/6382#pullrequestreview-6068513847
  it('names at most three blocking thoughts and counts the rest', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
          - c
          - d
          - e
          - f
            - g
        `,
      }),
      setCursor(['a']),
      ...['a', 'b', 'c', 'd', 'e', 'f'].map(value => addMulticursor([value])),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store, type: 'gesture' })

    expect(store.getState().alert).toMatchObject({
      alertType: AlertType.MulticursorError,
      value: 'New Grandchild cannot be executed on 5 of the selected thoughts: "a", "b", "c", and 2 other thoughts',
    })
  })

  it('creates a new empty grandchild in each selected thought', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d
          - e
            - f
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['c']),
      addMulticursor(['e']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - ${''}
  - c
    - d
      - ${''}
  - e
    - f
      - ${''}`)
  })

  it('appends the new grandchild to the existing children of the first subthought', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
              - x
            - c
          - d
            - e
              - y
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['d']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - x
      - ${''}
    - c
  - d
    - e
      - y
      - ${''}`)
  })

  it('creates new grandchildren in selected thoughts at different depths', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d
              - e
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['c', 'd']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - ${''}
  - c
    - d
      - e
        - ${''}`)
  })

  it('places the caret in the last created empty grandchild', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    const state = store.getState()

    // the cursor must end in the new empty grandchild of the last selected thought, ready to type
    expectPathToEqual(state, state.cursor, ['c', 'd', ''])
  })

  it('places the caret in the new empty grandchild when a single thought is selected', () => {
    // on mobile, opening the Command Center selects the cursor thought, so a single selected thought is the common case
    store.dispatch([
      importText({
        text: `
          - a
            - b
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    const state = store.getState()

    expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - ${''}`)

    expectPathToEqual(state, state.cursor, ['a', 'b', ''])
    expect(state.multicursors).toEqual({})
  })

  it('reverts every created grandchild on a single undo', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d
          - e
            - f
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['c']),
      addMulticursor(['e']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    // Precondition: all three grandchildren were created, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - ${''}
  - c
    - d
      - ${''}
  - e
    - f
      - ${''}`)

    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
  - c
    - d
  - e
    - f`)
  })

  // https://github.com/cybersemics/em/issues/3564
  it('selects the new grandchildren after execution', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    const state = store.getState()
    const multicursors = Object.values(state.multicursors)

    expect(multicursors).toHaveLength(2)
    expectPathToEqual(state, multicursors[0], ['a', 'b', ''])
    expectPathToEqual(state, multicursors[1], ['c', 'd', ''])
  })

  // https://github.com/cybersemics/em/issues/3564
  it('expands the first subthought of each selected thought so that its new grandchild is visible', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    const state = store.getState()

    expect(state.expanded[hashPath(contextToPath(state, ['a', 'b'])!)]).toBeTruthy()
    expect(state.expanded[hashPath(contextToPath(state, ['c', 'd'])!)]).toBeTruthy()
  })
})
