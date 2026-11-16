import { closePortalActionCreator as closePortal } from '../../actions/closePortal'
import { cursorForwardActionCreator as cursorForward } from '../../actions/cursorForward'
import { exitPortalActionCreator as exitPortal } from '../../actions/exitPortal'
import { importTextActionCreator as importText } from '../../actions/importText'
import { setCursorActionCreator as setCursorPath } from '../../actions/setCursor'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import { unfoldContextActionCreator as unfoldContext } from '../../actions/unfoldContext'
import { executeCommand } from '../../commands'
import closePortalCommand from '../../commands/closePortal'
import exitPortalCommand from '../../commands/exitPortal'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import getContextViewExpansion from '../../selectors/getContextViewExpansion'
import isContextViewActive from '../../selectors/isContextViewActive'
import nearestPortalPath from '../../selectors/nearestPortalPath'
import store from '../../stores/app'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import appendToPath from '../../util/appendToPath'
import head from '../../util/head'

beforeEach(initStore)

it('exits the nearest nested portal while retaining both context views', () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
- Garden
  - m
    - second idea
      - local reading
- Theory
  - second idea
    - theoretical reading
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const outerEntrance = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'portal navigation test')
  const outerContextId = head(contextToPathOrThrow(store.getState(), ['Garden', 'm'], 'portal navigation test'))
  const garden = head(contextToPathOrThrow(store.getState(), ['Garden'], 'portal navigation test'))
  store.dispatch(unfoldContext({ contextViewPath: outerEntrance, contextId: outerContextId, ancestorId: garden }))
  store.dispatch([cursorForward(), cursorForward(), toggleContextView()])
  const innerEntrance = store.getState().cursor!
  const innerContextId = head(
    contextToPathOrThrow(store.getState(), ['Theory', 'second idea'], 'portal navigation test'),
  )
  const theory = head(contextToPathOrThrow(store.getState(), ['Theory'], 'portal navigation test'))
  store.dispatch(unfoldContext({ contextViewPath: innerEntrance, contextId: innerContextId, ancestorId: theory }))
  store.dispatch([cursorForward(), cursorForward()])
  const innerRoute = store.getState().cursor!

  executeCommand(exitPortalCommand, { store })

  expect(store.getState().cursor).toEqual(innerEntrance)
  expect(isContextViewActive(store.getState(), innerEntrance)).toBe(true)
  expect(getContextViewExpansion(store.getState(), innerRoute)?.contextId).toBe(innerContextId)

  executeCommand(exitPortalCommand, { store })

  expect(store.getState().cursor).toEqual(outerEntrance)
  expect(isContextViewActive(store.getState(), outerEntrance)).toBe(true)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
  - Garden
    - m
      - second idea
        - local reading
  - Theory
    - second idea
      - theoretical reading`)
})

it('closes a collapsed context entry at its visible parent rather than its elided child scope', () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Outside
  - Garden
    - m
      - target detail
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
    setCursor(['Reading', 'm', 'Garden']),
  ])
  const entrance = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'portal navigation test')

  executeCommand(closePortalCommand, { store })

  expectPathToEqual(store.getState(), store.getState().cursor, ['Outside', 'Garden'])
  expect(isContextViewActive(store.getState(), entrance)).toBe(false)
  expect(nearestPortalPath(store.getState(), store.getState().cursor)).toBeNull()
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Reading
    - m
      - source detail
  - Outside
    - Garden
      - m
        - target detail`)
})

