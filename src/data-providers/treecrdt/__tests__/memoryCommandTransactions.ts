import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import Thought from '../../../@types/Thought'
import ThoughtId from '../../../@types/ThoughtId'
import ThoughtspaceView from '../../../@types/ThoughtspaceView'
import Timestamp from '../../../@types/Timestamp'
import { HOME_TOKEN } from '../../../constants'
import hashThought from '../../../util/hashThought'
import { tsid } from '../../thoughtspaceSession'
import createMemoryThoughtspace from '../createMemoryThoughtspace'
import * as thoughtPayload from '../payload'

/** Captures public document contents without comparing reader function identities. */
const contents = (view: ThoughtspaceView) => ({
  thoughts: Object.fromEntries(
    Array.from(view.values(), thought => [
      thought.id,
      {
        ...thought,
        children: view.getChildren(thought.id),
        position: view.getPosition(thought.id),
      },
    ]),
  ),
  lexemeIndex: view.lexemeIndex,
})

const first: Thought = {
  id: '1'.repeat(32) as ThoughtId,
  parentId: HOME_TOKEN,
  created: 10 as Timestamp,
  lastUpdated: 20 as Timestamp,
  updatedBy: 'first-device',
  value: 'shared',
}
const second: Thought = {
  ...first,
  id: '2'.repeat(32) as ThoughtId,
  created: 5 as Timestamp,
  lastUpdated: 30 as Timestamp,
  updatedBy: 'second-device',
}

it('exposes canonical memberships and metadata to later commands in the same transaction', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
  const runtime = createMemoryThoughtspace(async () => persistent)
  try {
    await runtime.init({ storage: 'memory' })
    const before = (await persistent.ops.all()).length
    const result = runtime.transact(transaction => {
      const created = transaction.update({
        thoughtIndexUpdates: { [first.id]: first, [second.id]: second },
        movePlacements: { [first.id]: null, [second.id]: first.id },
      })
      const createdIds = transaction.operationIds
      expect(created.lexemeIndex[hashThought('shared')]).toEqual({
        contexts: [first.id, second.id],
        created: 5,
        lastUpdated: 30,
        updatedBy: 'second-device',
      })
      expect(created.lexemeIndex[hashThought(HOME_TOKEN)]).toBeUndefined()

      const renamed = transaction.update({
        thoughtIndexUpdates: {
          [first.id]: { ...created.getThought(first.id)!, value: 'renamed', lastUpdated: 40 as Timestamp },
        },
      })
      expect(renamed.lexemeIndex[hashThought('shared')]).toEqual({
        contexts: [second.id],
        created: 5,
        lastUpdated: 30,
        updatedBy: 'second-device',
      })
      expect(renamed.lexemeIndex[hashThought('renamed')]).toEqual({
        contexts: [first.id],
        created: 10,
        lastUpdated: 40,
        updatedBy: 'first-device',
      })

      const deleted = transaction.update({ thoughtIndexUpdates: { [second.id]: null } })
      expect(deleted.lexemeIndex[hashThought('shared')]).toBeUndefined()
      expect(deleted.getChildren(HOME_TOKEN)).toEqual([first.id])
      expect(createdIds).toHaveLength(2)
      return { thoughts: transaction.project(), operationIds: transaction.operationIds }
    })
    expect(runtime.project()).toBe(result.value.thoughts)
    await result.persisted
    expect((await persistent.ops.all()).slice(before).map(operation => operation.meta.id)).toEqual(
      result.value.operationIds,
    )
    expect(runtime.project().getThought(first.id)!).toMatchObject({ value: 'renamed' })
    expect(runtime.project().getThought(second.id)).toBeUndefined()
  } finally {
    await runtime.drop()
  }
})

