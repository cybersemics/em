import type { OperationId } from '@treecrdt/interface'
import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { createMemoryClient } from '@treecrdt/wasm/memory'
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

it('notifies subscribers once per completed local change and stops notifying an unsubscribed listener', async () => {
  const runtime = createMemoryThoughtspace()
  const onCommit = vi.fn()
  const subscribed = vi.fn()
  const otherSubscriber = vi.fn()
  const unsubscribe = runtime.subscribe(subscribed)
  const unsubscribeOther = runtime.subscribe(otherSubscriber)
  try {
    await runtime.init({ storage: 'memory' })
    const unchanged = runtime.transact(transaction => transaction.project(), onCommit)
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(unchanged.value, unchanged.persisted)
    expect(subscribed).not.toHaveBeenCalled()
    expect(otherSubscriber).not.toHaveBeenCalled()

    const committed = runtime.transact(transaction => {
      transaction.update({ thoughtIndexUpdates: { [first.id]: first }, movePlacements: { [first.id]: null } })
      const completed = transaction.update({ thoughtIndexUpdates: { [first.id]: { ...first, value: 'completed' } } })
      expect(subscribed).not.toHaveBeenCalled()
      expect(otherSubscriber).not.toHaveBeenCalled()
      return completed
    })

    expect(subscribed).toHaveBeenCalledTimes(1)
    expect(otherSubscriber).toHaveBeenCalledTimes(1)
    expect(runtime.project()).toBe(committed.value)
    await committed.persisted
    await runtime.waitForIdle()
    expect(subscribed).toHaveBeenCalledTimes(1)

    const heldThought = committed.value.getThought(first.id)!
    unsubscribe()
    const edited = runtime.transact(transaction =>
      transaction.update({ thoughtIndexUpdates: { [first.id]: { ...first, value: 'edited' } } }),
    )
    expect(subscribed).toHaveBeenCalledTimes(1)
    expect(otherSubscriber).toHaveBeenCalledTimes(2)
    expect(runtime.project()).toBe(edited.value)
    expect(heldThought.value).toBe('completed')
    expect(committed.value.getThought(first.id)!.value).toBe('edited')
    expect(edited.value.getThought(first.id)!.value).toBe('edited')
    await edited.persisted
  } finally {
    unsubscribe()
    unsubscribeOther()
    await runtime.drop()
  }
})

it('preserves persistence order and latest reads when a subscriber authors another transaction', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid })
  const runtime = createMemoryThoughtspace(async () => persistent)
  const observed: ThoughtspaceView[] = []
  const phases: string[] = []
  let captured: Thought
  let nested: { value: readonly OperationId[]; persisted: Promise<void> }
  try {
    await runtime.init({ storage: 'memory' })
    const before = (await persistent.ops.all()).length
    const unsubscribeWriter = runtime.subscribe(() => {
      unsubscribeWriter()
      phases.push('listener: shared')
      nested = runtime.transact(
        transaction => {
          transaction.update({ thoughtIndexUpdates: { [first.id]: { ...first, value: 'reentrant edit' } } })
          return transaction.operationIds
        },
        () => phases.push('commit: reentrant edit'),
      )
    })
    const unsubscribeObserver = runtime.subscribe(() => observed.push(runtime.project()))
    const initial = runtime.transact(
      transaction => {
        transaction.update({ thoughtIndexUpdates: { [first.id]: first }, movePlacements: { [first.id]: null } })
        return transaction.operationIds
      },
      () => {
        captured = runtime.project().getThought(first.id)!
        phases.push('commit: shared')
      },
    )
    unsubscribeObserver()

    expect(observed.map(view => view.getThought(first.id)!.value)).toEqual(['reentrant edit', 'reentrant edit'])
    expect(captured!.value).toBe('shared')
    expect(phases).toEqual(['commit: shared', 'listener: shared', 'commit: reentrant edit'])
    expect(runtime.project()).toBe(observed[1])
    await Promise.all([initial.persisted, nested!.persisted])
    await runtime.waitForIdle()
    expect((await persistent.ops.all()).slice(before).map(operation => operation.meta.id)).toEqual([
      ...initial.value,
      ...nested!.value,
    ])
  } finally {
    await runtime.drop()
  }
})