it('closes an unfolded route while preserving the captured caret and unrelated expanded view', () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
    - source detail
- Garden
  - m
    - target detail
- Untouched
  - q
    - first note
- Another
  - q
    - other note
`,
    }),
    setCursor(['Untouched', 'q']),
    toggleContextView(),
  ])
  const unrelatedEntrance = contextToPathOrThrow(store.getState(), ['Untouched', 'q'], 'portal navigation test')
  const unrelatedContextId = head(contextToPathOrThrow(store.getState(), ['Another', 'q'], 'portal navigation test'))
  const another = head(contextToPathOrThrow(store.getState(), ['Another'], 'portal navigation test'))
  store.dispatch(
    unfoldContext({ contextViewPath: unrelatedEntrance, contextId: unrelatedContextId, ancestorId: another }),
  )
  const unrelatedRoute = store.getState().cursor!
  store.dispatch([setCursor(['Reading', 'm']), toggleContextView()])
  const entrance = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'portal navigation test')
  const contextId = head(contextToPathOrThrow(store.getState(), ['Garden', 'm'], 'portal navigation test'))
  const garden = head(contextToPathOrThrow(store.getState(), ['Garden'], 'portal navigation test'))
  store.dispatch(unfoldContext({ contextViewPath: entrance, contextId, ancestorId: garden }))
  store.dispatch([cursorForward(), cursorForward()])
  store.dispatch(setCursorPath({ path: store.getState().cursor, offset: 4 }))
  store.dispatch({
    type: 'saveSelectionOffsets',
    selectionOffsets: { thoughtId: head(store.getState().cursor!), start: 6, end: 6 },
  })
  const closedRoute = store.getState().cursor!

  executeCommand(closePortalCommand, { store })

  expectPathToEqual(store.getState(), store.getState().cursor, ['Garden', 'm', 'target detail'])
  expect(store.getState().cursorOffset).toBe(6)
  expect(isContextViewActive(store.getState(), entrance)).toBe(false)
  expect(getContextViewExpansion(store.getState(), closedRoute)).toBeUndefined()
  expect(isContextViewActive(store.getState(), unrelatedEntrance)).toBe(true)
  expect(getContextViewExpansion(store.getState(), unrelatedRoute)?.contextId).toBe(unrelatedContextId)
  expect(nearestPortalPath(store.getState(), store.getState().cursor)).toBeNull()
})

it('closes all crossed frames behind a nested destination without leaving an anchored cursor', () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
- Garden
  - m
    - second idea
      - local reading
- Theory
  - second idea
    - theoretical reading
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const outerEntrance = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'portal navigation test')
  const outerContextId = head(contextToPathOrThrow(store.getState(), ['Garden', 'm'], 'portal navigation test'))
  const garden = head(contextToPathOrThrow(store.getState(), ['Garden'], 'portal navigation test'))
  store.dispatch(unfoldContext({ contextViewPath: outerEntrance, contextId: outerContextId, ancestorId: garden }))
  store.dispatch([cursorForward(), cursorForward(), toggleContextView()])
  const innerEntrance = store.getState().cursor!
  const innerContextId = head(
    contextToPathOrThrow(store.getState(), ['Theory', 'second idea'], 'portal navigation test'),
  )
  const theory = head(contextToPathOrThrow(store.getState(), ['Theory'], 'portal navigation test'))
  store.dispatch(unfoldContext({ contextViewPath: innerEntrance, contextId: innerContextId, ancestorId: theory }))
  store.dispatch([cursorForward(), cursorForward()])
  const closedRoute = store.getState().cursor!

  store.dispatch(closePortal())

  expectPathToEqual(store.getState(), store.getState().cursor, ['Theory', 'second idea', 'theoretical reading'])
  expect(isContextViewActive(store.getState(), outerEntrance)).toBe(false)
  expect(isContextViewActive(store.getState(), innerEntrance)).toBe(false)
  expect(getContextViewExpansion(store.getState(), closedRoute)).toBeUndefined()
  expect(nearestPortalPath(store.getState(), store.getState().cursor)).toBeNull()
  expect(store.getState().cursorHistory).toEqual([])
})

it('closes a Home context entry to the ordinary Home cursor', () => {
  store.dispatch([
    importText({
      text: `
- m
  - root detail
- Reading
  - m
    - source detail
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const entrance = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'portal navigation test')
  store.dispatch(setCursorPath({ path: appendToPath(entrance, HOME_TOKEN) }))

  store.dispatch(closePortal())

  expect(store.getState().cursor).toBeNull()
  expect(isContextViewActive(store.getState(), entrance)).toBe(false)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - m
    - root detail
  - Reading
    - m
      - source detail`)
})

it('leaves an untraversed context view open when portal navigation is unavailable', () => {
  store.dispatch([
    importText({
      text: `
- Reading
  - m
- Garden
  - m
`,
    }),
    setCursor(['Reading', 'm']),
    toggleContextView(),
  ])
  const entrance = contextToPathOrThrow(store.getState(), ['Reading', 'm'], 'portal navigation test')

  expect(exitPortalCommand.canExecute(store.getState())).toBe(false)
  expect(closePortalCommand.canExecute(store.getState())).toBe(false)
  store.dispatch([exitPortal(), closePortal()])

  expect(store.getState().cursor).toEqual(entrance)
  expect(isContextViewActive(store.getState(), entrance)).toBe(true)
})
