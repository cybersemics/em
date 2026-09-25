import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import Thought from '../../../@types/Thought'
import ThoughtId from '../../../@types/ThoughtId'
import Timestamp from '../../../@types/Timestamp'
import { HOME_TOKEN } from '../../../constants'
import hashThought from '../../../util/hashThought'
import { tsid } from '../../thoughtspaceSession'
import createMemoryThoughtspace from '../createMemoryThoughtspace'
import * as thoughtPayload from '../payload'

const first: Thought = {
  id: '1'.repeat(32) as ThoughtId,
  parentId: HOME_TOKEN,
  childrenMap: {},
  created: 10 as Timestamp,
  lastUpdated: 20 as Timestamp,
  updatedBy: 'first-device',
  rank: 0,
  value: 'shared',
}
const second: Thought = {
  ...first,
  id: '2'.repeat(32) as ThoughtId,
  created: 5 as Timestamp,
  lastUpdated: 30 as Timestamp,
  updatedBy: 'second-device',
  rank: 1,
}

it('exposes canonical memberships and metadata to later commands in the same transaction', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
  const runtime = createMemoryThoughtspace(async () => persistent)
  try {
    await runtime.init({ storage: 'memory' })
    const before = (await persistent.ops.all()).length
    const result = runtime.transact(document => {
      const created = document.update({
        thoughtIndexUpdates: { [first.id]: first, [second.id]: second },
        movePlacements: { [first.id]: null, [second.id]: first.id },
      })
      const createdIds = document.operationIds
      expect(created.lexemeIndex[hashThought('shared')]).toEqual({
        contexts: [first.id, second.id],
        created: 5,
        lastUpdated: 30,
        updatedBy: 'second-device',
      })
      expect(created.lexemeIndex[hashThought(HOME_TOKEN)]).toBeUndefined()

      const renamed = document.update({
        thoughtIndexUpdates: {
          [first.id]: { ...created.thoughtIndex[first.id], value: 'renamed', lastUpdated: 40 as Timestamp },
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

      const deleted = document.update({ thoughtIndexUpdates: { [second.id]: null } })
      expect(deleted.lexemeIndex[hashThought('shared')]).toBeUndefined()
      expect(Object.values(deleted.thoughtIndex[HOME_TOKEN].childrenMap)).toEqual([first.id])
      expect(createdIds).toHaveLength(2)
      return { thoughts: document.project(), operationIds: document.operationIds }
    })
    expect(runtime.project()).toBe(result.value.thoughts)
    await result.persisted
    expect((await persistent.ops.all()).slice(before).map(operation => operation.meta.id)).toEqual(
      result.value.operationIds,
    )
    expect(runtime.project().thoughtIndex[first.id]).toMatchObject({ value: 'renamed' })
    expect(runtime.project().thoughtIndex[second.id]).toBeUndefined()
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
    await runtime.transact(document =>
      document.update({
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
    const edited = runtime.transact(document => {
      document.update({
        thoughtIndexUpdates: { [first.id]: { ...first, parentId: second.id, value: 'edited' } },
        movePlacements: { [first.id]: null },
      })
      return document.operationIds
    })
    const after = runtime.project()
    const acknowledged = vi.fn()
    expect(() =>
      runtime.transact(document => {
        document.revert(edited.value)
        expect(document.project()).toEqual(before)
        document.afterPersist(acknowledged)
        throw new Error('Cancel undo')
      }),
    ).toThrow('Cancel undo')
    expect(runtime.project()).toBe(after)

    const undone = runtime.transact(document => {
      const ids = document.revert(edited.value)
      expect(document.operationIds).toEqual(ids)
      return ids
    })
    expect(runtime.project()).toEqual(before)
    expect(await persistent.ops.all()).toEqual(persistedBefore)
    const redone = runtime.transact(document => document.revert(undone.value))
    expect(runtime.project()).toEqual(after)
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
    expect(rehydrated.project()).toEqual(after)
  } finally {
    release()
    await rehydrated?.drop()
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
    await runtime.transact(document =>
      document.update({
        thoughtIndexUpdates: Object.fromEntries(
          [parent, branch, ...children, leaf].map(thought => [thought.id, thought]),
        ),
        movePlacements: placements,
      }),
    ).persisted
    const before = runtime.project()
    const deleted = runtime.transact(document =>
      document.update({
        thoughtIndexUpdates: Object.fromEntries([parent, branch, ...children, leaf].map(thought => [thought.id, null])),
      }),
    )
    expect(deleted.value.thoughtIndex[parent.id]).toBeUndefined()
    expect(deleted.value.thoughtIndex[leaf.id]).toBeUndefined()
    await deleted.persisted

    const restored = runtime.transact(document =>
      document.update({
        thoughtIndexUpdates: Object.fromEntries(
          [leaf, ...[...children].reverse(), branch, parent].map(thought => [thought.id, thought]),
        ),
        movePlacements: placements,
      }),
    )
    expect(Object.values(restored.value.thoughtIndex[branch.id].childrenMap)).toEqual(children.map(child => child.id))
    expect(restored.value.thoughtIndex[leaf.id].parentId).toBe(children.at(-1)!.id)
    expect(restored.value).toEqual(before)
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
      runtime.transact(document => {
        const created = document.update({
          thoughtIndexUpdates: { [first.id]: first },
          movePlacements: { [first.id]: null },
        })
        expect(created.thoughtIndex[first.id].value).toBe('shared')
        document.afterPersist(acknowledged)
        // The root is not its own child, so it cannot anchor a new child within itself.
        document.update({
          thoughtIndexUpdates: { [second.id]: second },
          movePlacements: { [second.id]: HOME_TOKEN },
        })
      }),
    ).toThrow('afterId must name another child of the destination parent')

    expect(runtime.project()).toBe(before)
    await runtime.waitForIdle()
    expect(await persistent.opRefs.all()).toEqual(refs)
    expect(runtime.project().thoughtIndex[first.id]).toBeUndefined()
    expect(runtime.project().thoughtIndex[second.id]).toBeUndefined()
    expect(onChange).not.toHaveBeenCalled()
    expect(acknowledged).not.toHaveBeenCalled()

    const accepted = runtime.transact(document =>
      document.update({ thoughtIndexUpdates: { [first.id]: first }, movePlacements: { [first.id]: null } }),
    )
    await accepted.persisted
    expect(accepted.value.thoughtIndex[first.id].value).toBe('shared')
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
    await runtime.transact(document =>
      document.update({
        thoughtIndexUpdates: {
          [first.id]: { ...first, created: 1 as Timestamp, lastUpdated: 40 as Timestamp },
          [second.id]: second,
          [attribute.id]: attribute,
        },
        movePlacements: { [first.id]: null, [second.id]: first.id, [attribute.id]: null },
      }),
    ).persisted
    const initial = runtime.project()
    expect(initial.thoughtIndex[first.id].childrenMap).toEqual({ '=pin': attribute.id })
    const decoded = vi.spyOn(thoughtPayload, 'decodeThoughtPayload')
    const renamed = runtime.transact(document =>
      document.update({
        thoughtIndexUpdates: { [attribute.id]: { ...initial.thoughtIndex[attribute.id], value: '=note' } },
      }),
    )
    expect(decoded).toHaveBeenCalledTimes(1)
    expect(renamed.value.thoughtIndex[first.id].childrenMap).toEqual({ '=note': attribute.id })
    expect(renamed.value.thoughtIndex[second.id]).toBe(initial.thoughtIndex[second.id])
    expect(renamed.value.lexemeIndex[hashThought('shared')]).toBe(initial.lexemeIndex[hashThought('shared')])

    decoded.mockClear()
    const moved = runtime.transact(document =>
      document.update({
        thoughtIndexUpdates: { [attribute.id]: { ...renamed.value.thoughtIndex[attribute.id], parentId: second.id } },
        movePlacements: { [attribute.id]: null },
      }),
    )
    expect(decoded).not.toHaveBeenCalled()
    expect(moved.value.thoughtIndex[first.id].childrenMap).toEqual({})
    expect(moved.value.thoughtIndex[second.id].childrenMap).toEqual({ '=note': attribute.id })
    const deleted = runtime.transact(document => document.update({ thoughtIndexUpdates: { [first.id]: null } }))
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
    expect(runtime.project()).toEqual(rehydrated.project())
  } finally {
    await rehydrated?.drop()
    await runtime.drop()
  }
})

it('preserves transient overlays through canonical edits and restores them with projection identity after rollback', async () => {
  const runtime = createMemoryThoughtspace()
  try {
    await runtime.init({ storage: 'memory' })
    const initial = runtime.transact(document =>
      document.update({ thoughtIndexUpdates: { [first.id]: first }, movePlacements: { [first.id]: null } }),
    ).value
    const overlay = runtime.project({
      ...initial,
      thoughtIndex: {
        ...initial.thoughtIndex,
        [first.id]: {
          ...initial.thoughtIndex[first.id],
          generating: true,
          displayValue: 'streamed',
          splitSource: second.id,
        },
      },
    })
    expect(overlay.thoughtIndex[first.id]).toMatchObject({
      value: 'shared',
      generating: true,
      displayValue: 'streamed',
      splitSource: second.id,
    })
    expect(overlay.lexemeIndex).toBe(initial.lexemeIndex)
    const failure = new Error('Cancel this command')
    expect(() =>
      runtime.transact(document => {
        const changed = document.update(
          {
            thoughtIndexUpdates: {
              [first.id]: { ...overlay.thoughtIndex[first.id], value: 'cancelled', displayValue: 'cancelled stream' },
            },
          },
          overlay,
        )
        expect(changed.thoughtIndex[first.id].value).toBe('cancelled')
        throw failure
      }),
    ).toThrow(failure)
    expect(runtime.project()).toBe(overlay)
    expect(runtime.project().thoughtIndex[first.id].displayValue).toBe('streamed')

    const edited = runtime.transact(document =>
      document.update(
        {
          thoughtIndexUpdates: { [first.id]: { ...overlay.thoughtIndex[first.id], value: 'accepted' } },
        },
        overlay,
      ),
    )
    expect(edited.value.thoughtIndex[first.id]).toMatchObject({
      value: 'accepted',
      generating: true,
      displayValue: 'streamed',
      splitSource: second.id,
    })
    const cleared = runtime.project({
      ...edited.value,
      thoughtIndex: {
        ...edited.value.thoughtIndex,
        [first.id]: { ...edited.value.thoughtIndex[first.id], generating: false },
      },
    })
    expect(cleared.thoughtIndex[first.id].displayValue).toBeUndefined()
    expect(cleared.thoughtIndex[first.id].splitSource).toBe(second.id)
    expect(cleared.lexemeIndex).toBe(edited.value.lexemeIndex)
    await edited.persisted
  } finally {
    await runtime.drop()
  }
})