it('stages reentrant commit callbacks synchronously before invalidating latest document reads', async () => {
  const runtime = createMemoryThoughtspace()
  const phases: string[] = []
  const unsubscribe = runtime.subscribe(() => phases.push(`listener: ${runtime.project().getThought(first.id)!.value}`))
  try {
    await runtime.init({ storage: 'memory' })
    runtime.transact(
      transaction =>
        transaction.update({ thoughtIndexUpdates: { [first.id]: first }, movePlacements: { [first.id]: null } }),
      value => {
        phases.push(`commit: ${value.getThought(first.id)!.value}`)
        runtime.transact(
          transaction =>
            transaction.update({ thoughtIndexUpdates: { [first.id]: { ...first, value: 'reentrant edit' } } }),
          nested => phases.push(`commit: ${nested.getThought(first.id)!.value}`),
        )
        phases.push('outer callback completed')
      },
    )

    expect(phases).toEqual([
      'commit: shared',
      'commit: reentrant edit',
      'listener: reentrant edit',
      'outer callback completed',
      'listener: reentrant edit',
    ])
    expect(runtime.project().getThought(first.id)!.value).toBe('reentrant edit')
    await runtime.waitForIdle()
  } finally {
    unsubscribe()
    await runtime.drop()
  }
})

it('publishes and persists committed changes when their commit callback throws', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid })
  const runtime = createMemoryThoughtspace(async () => persistent)
  const subscribed = vi.fn()
  const unsubscribe = runtime.subscribe(subscribed)
  const failure = new Error('Commit consumer failed')
  let committed: { value: ThoughtspaceView; persisted: Promise<void> }
  try {
    await runtime.init({ storage: 'memory' })
    expect(() =>
      runtime.transact(
        transaction =>
          transaction.update({ thoughtIndexUpdates: { [first.id]: first }, movePlacements: { [first.id]: null } }),
        (value, persisted) => {
          committed = { value, persisted }
          throw failure
        },
      ),
    ).toThrow(failure)

    expect(subscribed).toHaveBeenCalledTimes(1)
    expect(runtime.project()).toBe(committed!.value)
    await committed!.persisted
    await runtime.waitForIdle()
    expect(thoughtPayload.decodeThoughtPayload((await (await persistent.tree.get(first.id))!.payload())!).value).toBe(
      'shared',
    )

    const edited = runtime.transact(transaction =>
      transaction.update({ thoughtIndexUpdates: { [first.id]: { ...first, value: 'still editable' } } }),
    )
    expect(subscribed).toHaveBeenCalledTimes(2)
    expect(edited.value.getThought(first.id)!.value).toBe('still editable')
    await edited.persisted
  } finally {
    unsubscribe()
    await runtime.drop()
  }
})

it('exposes canonical memberships and metadata to later commands in the same transaction', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid })
  const runtime = createMemoryThoughtspace(async () => persistent)
  let previous: ThoughtspaceView
  try {
    await runtime.init({ storage: 'memory' })
    const before = (await persistent.ops.all()).length
    const result = runtime.transact(transaction => {
      const empty = transaction.capturePrevious()
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
      previous = transaction.capturePrevious()

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
      expect(empty.getThought(first.id)).toBeUndefined()
      expect(previous.getThought(first.id)?.value).toBe('shared')
      expect(previous.getThought(second.id)?.value).toBe('shared')
      expect(previous.getChildren(HOME_TOKEN)).toEqual([first.id, second.id])
      expect(previous.lexemeIndex[hashThought('shared')].contexts).toEqual([first.id, second.id])
      expect(createdIds).toHaveLength(2)
      return { thoughts: transaction.project(), operationIds: transaction.operationIds }
    })
    expect(runtime.project()).toBe(result.value.thoughts)
    expect(() => previous.getThought(first.id)).toThrow('expired')
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
  const persistent = await createTreecrdtClient({ docId: tsid })
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
    const before = contents(runtime.project())
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
    const editedContents = contents(after)
    const acknowledged = vi.fn()
    expect(() =>
      runtime.transact(transaction => {
        transaction.revert(edited.value)
        expect(contents(transaction.project())).toEqual(before)
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
    expect(contents(runtime.project())).toEqual(before)
    expect(await persistent.ops.all()).toEqual(persistedBefore)
    const redone = runtime.transact(transaction => transaction.revert(undone.value))
    expect(contents(runtime.project())).toEqual(editedContents)
    release()
    await redone.persisted
    await runtime.waitForIdle()
    expect(acknowledged).not.toHaveBeenCalled()
    expect((await persistent.ops.all()).slice(persistedBefore.length).map(operation => operation.meta.id)).toEqual([
      ...edited.value,
      ...undone.value,
      ...redone.value,
    ])

    const freshClient = await createTreecrdtClient({ docId: tsid })
    rehydrated = createMemoryThoughtspace(async () => freshClient)
    await freshClient.ops.appendMany(await persistent.ops.all())
    await rehydrated.init({ storage: 'memory' })
    expect(contents(rehydrated.project())).toEqual(editedContents)
  } finally {
    release()
    await rehydrated?.drop()
    await runtime.drop()
  }
})

it('keeps captured thought values immutable when composed moves restore the original parent', async () => {
  const memory = await createMemoryClient()
  const runtime = createMemoryThoughtspace(undefined, async () => memory)
  try {
    await runtime.init({ storage: 'memory' })
    const before = runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: { [first.id]: first, [second.id]: second },
        movePlacements: { [first.id]: null, [second.id]: first.id },
      }),
    ).value
    const heldThought = before.getThought(first.id)!
    const reads = vi.spyOn(memory, 'get')
    const restored = runtime.transact(transaction => {
      const moved = transaction.update({
        thoughtIndexUpdates: { [first.id]: { ...heldThought, parentId: second.id } },
        movePlacements: { [first.id]: null },
      })
      expect(Reflect.set(moved.getThought(first.id)!, 'parentId', HOME_TOKEN)).toBe(false)
      reads.mockClear()
      return transaction.update({
        thoughtIndexUpdates: { [first.id]: heldThought },
        movePlacements: { [first.id]: null },
      })
    })
    // The cumulative batch drops net-reverted rows; their earlier before values supply projection without rereads.
    expect(reads).not.toHaveBeenCalled()
    expect(heldThought.parentId).toBe(HOME_TOKEN)
    expect(restored.value.getThought(first.id)).toEqual(heldThought)
    expect(restored.value.getChildren(HOME_TOKEN)).toEqual([first.id, second.id])
    expect(restored.value.getChildren(second.id)).toEqual([])
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
    const before = contents(runtime.project())
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
    expect(contents(restored.value)).toEqual(before)
    await restored.persisted
  } finally {
    await runtime.drop()
  }
})

