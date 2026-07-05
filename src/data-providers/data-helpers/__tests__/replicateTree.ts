import Thought from '../../../@types/Thought'
import ThoughtId from '../../../@types/ThoughtId'
import Timestamp from '../../../@types/Timestamp'
import { replicateChildren, replicateThought } from '../../yjs/thoughtspace'
import replicateTree from '../replicateTree'

vi.mock('../../yjs/thoughtspace', () => ({
  replicateChildren: vi.fn(),
  replicateThought: vi.fn(),
}))

/** Creates a thought for replicateTree tests. */
const createThought = (id: string, parentId: string, value = id): Thought => ({
  childrenMap: {},
  created: 0 as Timestamp,
  id: id as ThoughtId,
  lastUpdated: 0 as Timestamp,
  parentId: parentId as ThoughtId,
  rank: 0,
  updatedBy: 'test',
  value,
})

describe('replicateTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(replicateThought).mockImplementation(async id => createThought(id, '__ROOT__'))
    vi.mocked(replicateChildren).mockImplementation(async id => {
      if (id === 'a') return [createThought('b', 'a'), createThought('d', 'a')]
      if (id === 'b') return [createThought('c', 'b')]
      return []
    })
  })

  it('limits replication to the starting thought when maxDepth is 0', async () => {
    const replicated = await replicateTree('a' as ThoughtId, { maxDepth: 0 }).promise

    expect(Object.keys(replicated)).toEqual(['a'])
  })

  it('limits replication to one descendant level when maxDepth is 1', async () => {
    const replicated = await replicateTree('a' as ThoughtId, { maxDepth: 1 }).promise

    expect(Object.keys(replicated).sort()).toEqual(['a', 'b', 'd'])
  })

  it('replicates the full subtree by default', async () => {
    const replicated = await replicateTree('a' as ThoughtId).promise

    expect(Object.keys(replicated).sort()).toEqual(['a', 'b', 'c', 'd'])
  })
})
