import type Index from '../../../../@types/IndexType'
import type Thought from '../../../../@types/Thought'
import type ThoughtId from '../../../../@types/ThoughtId'
import type Timestamp from '../../../../@types/Timestamp'
import { HOME_TOKEN, ROOT_PARENT_ID } from '../../../../constants'
import type { DataProvider } from '../../../DataProvider'
import applyMaterializedThoughtsToStore from '../applyMaterializedThoughtsToStore'

const A_ID = 'a-id' as ThoughtId
const B_ID = 'b-id' as ThoughtId
const C_ID = 'c-id' as ThoughtId
const LEFT_ID = 'left-id' as ThoughtId
const RIGHT_ID = 'right-id' as ThoughtId

/** Creates a minimal Thought for materialization projection tests. */
const thought = (
  id: ThoughtId,
  value: string,
  rank: number,
  parentId: ThoughtId,
  children: ThoughtId[] = [],
): Thought => ({
  id,
  value,
  rank,
  parentId,
  childrenMap: Object.fromEntries(children.map(childId => [childId, childId])),
  created: 0 as Timestamp,
  lastUpdated: 0 as Timestamp,
  updatedBy: '',
})

/** Supplies stored thoughts to the committed publication under test. */
const fakeProvider = (thoughts: Index<Thought>): Pick<DataProvider, 'getThoughtById' | 'getLexemesByIds'> => ({
  getThoughtById: vi.fn(async (id: ThoughtId) => thoughts[id]),
  getLexemesByIds: async () => [],
})

it('refreshes both parents and affected siblings without reading ancestors after a cross-parent move', async () => {
  const newLeft = thought(LEFT_ID, 'left', 0, HOME_TOKEN, [B_ID])
  const newRight = thought(RIGHT_ID, 'right', 1, HOME_TOKEN, [C_ID, A_ID])
  const thoughtANew = thought(A_ID, 'a', 1, RIGHT_ID)
  const thoughtB = thought(B_ID, 'b', 0, LEFT_ID)
  const thoughtC = thought(C_ID, 'c', 0, RIGHT_ID)
  const provider = fakeProvider({
    [HOME_TOKEN]: thought(HOME_TOKEN, HOME_TOKEN, 0, ROOT_PARENT_ID, [LEFT_ID, RIGHT_ID]),
    [LEFT_ID]: newLeft,
    [RIGHT_ID]: newRight,
    [A_ID]: thoughtANew,
    [B_ID]: thoughtB,
    [C_ID]: thoughtC,
  })
  const onCommit = vi.fn()
  await applyMaterializedThoughtsToStore({
    bridge: { getGeneration: () => 0, onCommit },
    db: provider,
    pending: [
      {
        event: { headSeq: 1, changes: [{ kind: 'move', node: A_ID, parentBefore: LEFT_ID, parentAfter: RIGHT_ID }] },
        keys: [],
        generation: 0,
      },
    ],
  })

  expect(onCommit).toHaveBeenCalledExactlyOnceWith({
    thoughtIndex: { [LEFT_ID]: newLeft, [RIGHT_ID]: newRight, [A_ID]: thoughtANew, [B_ID]: thoughtB, [C_ID]: thoughtC },
    lexemeIndex: {},
    writeIds: undefined,
  })
  expect(Object.values(onCommit.mock.calls[0][0].thoughtIndex[LEFT_ID].childrenMap)).toEqual([B_ID])
  expect(Object.values(onCommit.mock.calls[0][0].thoughtIndex[RIGHT_ID].childrenMap)).toEqual([C_ID, A_ID])
  expect(provider.getThoughtById).toHaveBeenCalledTimes(5)
})

it('refreshes a renamed attribute and its parent without reading unchanged siblings', async () => {
  const attribute = thought(A_ID, '=pin', 0, LEFT_ID)
  const parent = {
    ...thought(LEFT_ID, 'left', 0, HOME_TOKEN),
    childrenMap: { '=pin': A_ID, [B_ID]: B_ID },
  }
  const provider = fakeProvider({
    [LEFT_ID]: parent,
    [A_ID]: attribute,
    [B_ID]: thought(B_ID, 'b', 1, LEFT_ID),
  })

  const onCommit = vi.fn()
  await applyMaterializedThoughtsToStore({
    bridge: { getGeneration: () => 0, onCommit },
    db: provider,
    pending: [
      {
        event: { headSeq: 1, changes: [{ kind: 'payload', node: A_ID, payload: null }] },
        keys: [],
        generation: 0,
      },
    ],
  })

  expect(onCommit).toHaveBeenCalledExactlyOnceWith({
    thoughtIndex: { [A_ID]: attribute, [LEFT_ID]: parent },
    lexemeIndex: {},
    writeIds: undefined,
  })
  expect(provider.getThoughtById).toHaveBeenCalledTimes(2)
})
