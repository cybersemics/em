import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import pathToContext from '../../util/pathToContext'
import bindContextCommand from '../bindContext'

beforeEach(initStore)

/** Imports two contexts of m and activates the context view on a/m, so that a and b are listed as contexts under a/m~. */
const importOneContextView = () =>
  store.dispatch([
    importText({
      text: `
        - a
          - m
            - x
        - b
          - m
            - y
      `,
    }),
    setCursor(['a', 'm']),
    toggleContextView(),
  ])

/** Imports two independent pairs of contexts and activates the context view on both a/m and c/n. */
const importTwoContextViews = () =>
  store.dispatch([
    importText({
      text: `
        - a
          - m
            - x
        - b
          - m
            - y
        - c
          - n
            - x
        - d
          - n
            - y
      `,
    }),
    setCursor(['a', 'm']),
    toggleContextView(),
    setCursor(['c', 'n']),
    toggleContextView(),
  ])

describe('multicursor', () => {
  it('binds each selected context under its own context view', () => {
    importTwoContextViews()
    store.dispatch([setCursor(['a', 'm', 'b']), addMulticursor(['a', 'm', 'b']), addMulticursor(['c', 'n', 'd'])])

    executeCommandWithMulticursor(bindContextCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - m
      - =bindContextCommand
        - ["b","m"]
      - x
  - b
    - m
      - y
  - c
    - n
      - =bindContextCommand
        - ["d","n"]
      - x
  - d
    - n
      - y`)
  })

  it('binds only the last selected context when several contexts of the same context view are selected', () => {
    importOneContextView()
    store.dispatch([setCursor(['a', 'm', 'a']), addMulticursor(['a', 'm', 'a']), addMulticursor(['a', 'm', 'b'])])

    executeCommandWithMulticursor(bindContextCommand, { store })

    // A binding is a relation between the context view thought and a single context, stored as one
    // =bindContextCommand value. Each iteration overwrites the previous one, so the last context in
    // document order wins. See the sequential equivalence test below.
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - m
      - =bindContextCommand
        - ["b","m"]
      - x
  - b
    - m
      - y`)
  })

  it('matches invoking the command on each selected context in turn', () => {
    importOneContextView()

    store.dispatch(setCursor(['a', 'm', 'a']))
    executeCommand(bindContextCommand, { store })
    store.dispatch(setCursor(['a', 'm', 'b']))
    executeCommand(bindContextCommand, { store })

    // Identical to the multiselect result above: the multicursor loop is exactly a sequence of
    // single-cursor invocations in document order.
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - m
      - =bindContextCommand
        - ["b","m"]
      - x
  - b
    - m
      - y`)
  })

  it('rebinds to the last selected context when an already bound context is also selected', () => {
    importOneContextView()
    store.dispatch(setCursor(['a', 'm', 'a']))
    executeCommand(bindContextCommand, { store })

    store.dispatch([addMulticursor(['a', 'm', 'a']), addMulticursor(['a', 'm', 'b'])])

    executeCommandWithMulticursor(bindContextCommand, { store })

    // a's binding is toggled off by the first iteration, then b is bound by the second.
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - m
      - =bindContextCommand
        - ["b","m"]
      - x
  - b
    - m
      - y`)
  })

  it('preserves the binding when the last selected context is already bound', () => {
    importOneContextView()
    store.dispatch(setCursor(['a', 'm', 'b']))
    executeCommand(bindContextCommand, { store })

    store.dispatch([setCursor(['a', 'm', 'a']), addMulticursor(['a', 'm', 'a']), addMulticursor(['a', 'm', 'b'])])

    executeCommandWithMulticursor(bindContextCommand, { store })

    // The first iteration overwrites the binding with a, the second overwrites it back with b, so the
    // run is a net no-op. It is a silent no-op, not a blocked command, so no error alert is shown.
    expect(store.getState().alert?.value).toBeFalsy()

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - m
      - =bindContextCommand
        - ["b","m"]
      - x
  - b
    - m
      - y`)

    // Contrast with the single-cursor case, which toggles the existing binding off.
    store.dispatch(setCursor(['a', 'm', 'b']))
    executeCommand(bindContextCommand, { store })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - m
      - y`)
  })

  it('binds the cursor context when it is the only selected thought', () => {
    importOneContextView()
    store.dispatch([setCursor(['a', 'm', 'b']), addMulticursor(['a', 'm', 'b'])])

    executeCommandWithMulticursor(bindContextCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - m
      - =bindContextCommand
        - ["b","m"]
      - x
  - b
    - m
      - y`)
  })

  it('does nothing when the context view is not active', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - m
              - x
          - b
            - m
              - y
        `,
      }),
      setCursor(['a', 'm']),
      addMulticursor(['a', 'm']),
      addMulticursor(['b', 'm']),
    ])

    executeCommandWithMulticursor(bindContextCommand, { store })

    // exec returns early for every selected thought, silently. No error alert is shown.
    expect(store.getState().alert?.value).toBeFalsy()

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - m
      - y`)
  })

  it('skips selected thoughts that are not contexts of the context view', () => {
    importOneContextView()
    store.dispatch([setCursor(['a', 'm', 'b']), addMulticursor(['a', 'm', 'b']), addMulticursor(['a', 'm', 'b', 'y'])])

    executeCommandWithMulticursor(bindContextCommand, { store })

    // a/m~/b/y is inside the context view but its parent is not the context view thought, so it is a
    // no-op rather than blocking the run.
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - m
      - =bindContextCommand
        - ["b","m"]
      - x
  - b
    - m
      - y`)
  })

  it('restores the cursor and multicursors to their context view paths', () => {
    importOneContextView()
    store.dispatch([setCursor(['a', 'm', 'a']), addMulticursor(['a', 'm', 'a']), addMulticursor(['a', 'm', 'b'])])

    executeCommandWithMulticursor(bindContextCommand, { store })

    const state = store.getState()

    // Precondition: the run bound a context, otherwise the restore below would be asserted on a no-op.
    expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toContain('=bindContextCommand')

    // Nothing moved, so the cursor returns to the context it started on rather than the last context
    // executed on, and the selection remains meaningful.
    expectPathToEqual(state, state.cursor, ['a', 'm', 'a'])
    expect(Object.values(state.multicursors).map(path => pathToContext(state, path))).toEqual([
      ['a', 'm', 'a'],
      ['a', 'm', 'b'],
    ])
  })

  it('reverts every binding on a single undo', () => {
    importTwoContextViews()
    store.dispatch([setCursor(['a', 'm', 'b']), addMulticursor(['a', 'm', 'b']), addMulticursor(['c', 'n', 'd'])])

    executeCommandWithMulticursor(bindContextCommand, { store })

    // Precondition: both bindings were created, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - m
      - =bindContextCommand
        - ["b","m"]
      - x
  - b
    - m
      - y
  - c
    - n
      - =bindContextCommand
        - ["d","n"]
      - x
  - d
    - n
      - y`)

    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - m
      - x
  - b
    - m
      - y
  - c
    - n
      - x
  - d
    - n
      - y`)
  })
})
