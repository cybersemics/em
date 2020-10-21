import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'

import Thought from '../Thought'
import Subthoughts from '../Subthoughts'

import { equalArrays, pathToContext } from '../../util'
import { exportContext } from '../../selectors'
import { importText } from '../../action-creators'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'

/** A filterWhere predicate that returns true for Thought or Subthought nodes that match the given context. */
const whereContext = context => node => equalArrays(pathToContext(node.props().simplePath), context)

let wrapper = null // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(async () => {
  await cleanupTestApp()
  wrapper = null
})

/** Find DragSource inside Thoughts component. */
const findThoughtSource = context => wrapper.find(Thought).filterWhere(whereContext(context)).at(0).childAt(0)

/** Find DropTarget inside Thoughts component. */
const findThoughtSiblingTarget = context => findThoughtSource(context).childAt(0)

/** Find DropTarget used for child drop inside Subthoughts. */
const findDropEndTarget = context => wrapper.find(Subthoughts).filterWhere(whereContext(context)).at(0).childAt(0)

/** Simulate Drag And Drop.
 *
 * @param source - Context which will be used to select proper drag element.
 * @param drop - Context which will be used to select drop target.
 * @param type - Type of drop target i.e child or sibling.
 */
const simulateDragAndDrop = ({ source, drop, type }) => {

  const backend = document.DND.getManager().getBackend()
  const sourceId = findThoughtSource(source).instance().getHandlerId()
  backend.simulateBeginDrag([sourceId])
  wrapper.update()

  const targetFunction = {
    child: findDropEndTarget,
    sibling: findThoughtSiblingTarget
  }

  const targetId = targetFunction[type](drop).instance().getHandlerId()
  backend.simulateHover([targetId])

  wrapper.update()

  backend.simulateDrop()
  backend.simulateEndDrag([sourceId])
}

it('drop as sibling', async () => {
  store.dispatch(importText(RANKED_ROOT, `
  - a
  - b
  - c
  - d
 `))

  wrapper.update()

  simulateDragAndDrop({
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
  store.dispatch(importText(RANKED_ROOT, `
  - a
  - b
  - c
  - d
 `))

  wrapper.update()

  simulateDragAndDrop({
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
  store.dispatch(importText(RANKED_ROOT, `
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

  wrapper.update()

  simulateDragAndDrop({
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