it('reverts unpersisted document receipts synchronously and persists only committed compensating operations', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
  const runtime = createMemoryThoughtspace(async () => persistent)
  let rehydrated: ReturnType<typeof createMemoryThoughtspace> | undefined
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  try {
    await runtime.init({ storage: 'memory' })
    await runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: { [first.id]: first, [second.id]: second },
        movePlacements: { [first.id]: null, [second.id]: first.id },
      }),
    ).persisted
    const before = runtime.project()
    const persistedBefore = await persistent.ops.all()
    const append = persistent.ops.appendMany.bind(persistent.ops)
    vi.spyOn(persistent.ops, 'appendMany').mockImplementationOnce(async operations => {
      await gate
      return append(operations)
    })
    const edited = runtime.transact(transaction => {
      transaction.update({
        thoughtIndexUpdates: { [first.id]: { ...first, parentId: second.id, value: 'edited' } },
        movePlacements: { [first.id]: null },
      })
      return transaction.operationIds
    })
    const after = runtime.project()
    const acknowledged = vi.fn()
    expect(() =>
      runtime.transact(transaction => {
        transaction.revert(edited.value)
        expect(contents(transaction.project())).toEqual(contents(before))
        transaction.afterPersist(acknowledged)
        throw new Error('Cancel undo')
      }),
    ).toThrow('Cancel undo')
    expect(runtime.project()).toBe(after)

    const undone = runtime.transact(transaction => {
      const ids = transaction.revert(edited.value)
      expect(transaction.operationIds).toEqual(ids)
      return ids
    })
    expect(contents(runtime.project())).toEqual(contents(before))
    expect(await persistent.ops.all()).toEqual(persistedBefore)
    const redone = runtime.transact(transaction => transaction.revert(undone.value))
    expect(contents(runtime.project())).toEqual(contents(after))
    release()
    await redone.persisted
    await runtime.waitForIdle()
    expect(acknowledged).not.toHaveBeenCalled()
    expect((await persistent.ops.all()).slice(persistedBefore.length).map(operation => operation.meta.id)).toEqual([
      ...edited.value,
      ...undone.value,
      ...redone.value,
    ])

    const freshClient = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
    rehydrated = createMemoryThoughtspace(async () => freshClient)
    await freshClient.ops.appendMany(await persistent.ops.all())
    await rehydrated.init({ storage: 'memory' })
    expect(contents(rehydrated.project())).toEqual(contents(after))
  } finally {
    release()
    await rehydrated?.drop()
    await runtime.drop()
  }
})

it('preserves captured thought identity when composed moves restore the original parent', async () => {
  const runtime = createMemoryThoughtspace()
  try {
    await runtime.init({ storage: 'memory' })
    const before = runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: { [first.id]: first, [second.id]: second },
        movePlacements: { [first.id]: null, [second.id]: first.id },
      }),
    ).value
    const heldThought = before.getThought(first.id)!
    const restored = runtime.transact(transaction => {
      const moved = transaction.update({
        thoughtIndexUpdates: { [first.id]: { ...heldThought, parentId: second.id } },
        movePlacements: { [first.id]: null },
      })
      expect(Reflect.set(moved.getThought(first.id)!, 'parentId', HOME_TOKEN)).toBe(false)
      return transaction.update({
        thoughtIndexUpdates: { [first.id]: heldThought },
        movePlacements: { [first.id]: null },
      })
    })
    expect(before.getThought(first.id)).toBe(heldThought)
    expect(restored.value.getThought(first.id)).toBe(heldThought)
    await restored.persisted
  } finally {
    await runtime.drop()
  }
})

it('restores parents and sibling anchors before their dependents in an unordered batch', async () => {
  const runtime = createMemoryThoughtspace()
  const parent = { ...first, value: 'parent' }
  const branch = { ...second, parentId: parent.id, value: 'branch' }
  const children = Array.from({ length: 64 }, (_, index) => ({
    ...first,
    id: (index + 100).toString(16).padStart(32, '0') as ThoughtId,
    parentId: branch.id,
    value: `child ${index}`,
  }))
  const leaf = { ...first, id: '3'.repeat(32) as ThoughtId, parentId: children.at(-1)!.id, value: 'leaf' }
  const placements = {
    [parent.id]: null,
    [branch.id]: null,
    ...Object.fromEntries(children.map((child, index) => [child.id, children[index - 1]?.id ?? null])),
    [leaf.id]: null,
  }
  try {
    await runtime.init({ storage: 'memory' })
    await runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: Object.fromEntries(
          [parent, branch, ...children, leaf].map(thought => [thought.id, thought]),
        ),
        movePlacements: placements,
      }),
    ).persisted
    const before = runtime.project()
    const deleted = runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: Object.fromEntries([parent, branch, ...children, leaf].map(thought => [thought.id, null])),
      }),
    )
    expect(deleted.value.getThought(parent.id)).toBeUndefined()
    expect(deleted.value.getThought(leaf.id)).toBeUndefined()
    await deleted.persisted

    const restored = runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: Object.fromEntries(
          [leaf, ...[...children].reverse(), branch, parent].map(thought => [thought.id, thought]),
        ),
        movePlacements: placements,
      }),
    )
    expect(restored.value.getChildren(branch.id)).toEqual(children.map(child => child.id))
    expect(children.map(child => restored.value.getPosition(child.id))).toEqual(children.map((_, index) => index))
    expect(restored.value.getThought(leaf.id)!.parentId).toBe(children.at(-1)!.id)
    expect(contents(restored.value)).toEqual(contents(before))
    await restored.persisted
  } finally {
    await runtime.drop()
  }
})

