import { store } from '../../store'
import * as db from '../../db'
import createTestApp from '../../test-helpers/createTestApp'

import Thought from '../Thought'
import Subthoughts from '../Subthoughts'

import { equalArrays, pathToContext } from '../../util'
import { exportContext } from '../../selectors'
import { importText } from '../../action-creators'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'

/** A filterWhere predicate that returns true for Thought or Subthought nodes that match the given context. */
const whereContext = context => node => equalArrays(pathToContext(node.props().thoughtsRanked), context)

beforeEach(async () => {
  await createTestApp()
})

afterEach(async () => {
  store.dispatch({ type: 'clear' })
  await db.clearAll()
})

/** Find DragSource inside Thoughts component. */
const findThoughtSource = context => document.wrapper.find(Thought).filterWhere(whereContext(context)).at(0).childAt(0)

/** Find DropTarget inside Thoughts component. */
const findThoughtSiblingTarget = context => findThoughtSource(context).childAt(0)

/** Find DropTarget used for child drop inside Subthoughts. */
const findDropEndTarget = context => document.wrapper.find(Subthoughts).filterWhere(whereContext(context)).at(0).childAt(0)

/** Simulate Drag And Drop.
 *
 * @param backend - Test backend for react dnd.
 * @param source - Context which will be used to select proper drag element.
 * @param drop - Context which will be used to select drop target.
 * @param type - Type of drop target i.e child or sibling.
 */
const simulateDragAndDrop = (backend, { source, drop, type }) => {

  const sourceId = findThoughtSource(source).instance().getHandlerId()
  backend.simulateBeginDrag([sourceId])
  document.wrapper.update()

  const targetFunction = {
    child: findDropEndTarget,
    sibling: findThoughtSiblingTarget
  }

  const targetId = targetFunction[type](drop).instance().getHandlerId()
  backend.simulateHover([targetId])

  document.wrapper.update()

  backend.simulateDrop()
  backend.simulateEndDrag([sourceId])
}

it('drop as sibling', async () => {
  await store.dispatch(importText(RANKED_ROOT, `
  - a
  - b
  - c
  - d
 `))

  document.wrapper.update()
  const backend = document.DND.getManager().getBackend()

  simulateDragAndDrop(backend, {
    source: ['a'],
    drop: ['c'],
    type: 'sibling'
  })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plaintext')

  const expectedExport = `- ${ROOT_TOKEN}
  - b
  - a
  - c
  - d`

  expect(exported).toEqual(expectedExport)
})

it('drop as child (Drop end)', async () => {
  await store.dispatch(importText(RANKED_ROOT, `
  - a
  - b
  - c
  - d
 `))

  document.wrapper.update()
  const backend = document.DND.getManager().getBackend()

  simulateDragAndDrop(backend, {
    source: ['b'],
    drop: ['a'],
    type: 'child'
  })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plaintext')

  const expectedExport = `- ${ROOT_TOKEN}
  - a
    - b
  - c
  - d`

  expect(exported).toEqual(expectedExport)
})

it('prevent drop into descendants', async () => {
  await store.dispatch(importText(RANKED_ROOT, `
  - a
    - b
  - c`))

  store.dispatch({
    type: 'setCursor',
    thoughtsRanked: [
      {
        value: 'a',
        rank: 0
      }
    ]
  })

  document.wrapper.update()
  const backend = document.DND.getManager().getBackend()

  simulateDragAndDrop(backend, {
    source: ['a'],
    drop: ['a', 'b'],
    type: 'child'
  })

  const exported = exportContext(store.getState(), [ROOT_TOKEN], 'text/plaintext')

  const expectedExport = `- ${ROOT_TOKEN}
  - a
    - b
  - c`

  expect(exported).toEqual(expectedExport)
})
