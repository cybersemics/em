import { DropTargetMonitor } from 'react-dnd'
import Context from '../../@types/Context'
import DragThoughtZone from '../../@types/DragThoughtZone'
import DropThoughtZone from '../../@types/DropThoughtZone'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import { dragInProgressActionCreator as dragInProgress } from '../../actions/dragInProgress'
import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import equalArrays from '../../util/equalArrays'
import pathToContext from '../../util/pathToContext'
import { canDrop } from '../DragAndDropSubthoughts'
// import Subthoughts from '../Subthoughts'
import Thought from '../Thought'

// type for Thoughts or Subthoughts component that has a simplePath prop
interface ComponentWithSimplePath {
  props: () => {
    simplePath: SimplePath
  }
}

// react-dnd adds getHandlerId to Component
declare module 'react' {
  interface Component {
    getHandlerId: () => number
  }
}

/** A filterWhere predicate that returns true for Thought or Subthought nodes that match the given context. */
const whereContext = (state: State, context: Context) => (node: ComponentWithSimplePath) =>
  equalArrays(pathToContext(state, node.props().simplePath), context)

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Find DragSource inside Thoughts component. */
const findThoughtSource = (state: State, context: Context) =>
  wrapper.find(Thought).filterWhere(whereContext(state, context)).at(0).childAt(0)

/** Find DropTarget inside Thoughts component. */
// const findThoughtSiblingTarget = (state: State, context: Context) => findThoughtSource(state, context).childAt(0)

// TODO
/** Find DropTarget used for child drop inside Subthoughts. */
// const findDropEndTarget = (state: State, context: Context) =>
//   wrapper.find(Subthoughts).filterWhere(whereContext(state, context)).at(0).childAt(0)

/** Simulate Drag And Drop.
 *
 * @param source - Context which will be used to select proper drag element.
 * @param drop - Context which will be used to select drop target.
 * @param type - Type of drop target i.e child or sibling.
 */
const simulateDragAndDrop = ({
  state,
  source,
  drop,
  type,
}: {
  state: State
  source: Context
  drop: Context
  type: 'child' | 'sibling'
}) => {
  const backend = document.DND.getManager().getBackend()
  const sourceId = findThoughtSource(state, source).instance().getHandlerId()
  backend.simulateBeginDrag([sourceId])
  wrapper.update()

  // TODO
  // const targetFunction = {
  //   child: findDropEndTarget,
  //   sibling: findThoughtSiblingTarget,
  // }

  // const targetId = targetFunction[type](state, drop).instance().getHandlerId()
  // backend.simulateHover([targetId])

  wrapper.update()

  backend.simulateDrop()
  backend.simulateEndDrag([sourceId])
}

/** A reducer that emulates a drag in progress and returns props and monitor for canDrop. Dispatches dragInProgress to the app store. */
const drag = async ({ from, to }: { from: Context; to: Context }) => {
  const state = store.getState()
  const fromPath = contextToPath(state, from)!
  const toPath = contextToPath(state, to)!

  await dispatch(
    dragInProgress({
      value: true,
      draggingThought: fromPath,
      hoveringPath: toPath,
      hoverZone: DropThoughtZone.ThoughtDrop,
      sourceZone: DragThoughtZone.Thoughts,
    }),
  )

  // return the two arguments that are used by canDrop
  return {
    props: {
      path: toPath,
      simplePath: toPath,
    },
    // force the type since canDrop only uses monitor.getItem()
    monitor: { getItem: () => fromPath } as unknown as DropTargetMonitor,
  }
}