it('rolls back an invalid placement before publishing, persisting, or acknowledging earlier composed writes', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid })
  const runtime = createMemoryThoughtspace(async () => persistent)
  const onCommit = vi.fn()
  const subscribed = vi.fn()
  const unsubscribe = runtime.subscribe(subscribed)
  const acknowledged = vi.fn()
  try {
    await runtime.init({ storage: 'memory' })
    await runtime.waitForIdle()
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
      }, onCommit),
    ).toThrow('afterId must name another child of the destination parent')

    expect(runtime.project()).toBe(before)
    await runtime.waitForIdle()
    expect(await persistent.opRefs.all()).toEqual(refs)
    expect(runtime.project().getThought(first.id)).toBeUndefined()
    expect(runtime.project().getThought(second.id)).toBeUndefined()
    expect(onCommit).not.toHaveBeenCalled()
    expect(subscribed).not.toHaveBeenCalled()
    expect(acknowledged).not.toHaveBeenCalled()

    const accepted = runtime.transact(transaction =>
      transaction.update({ thoughtIndexUpdates: { [first.id]: first }, movePlacements: { [first.id]: null } }),
    )
    await accepted.persisted
    expect(accepted.value.getThought(first.id)!.value).toBe('shared')
  } finally {
    unsubscribe()
    await runtime.drop()
  }
})

it('updates attribute lookup and lexeme metadata incrementally to the same result as fresh hydration', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid })
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
    const renamed = runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: { [attribute.id]: { ...initial.getThought(attribute.id)!, value: '=note' } },
      }),
    )
    expect(renamed.value.getChildren(first.id)).toEqual([attribute.id])
    expect(renamed.value.getThought(attribute.id)!.value).toBe('=note')
    expect(renamed.value.getThought(first.id)).toBe(initial.getThought(first.id))
    expect(renamed.value.getThought(second.id)!).toBe(initial.getThought(second.id)!)
    expect(renamed.value.lexemeIndex[hashThought('shared')]).toBe(initial.lexemeIndex[hashThought('shared')])

    const moved = runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: { [attribute.id]: { ...renamed.value.getThought(attribute.id)!, parentId: second.id } },
        movePlacements: { [attribute.id]: null },
      }),
    )
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

    const freshClient = await createTreecrdtClient({ docId: tsid })
    rehydrated = createMemoryThoughtspace(async () => freshClient)
    await freshClient.ops.appendMany(await persistent.ops.all())
    await rehydrated.init({ storage: 'memory' })
    expect(contents(rehydrated.project())).toEqual(contents(runtime.project()))
  } finally {
    await rehydrated?.drop()
    await runtime.drop()
  }
})
