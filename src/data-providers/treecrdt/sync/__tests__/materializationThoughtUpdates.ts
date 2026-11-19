import type Index from '../../../../@types/IndexType'
import type Thought from '../../../../@types/Thought'
import type ThoughtId from '../../../../@types/ThoughtId'
import type Timestamp from '../../../../@types/Timestamp'
import { HOME_TOKEN, ROOT_PARENT_ID } from '../../../../constants'
import refreshThoughtsFromMaterializationChanges from '../materializationThoughtUpdates'

const A_ID = 'a-id' as ThoughtId
const B_ID = 'b-id' as ThoughtId
const C_ID = 'c-id' as ThoughtId
const LEFT_ID = 'left-id' as ThoughtId
const RIGHT_ID = 'right-id' as ThoughtId

/** Creates a childrenMap that preserves the provided insertion order for Object.values. */
const childrenMap = (children: ThoughtId[]): Index<ThoughtId> =>
  Object.fromEntries(children.map(childId => [childId, childId]))

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
  childrenMap: childrenMap(children),
  created: 0 as Timestamp,
  lastUpdated: 0 as Timestamp,
  updatedBy: '',
})

/** Creates the minimal thoughtspace provider surface needed by refreshThoughtsFromMaterializationChanges. */
const fakeProvider = (thoughts: Index<Thought>) => ({ getThoughtById: async (id: ThoughtId) => thoughts[id] })

it('projects TreeCRDT sibling order into compatibility ranks', async () => {
  const updates = await refreshThoughtsFromMaterializationChanges(
    [{ kind: 'move', node: C_ID, parentBefore: HOME_TOKEN, parentAfter: HOME_TOKEN }],
    fakeProvider({
      [HOME_TOKEN]: thought(HOME_TOKEN, HOME_TOKEN, 0, ROOT_PARENT_ID, [C_ID, A_ID, B_ID]),
      [A_ID]: thought(A_ID, 'a', 0, HOME_TOKEN),
      [B_ID]: thought(B_ID, 'b', 1, HOME_TOKEN),
      [C_ID]: thought(C_ID, 'c', 2, HOME_TOKEN),
    }),
  )

  expect(Object.values(updates[HOME_TOKEN]!.childrenMap)).toEqual([C_ID, A_ID, B_ID])
  expect(updates[C_ID]?.rank).toBe(0)
  expect(updates[A_ID]?.rank).toBe(1)
  expect(updates[B_ID]?.rank).toBe(2)
})

it('projects TreeCRDT sibling order for both parents after a cross-parent move', async () => {
  const updates = await refreshThoughtsFromMaterializationChanges(
    [{ kind: 'move', node: A_ID, parentBefore: LEFT_ID, parentAfter: RIGHT_ID }],
    fakeProvider({
      [LEFT_ID]: thought(LEFT_ID, 'left', 0, HOME_TOKEN, [B_ID]),
      [RIGHT_ID]: thought(RIGHT_ID, 'right', 1, HOME_TOKEN, [C_ID, A_ID]),
      [A_ID]: thought(A_ID, 'a', 1, RIGHT_ID),
      [B_ID]: thought(B_ID, 'b', 1, LEFT_ID),
      [C_ID]: thought(C_ID, 'c', 0, RIGHT_ID),
    }),
  )

  expect(Object.values(updates[LEFT_ID]!.childrenMap)).toEqual([B_ID])
  expect(Object.values(updates[RIGHT_ID]!.childrenMap)).toEqual([C_ID, A_ID])
  expect(updates[B_ID]?.rank).toBe(0)
  expect(updates[C_ID]?.rank).toBe(0)
  expect(updates[A_ID]).toMatchObject({
    parentId: RIGHT_ID,
    rank: 1,
  })
})

it('keeps a thought restored after deletion in the same buffered refresh', async () => {
  const restored = thought(A_ID, 'a', 0, HOME_TOKEN)
  const result = await refreshThoughtsFromMaterializationChanges(
    [
      { kind: 'delete', node: A_ID, parentBefore: HOME_TOKEN },
      { kind: 'restore', node: A_ID, parentAfter: HOME_TOKEN, payload: null },
    ],
    fakeProvider({ [A_ID]: restored }),
  )
  expect(result).toEqual({ [A_ID]: restored })
})