// TODO: Convert Enzyme tests to RTL tests
describe.skip('drag-and-drop', () => {
  it('drop as sibling', async () => {
    await dispatch(
      importText({
        text: `
      - a
      - b
      - c
      - d
   `,
      }),
    )

    wrapper.update()

    simulateDragAndDrop({
      state: store.getState(),
      source: ['a'],
      drop: ['c'],
      type: 'sibling',
    })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedExport = `- ${HOME_TOKEN}
  - b
  - a
  - c
  - d`

    expect(exported).toEqual(expectedExport)
  })

  it('drop as child (Drop end)', async () => {
    await dispatch(
      importText({
        text: `
      - a
      - b
      - c
      - d
   `,
      }),
    )

    wrapper.update()

    simulateDragAndDrop({
      state: store.getState(),
      source: ['b'],
      drop: ['a'],
      type: 'child',
    })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedExport = `- ${HOME_TOKEN}
  - a
    - b
  - c
  - d`

    expect(exported).toEqual(expectedExport)
  })

  it('prevent drop into descendants', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - b
        - c`,
      }),
      setCursor(['a']),
    ])

    wrapper.update()

    simulateDragAndDrop({
      state: store.getState(),
      source: ['a'],
      drop: ['a', 'b'],
      type: 'child',
    })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedExport = `- ${HOME_TOKEN}
  - a
    - b
  - c`

    expect(exported).toEqual(expectedExport)
  })

  it('drop a thought into its own context drop-end', async () => {
    await dispatch(
      importText({
        text: `
      - a
        - b
        - c`,
      }),
    )

    wrapper.update()

    simulateDragAndDrop({
      state: store.getState(),
      source: ['a', 'b'],
      drop: ['a'],
      type: 'child',
    })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedExport = `- ${HOME_TOKEN}
  - a
    - c
    - b`

    expect(exported).toEqual(expectedExport)
  })

  it('drop as child (Drop end)', async () => {
    await dispatch(
      importText({
        text: `
      - a
      - b
      - c
      - d
   `,
      }),
    )

    wrapper.update()

    simulateDragAndDrop({
      state: store.getState(),
      source: ['b'],
      drop: ['a'],
      type: 'child',
    })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedExport = `- ${HOME_TOKEN}
  - a
    - b
  - c
  - d`

    expect(exported).toEqual(expectedExport)
  })

  it('drop to beginning of context with =drop/Top', async () => {
    await dispatch(
      importText({
        text: `
      - a
        - =drop
          - top
        - b
      - c
   `,
      }),
    )

    wrapper.update()

    simulateDragAndDrop({
      state: store.getState(),
      source: ['c'],
      drop: ['a'],
      type: 'child',
    })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    const expectedExport = `- ${HOME_TOKEN}
  - a
    - =drop
      - top
    - c
    - b`

    expect(exported).toEqual(expectedExport)
  })
})

// TODO
describe('DragAndDropSubthoughts', () => {
  describe('canDrop', () => {
    it('Can drop on sibling', async () => {
      const text = `
        - a
        - b
        - c
      `
      await dispatch(importText({ text }))

      const { props, monitor } = await drag({ from: ['a'], to: ['c'] })
      expect(canDrop(props, monitor)).toEqual(true)
    })

    // descendant check must be done elsewhere since this returns true?
    // it('Cannot drop on descendant', () => {
    //   const text = `
    //     - a
    //       - b
    //   `
    //   await dispatch(importText({ text }))

    //   const { props, monitor } = await drag({ from: ['a'], to: ['a', 'b'] })
    //   expect(canDrop(props, monitor)).toEqual(false)
    // })

    it('Can drop at the end of the closest hidden parent (cursor on leaf)', async () => {
      const text = `
        - a
          - b
            - c
              - d
              - e
            - f
      `
      await dispatch([importText({ text }), setCursor(['a', 'b', 'c', 'd'])])

      const { props, monitor } = await drag({ from: ['a', 'b', 'c', 'd'], to: ['a'] })
      expect(canDrop(props, monitor)).toEqual(true)
    })

    it('Cannot drop at the end of the closest hidden parent (cursor on non-leaf)', async () => {
      const text = `
        - a
          - b
            - c
              - d
                - x
              - e
            - f
      `
      await dispatch([importText({ text }), setCursor(['a', 'b', 'c', 'd'])])

      const { props, monitor } = await drag({ from: ['a', 'b', 'c', 'd'], to: ['a'] })
      expect(canDrop(props, monitor)).toEqual(false)
    })

    it('Can drop on root when cursor is on a root grandchild', async () => {
      const text = `
        - a
          - b
            - c
      `
      await dispatch([importText({ text }), setCursor(['a', 'b', 'c'])])

      const { props, monitor } = await drag({ from: ['a', 'b', 'c'], to: [HOME_TOKEN] })
      expect(canDrop(props, monitor)).toEqual(true)
    })

    // TODO
    it.skip('Cannot drop on root when cursor is on a great-grandchild of the root', async () => {
      // 'a' is hidden, so it doesn't make sense to be able to drop before/after 'a'
      const text = `
        - a
          - b
            - c
              - d
      `
      await dispatch([importText({ text }), setCursor(['a', 'b', 'c'])])

      const { props, monitor } = await drag({ from: ['a', 'b', 'c'], to: [HOME_TOKEN] })
      expect(canDrop(props, monitor)).toEqual(false)
    })
  })
})
