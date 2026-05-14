import type Index from '../../../../@types/IndexType'
import type Thought from '../../../../@types/Thought'
import type ThoughtId from '../../../../@types/ThoughtId'
import type Timestamp from '../../../../@types/Timestamp'
import { HOME_TOKEN, ROOT_PARENT_ID } from '../../../../constants'
import initialState from '../../../../util/initialState'
import type { DataProvider } from '../../../DataProvider'
import { refreshThoughtsFromMaterializationChanges } from '../materializationThoughtUpdates'

const A_ID = 'a-id' as ThoughtId
const B_ID = 'b-id' as ThoughtId
const C_ID = 'c-id' as ThoughtId

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

/** Creates the minimal DataProvider surface needed by refreshThoughtsFromMaterializationChanges. */
const fakeProvider = (thoughts: Index<Thought>): DataProvider =>
  ({
    getThoughtById: async (id: ThoughtId) => thoughts[id],
    getLexemeById: async () => undefined,
  }) as unknown as DataProvider

it('projects TreeCRDT sibling order into compatibility ranks', async () => {
  const oldParent = thought(HOME_TOKEN, HOME_TOKEN, 0, ROOT_PARENT_ID, [A_ID, B_ID, C_ID])
  const newParent = thought(HOME_TOKEN, HOME_TOKEN, 0, ROOT_PARENT_ID, [C_ID, A_ID, B_ID])
  const thoughtA = thought(A_ID, 'a', 0, HOME_TOKEN)
  const thoughtB = thought(B_ID, 'b', 1, HOME_TOKEN)
  const thoughtC = thought(C_ID, 'c', 2, HOME_TOKEN)
  const state = {
    ...initialState(),
    thoughts: {
      thoughtIndex: {
        [HOME_TOKEN]: oldParent,
        [A_ID]: thoughtA,
        [B_ID]: thoughtB,
        [C_ID]: thoughtC,
      },
      lexemeIndex: {},
    },
  }

  const result = await refreshThoughtsFromMaterializationChanges(
    [{ kind: 'move', node: C_ID, parentBefore: HOME_TOKEN, parentAfter: HOME_TOKEN }],
    fakeProvider({
      [HOME_TOKEN]: newParent,
      [A_ID]: thoughtA,
      [B_ID]: thoughtB,
      [C_ID]: thoughtC,
    }),
    state,
  )

  const updates = Object.fromEntries(result.thoughts.map(nextThought => [nextThought.id, nextThought]))

  expect(Object.values(updates[HOME_TOKEN].childrenMap)).toEqual([C_ID, A_ID, B_ID])
  expect(updates[C_ID].rank).toBe(0)
  expect(updates[A_ID].rank).toBe(1)
  expect(updates[B_ID].rank).toBe(2)
})