it('rolls back an invalid placement before publishing, persisting, or acknowledging earlier composed writes', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
  const runtime = createMemoryThoughtspace(async () => persistent)
  const onChange = vi.fn()
  const acknowledged = vi.fn()
  try {
    await runtime.init({ storage: 'memory', onChange })
    await runtime.waitForIdle()
    onChange.mockClear()
    const before = runtime.project()
    const refs = await persistent.opRefs.all()
    expect(() =>
      runtime.transact(transaction => {
        const created = transaction.update({
          thoughtIndexUpdates: { [first.id]: first },
          movePlacements: { [first.id]: null },
        })
        expect(created.getThought(first.id)!.value).toBe('shared')
        transaction.afterPersist(acknowledged)
        // The root is not its own child, so it cannot anchor a new child within itself.
        transaction.update({
          thoughtIndexUpdates: { [second.id]: second },
          movePlacements: { [second.id]: HOME_TOKEN },
        })
      }),
    ).toThrow('afterId must name another child of the destination parent')

    expect(runtime.project()).toBe(before)
    await runtime.waitForIdle()
    expect(await persistent.opRefs.all()).toEqual(refs)
    expect(runtime.project().getThought(first.id)).toBeUndefined()
    expect(runtime.project().getThought(second.id)).toBeUndefined()
    expect(onChange).not.toHaveBeenCalled()
    expect(acknowledged).not.toHaveBeenCalled()

    const accepted = runtime.transact(transaction =>
      transaction.update({ thoughtIndexUpdates: { [first.id]: first }, movePlacements: { [first.id]: null } }),
    )
    await accepted.persisted
    expect(accepted.value.getThought(first.id)!.value).toBe('shared')
  } finally {
    await runtime.drop()
  }
})

it('updates attribute lookup and lexeme metadata incrementally to the same result as fresh hydration', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
  const runtime = createMemoryThoughtspace(async () => persistent)
  const attribute: Thought = { ...first, id: '3'.repeat(32) as ThoughtId, parentId: first.id, value: '=pin' }
  let rehydrated: ReturnType<typeof createMemoryThoughtspace> | undefined
  try {
    await runtime.init({ storage: 'memory' })
    await runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: {
          [first.id]: { ...first, created: 1 as Timestamp, lastUpdated: 40 as Timestamp },
          [second.id]: second,
          [attribute.id]: attribute,
        },
        movePlacements: { [first.id]: null, [second.id]: first.id, [attribute.id]: null },
      }),
    ).persisted
    const initial = runtime.project()
    expect(initial.getChildren(first.id)).toEqual([attribute.id])
    expect(initial.getThought(attribute.id)!.value).toBe('=pin')
    const decoded = vi.spyOn(thoughtPayload, 'decodeThoughtPayload')
    const renamed = runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: { [attribute.id]: { ...initial.getThought(attribute.id)!, value: '=note' } },
      }),
    )
    expect(decoded).toHaveBeenCalledTimes(1)
    expect(renamed.value.getChildren(first.id)).toEqual([attribute.id])
    expect(renamed.value.getThought(attribute.id)!.value).toBe('=note')
    expect(renamed.value.getThought(first.id)).toBe(initial.getThought(first.id))
    expect(renamed.value.getThought(second.id)!).toBe(initial.getThought(second.id)!)
    expect(renamed.value.lexemeIndex[hashThought('shared')]).toBe(initial.lexemeIndex[hashThought('shared')])

    decoded.mockClear()
    const moved = runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: { [attribute.id]: { ...renamed.value.getThought(attribute.id)!, parentId: second.id } },
        movePlacements: { [attribute.id]: null },
      }),
    )
    expect(decoded).not.toHaveBeenCalled()
    expect(moved.value.getChildren(first.id)).toEqual([])
    expect(moved.value.getChildren(second.id)).toEqual([attribute.id])
    const deleted = runtime.transact(transaction => transaction.update({ thoughtIndexUpdates: { [first.id]: null } }))
    expect(deleted.value.lexemeIndex[hashThought('shared')]).toEqual({
      contexts: [second.id],
      created: 5,
      lastUpdated: 30,
      updatedBy: 'second-device',
    })
    await deleted.persisted
    await runtime.waitForIdle()
    decoded.mockRestore()

    const freshClient = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
    rehydrated = createMemoryThoughtspace(async () => freshClient)
    await freshClient.ops.appendMany(await persistent.ops.all())
    await rehydrated.init({ storage: 'memory' })
    expect(contents(rehydrated.project())).toEqual(contents(runtime.project()))
  } finally {
    await rehydrated?.drop()
    await runtime.drop()
  }
})
