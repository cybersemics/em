import { ReactWrapper } from 'enzyme'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'

import Thought from '../Thought'
import Subthoughts from '../Subthoughts'

import { HOME_TOKEN } from '../../constants'
import { equalArrays, pathToContext } from '../../util'
import { exportContext } from '../../selectors'
import { importText } from '../../action-creators'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import { Context, SimplePath, State } from '../../@types'

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

let wrapper: ReactWrapper<unknown, unknown> // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(cleanupTestApp)

/** Find DragSource inside Thoughts component. */
const findThoughtSource = (state: State, context: Context) =>
  wrapper.find(Thought).filterWhere(whereContext(state, context)).at(0).childAt(0)

/** Find DropTarget inside Thoughts component. */
const findThoughtSiblingTarget = (state: State, context: Context) => findThoughtSource(state, context).childAt(0)

/** Find DropTarget used for child drop inside Subthoughts. */
const findDropEndTarget = (state: State, context: Context) =>
  wrapper.find(Subthoughts).filterWhere(whereContext(state, context)).at(0).childAt(0)

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

  const targetFunction = {
    child: findDropEndTarget,
    sibling: findThoughtSiblingTarget,
  }

  const targetId = targetFunction[type](state, drop).instance().getHandlerId()
  backend.simulateHover([targetId])

  wrapper.update()

  backend.simulateDrop()
  backend.simulateEndDrag([sourceId])
}

it('drop as sibling', () => {
  store.dispatch(
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

it('drop as child (Drop end)', () => {
  store.dispatch(
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

it('prevent drop into descendants', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
        - c`,
    }),
    setCursorFirstMatchActionCreator(['a']),
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
