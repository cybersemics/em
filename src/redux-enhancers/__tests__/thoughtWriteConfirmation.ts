import type { Operation } from '@treecrdt/interface'
import type { TreecrdtWebSocketSyncClient } from '@treecrdt/sync'
import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { categorizeActionCreator as categorize } from '../../actions/categorize'
import { clearActionCreator as clear } from '../../actions/clear'
import { importFilesActionCreator as importFiles } from '../../actions/importFiles'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { pullActionCreator as pull } from '../../actions/pull'
import { redoActionCreator as redo } from '../../actions/redo'
import { undoActionCreator as undo } from '../../actions/undo'
import { updateThoughtsActionCreator as updateThoughts } from '../../actions/updateThoughts'
import { HOME_TOKEN } from '../../constants'
import db, { thoughtspaceRuntime } from '../../data-providers/thoughtspace'
import { decodeThoughtPayload, encodeThoughtPayload } from '../../data-providers/treecrdt/payload'
import { waitForTreecrdtWriteBarrier } from '../../data-providers/treecrdt/writeBarrier'
import { initialize } from '../../initialize'
import exportContext from '../../selectors/exportContext'
import getLexeme from '../../selectors/getLexeme'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import contextToThought from '../../test-helpers/contextToThought'
import deferred from '../../test-helpers/deferred'
import { deleteThoughtAtFirstMatchActionCreator as deleteThought } from '../../test-helpers/deleteThoughtAtFirstMatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { moveThoughtAtFirstMatchActionCreator as moveThought } from '../../test-helpers/moveThoughtAtFirstMatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import createId from '../../util/createId'

let syncClient: TreecrdtWebSocketSyncClient

vi.mock('@treecrdt/wa-sqlite', async importOriginal => {
  const actual = await importOriginal<typeof import('@treecrdt/wa-sqlite')>()
  return { ...actual, createTreecrdtClient: vi.fn(actual.createTreecrdtClient) }
})

// Capture the actual queued client supplied to sync without opening a network connection in store tests.
vi.mock('../../data-providers/treecrdt/sync/treecrdtWebSocketSync', async importOriginal => {
  const actual = await importOriginal<typeof import('../../data-providers/treecrdt/sync/treecrdtWebSocketSync')>()
  return {
    default: () => {
      const sync = actual.default()
      return {
        ...sync,
        tryStartFromEnv: (boundClient: TreecrdtWebSocketSyncClient) => {
          syncClient = boundClient
          return sync.tryStartFromEnv(boundClient)
        },
      }
    },
  }
})

const remoteReplica = new Uint8Array(32).fill(9)
let client: TreecrdtClient
let remote: TreecrdtClient
let cleanup: () => void

/** Authors an operation on another replica and receives it through the real sync client boundary. */
const receiveRemote = async (write: (peer: TreecrdtClient) => Promise<Operation>) => {
  await remote.ops.appendMany(await client.ops.all())
  await syncClient.ops.appendMany([await write(remote)])
}

beforeEach(async () => {
  await initStore()
  await waitForThoughtspaceIdle()
  await thoughtspaceRuntime.drop()
  ;({ cleanup } = await initialize({ storage: 'memory' }))
  await vi.runAllTimersAsync()
  client = await vi.mocked(createTreecrdtClient).mock.results.at(-1)!.value
  remote = await createTreecrdtClient({ storage: { type: 'memory' }, runtime: { type: 'direct' }, docId: client.docId })
})

afterEach(async () => {
  await waitForThoughtspaceIdle()
  cleanup()
  await remote.drop()
  vi.restoreAllMocks()
})

it('confirms a new thought alongside unloaded occurrences of the same value', async () => {
  store.dispatch(importText({ text: '- other\n  - branch\n    - hidden\n      - cat' }))
  await waitForThoughtspaceIdle()
  const hidden = contextToThought(store.getState(), ['other', 'branch', 'hidden', 'cat'])!
  store.dispatch(clear())
  await store.dispatch(pull([HOME_TOKEN], { maxDepth: 1 }))
  expect(store.getState().thoughts.thoughtIndex[hidden.id]).toBeUndefined()
  expect(getLexeme(store.getState(), 'cat')).toBeUndefined()

  store.dispatch(newThought({ at: [HOME_TOKEN], insertNewSubthought: true, value: 'cat' }))
  const created = contextToThought(store.getState(), ['cat'])!
  expect(store.getState().pendingThoughtWrites[created.id].patch).toEqual({
    id: created.id,
    value: 'cat',
    created: created.created,
    lastUpdated: created.lastUpdated,
    updatedBy: created.updatedBy,
    parentId: HOME_TOKEN,
    rank: created.rank,
    archived: undefined,
  })
  expect(getLexeme(store.getState(), 'cat')?.contexts).toEqual([created.id])
  await waitForThoughtspaceIdle()

  expect(getLexeme(store.getState(), 'cat')?.contexts.slice().sort()).toEqual([hidden.id, created.id].sort())
  expect(store.getState().pendingThoughtWrites).toEqual({})
})

it('confirms imported and deleted subtree memberships without losing unloaded occurrences', async () => {
  store.dispatch(importText({ text: '- other\n  - branch\n    - hidden\n      - cat' }))
  await waitForThoughtspaceIdle()
  const hidden = contextToThought(store.getState(), ['other', 'branch', 'hidden', 'cat'])!
  store.dispatch(clear())
  await store.dispatch(pull([HOME_TOKEN], { maxDepth: 1 }))
  expect(store.getState().thoughts.thoughtIndex[hidden.id]).toBeUndefined()

  store.dispatch(importText({ path: [HOME_TOKEN], text: '- batch\n  - cat\n    - cat' }))
  const parent = contextToThought(store.getState(), ['batch', 'cat'])!
  const child = contextToThought(store.getState(), ['batch', 'cat', 'cat'])!
  await waitForThoughtspaceIdle()
  expect(getLexeme(store.getState(), 'cat')?.contexts.slice().sort()).toEqual([hidden.id, parent.id, child.id].sort())

  store.dispatch(deleteThought(['batch']))
  expect(getLexeme(store.getState(), 'cat')?.contexts).toEqual([hidden.id])
  await waitForThoughtspaceIdle()

  expect(getLexeme(store.getState(), 'cat')?.contexts).toEqual([hidden.id])
  await expect(db.getThoughtsByIds([parent.id, child.id])).resolves.toEqual([undefined, undefined])
  expect(store.getState().pendingThoughtWrites).toEqual({})
})

it('finishes a duplicate attribute file import without losing memberships or minting operations', async () => {
  store.dispatch(importText({ text: '- other\n  - =pin\n    - true\n- target\n  - =pin\n    - true' }))
  await waitForThoughtspaceIdle()
  const target = contextToThought(store.getState(), ['target'])!
  const otherPin = contextToThought(store.getState(), ['other', '=pin'])!
  const targetPin = contextToThought(store.getState(), ['target', '=pin'])!
  const operations = await client.ops.all()

  const imported = store.dispatch(
    importFiles({
      path: [target.id],
      files: [{ name: 'attributes.txt', size: 15, lastModified: 0, text: async () => '- =pin\n  - true' }],
    }),
  )
  await vi.runAllTimersAsync()
  await imported
  await waitForThoughtspaceIdle()

  expect(getLexeme(store.getState(), '=pin')?.contexts.slice().sort()).toEqual([otherPin.id, targetPin.id].sort())
  expect(await client.ops.all()).toEqual(operations)
  expect(store.getState().pendingThoughtWrites).toEqual({})
})

it('keeps a second move visible while the first is confirmed and reloads the final order', async () => {
  store.dispatch(importText({ text: '- left\n  - cat\n  - tail\n- right\n  - head' }))
  await waitForThoughtspaceIdle()
  const thought = contextToThought(store.getState(), ['left', 'cat'])!
  const left = contextToThought(store.getState(), ['left'])!
  const firstStarted = deferred()
  const firstReleased = deferred()
  const secondStarted = deferred()
  const secondReleased = deferred()
  const move = client.local.move.bind(client.local)
  vi.spyOn(client.local, 'move')
    .mockImplementationOnce(async (...args) => {
      firstStarted.resolve()
      await firstReleased.promise
      return move(...args)
    })
    .mockImplementationOnce(async (...args) => {
      secondStarted.resolve()
      await secondReleased.promise
      return move(...args)
    })

  store.dispatch(moveThought({ from: ['left', 'cat'], to: ['right', 'cat'], newRank: 1 }))
  await firstStarted.promise
  store.dispatch(moveThought({ from: ['right', 'cat'], to: ['left', 'cat'], newRank: 1 }))
  firstReleased.resolve()
  await secondStarted.promise
  const during = store.getState()
  secondReleased.resolve()
  await waitForThoughtspaceIdle()

  expect(during.pendingThoughtWrites[thought.id].patch?.parentId).toBe(left.id)
  expect(exportContext(during, [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - left
    - tail
    - cat
  - right
    - head`)
  expect(store.getState().pendingThoughtWrites).toEqual({})

  store.dispatch(clear())
  await store.dispatch(pull([HOME_TOKEN], { maxDepth: 3 }))
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - left
    - tail
    - cat
  - right
    - head`)
})

it('confirms unloaded memberships after rename, undo, and redo through the real Redux provider path', async () => {
  store.dispatch(importText({ text: '- other\n  - branch\n    - hidden\n      - cat\n- dog' }))
  await waitForThoughtspaceIdle()
  const hidden = contextToThought(store.getState(), ['other', 'branch', 'hidden', 'cat'])!
  const edited = contextToThought(store.getState(), ['dog'])!
  store.dispatch(clear())
  await store.dispatch(pull([HOME_TOKEN], { maxDepth: 1 }))
  expect(store.getState().thoughts.thoughtIndex[hidden.id]).toBeUndefined()
  expect(getLexeme(store.getState(), 'cat')).toBeUndefined()

  store.dispatch(editThought(['dog'], 'cat'))
  expect(getLexeme(store.getState(), 'cat')?.contexts).toEqual([edited.id])
  await waitForThoughtspaceIdle()
  expect(getLexeme(store.getState(), 'cat')?.contexts.slice().sort()).toEqual([hidden.id, edited.id].sort())
  expect(store.getState().pendingThoughtWrites).toEqual({})

  store.dispatch(undo())
  await waitForThoughtspaceIdle()
  expect(getLexeme(store.getState(), 'cat')?.contexts).toEqual([hidden.id])
  await expect(db.getThoughtById(edited.id)).resolves.toMatchObject({ value: 'dog' })

  store.dispatch(redo())
  await waitForThoughtspaceIdle()
  expect(getLexeme(store.getState(), 'cat')?.contexts.slice().sort()).toEqual([hidden.id, edited.id].sort())
  await expect(db.getThoughtById(edited.id)).resolves.toMatchObject({ value: 'cat' })
})

it('publishes a committed membership read beneath a newer pending edit', async () => {
  store.dispatch(importText({ text: '- cat' }))
  await waitForThoughtspaceIdle()
  const thought = contextToThought(store.getState(), ['cat'])!
  const firstStarted = deferred()
  const firstReleased = deferred()
  const secondStarted = deferred()
  const secondReleased = deferred()
  const payload = client.local.payload.bind(client.local)
  const getText = client.runner.getText.bind(client.runner)
  let pauseRead = true
  vi.spyOn(client.runner, 'getText').mockImplementation(async (sql, params) => {
    const result = await getText(sql, params)
    if (pauseRead && sql.includes('FROM (SELECT * FROM em_lexeme_memberships')) {
      pauseRead = false
      firstStarted.resolve()
      await firstReleased.promise
    }
    return result
  })
  vi.spyOn(client.local, 'payload')
    .mockImplementationOnce(payload)
    .mockImplementationOnce(async (...args) => {
      secondStarted.resolve()
      await secondReleased.promise
      return payload(...args)
    })

  store.dispatch(editThought(['cat'], 'dog'))
  await firstStarted.promise
  store.dispatch(editThought(['dog'], 'bird'))
  firstReleased.resolve()
  await secondStarted.promise
  const during = store.getState()
  secondReleased.resolve()
  await waitForThoughtspaceIdle()

  expect(during.pendingThoughtWrites[thought.id].patch?.value).toBe('bird')
  expect(getLexeme(during, 'bird')?.contexts).toEqual([thought.id])
  expect(getLexeme(during, 'dog')).toBeUndefined()
  expect(store.getState().pendingThoughtWrites).toEqual({})
  await expect(db.getThoughtById(thought.id)).resolves.toMatchObject({ value: 'bird' })
})

it('acknowledges a no-op without requiring a materialization event', async () => {
  store.dispatch(importText({ text: '- cat' }))
  await waitForThoughtspaceIdle()
  const thought = contextToThought(store.getState(), ['cat'])!
  const operations = await client.ops.all()

  store.dispatch(updateThoughts({ thoughtIndexUpdates: { [thought.id]: thought } }))
  expect(store.getState().pendingThoughtWrites[thought.id]).toBeDefined()
  await waitForThoughtspaceIdle()

  expect(store.getState().pendingThoughtWrites).toEqual({})
  expect(await client.ops.all()).toEqual(operations)
})

it('retains a failed edit until a later successful edit supersedes it', async () => {
  store.dispatch(importText({ text: '- cat' }))
  await waitForThoughtspaceIdle()
  const thought = contextToThought(store.getState(), ['cat'])!
  const failure = new Error('disk write failed')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.spyOn(client.local, 'payload').mockRejectedValueOnce(failure)

  store.dispatch(editThought(['cat'], 'dog'))
  await expect(waitForTreecrdtWriteBarrier()).rejects.toBe(failure)
  expect(store.getState().pendingThoughtWrites[thought.id]).toMatchObject({
    patch: { value: 'dog' },
    error: String(failure),
  })
  expect(getLexeme(store.getState(), 'dog')?.contexts).toEqual([thought.id])
  await expect(db.getThoughtById(thought.id)).resolves.toMatchObject({ value: 'cat' })

  store.dispatch(editThought(['dog'], 'bird'))
  await waitForThoughtspaceIdle()
  expect(store.getState().pendingThoughtWrites).toEqual({})
  expect(getLexeme(store.getState(), 'dog')).toBeUndefined()
  await expect(db.getThoughtById(thought.id)).resolves.toMatchObject({ value: 'bird' })
})

it('does not publish a previous generation after clearing Redux during a write', async () => {
  store.dispatch(importText({ text: '- cat' }))
  await waitForThoughtspaceIdle()
  const thought = contextToThought(store.getState(), ['cat'])!
  const persisted = vi.fn()
  const started = deferred()
  const released = deferred()
  const payload = client.local.payload.bind(client.local)
  vi.spyOn(client.local, 'payload').mockImplementationOnce(async (...args) => {
    started.resolve()
    await released.promise
    return payload(...args)
  })

  store.dispatch(
    updateThoughts({
      thoughtIndexUpdates: { [thought.id]: { ...thought, value: 'dog' } },
      idbSynced: persisted,
    }),
  )
  await started.promise
  store.dispatch(clear())
  released.resolve()
  await waitForThoughtspaceIdle()

  expect(store.getState().pendingThoughtWrites).toEqual({})
  expect(getLexeme(store.getState(), 'dog')).toBeUndefined()
  expect(persisted).toHaveBeenCalledOnce()
})

it('discards a queued no-op confirmation when Redux is cleared before persistence starts', async () => {
  store.dispatch(importText({ text: '- cat' }))
  await waitForThoughtspaceIdle()
  const thought = contextToThought(store.getState(), ['cat'])!

  store.dispatch(updateThoughts({ thoughtIndexUpdates: { [thought.id]: thought } }))
  store.dispatch(clear())
  await waitForThoughtspaceIdle()

  expect(getLexeme(store.getState(), 'cat')).toBeUndefined()
  expect(store.getState().thoughts.thoughtIndex[thought.id]).toBeUndefined()
})

it('applies a remote reorder without requiring a payload timestamp change', async () => {
  store.dispatch(importText({ text: '- a\n- b\n- c' }))
  await waitForThoughtspaceIdle()
  const c = contextToThought(store.getState(), ['c'])!

  await receiveRemote(peer => peer.local.move(remoteReplica, c.id, HOME_TOKEN, { type: 'first' }))
  await waitForThoughtspaceIdle()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - c
  - a
  - b`)
})

it('persists a queued rename without moving the thought back after a remote move', async () => {
  store.dispatch(importText({ text: '- left\n  - cat\n- right' }))
  await waitForThoughtspaceIdle()
  const cat = contextToThought(store.getState(), ['left', 'cat'])!
  const right = contextToThought(store.getState(), ['right'])!
  const started = deferred()
  const released = deferred()
  const exists = client.tree.exists.bind(client.tree)
  vi.spyOn(client.tree, 'exists').mockImplementationOnce(async id => {
    started.resolve()
    await released.promise
    return exists(id)
  })
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  store.dispatch(editThought(['left', 'cat'], 'dog'))
  await started.promise
  const incoming = receiveRemote(peer => peer.local.move(remoteReplica, cat.id, right.id, { type: 'first' }))
  released.resolve()
  await incoming
  await expect(waitForThoughtspaceIdle()).resolves.toBeUndefined()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - left
  - right
    - dog`)
  store.dispatch(clear())
  await store.dispatch(pull([HOME_TOKEN], { maxDepth: 3 }))
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - left
  - right
    - dog`)
})

it('persists a queued move without overwriting a remote rename', async () => {
  store.dispatch(importText({ text: '- left\n  - cat\n- right' }))
  await waitForThoughtspaceIdle()
  const cat = contextToThought(store.getState(), ['left', 'cat'])!
  const started = deferred()
  const released = deferred()
  const parent = client.tree.parent.bind(client.tree)
  vi.spyOn(client.tree, 'parent').mockImplementationOnce(async id => {
    started.resolve()
    await released.promise
    return parent(id)
  })

  const payload = decodeThoughtPayload((await client.tree.getPayload(cat.id))!)
  const incoming = receiveRemote(peer =>
    peer.local.payload(remoteReplica, cat.id, encodeThoughtPayload({ ...payload, value: 'dog' })),
  )
  await started.promise
  // Redux has not received the rename yet; the queued placement must not carry its old value.
  store.dispatch(moveThought({ from: ['left', 'cat'], to: ['right', 'cat'], newRank: 0 }))
  released.resolve()
  await incoming
  await waitForThoughtspaceIdle()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - left
  - right
    - dog`)
  store.dispatch(clear())
  await store.dispatch(pull([HOME_TOKEN], { maxDepth: 3 }))
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - left
  - right
    - dog`)
})

it('keeps a newer optimistic move visible while a committed structural read is pending', async () => {
  store.dispatch(importText({ text: '- left\n  - cat\n- middle\n- right' }))
  await waitForThoughtspaceIdle()
  const cat = contextToThought(store.getState(), ['left', 'cat'])!
  const middle = contextToThought(store.getState(), ['middle'])!
  const started = deferred()
  const released = deferred()
  const parent = client.tree.parent.bind(client.tree)
  vi.spyOn(client.tree, 'parent').mockImplementationOnce(async id => {
    const result = await parent(id)
    started.resolve()
    await released.promise
    return result
  })

  const incoming = receiveRemote(peer => peer.local.move(remoteReplica, cat.id, middle.id, { type: 'first' }))
  await started.promise
  store.dispatch(moveThought({ from: ['left', 'cat'], to: ['right', 'cat'], newRank: 0 }))
  expect(contextToThought(store.getState(), ['right', 'cat'])?.id).toBe(cat.id)
  released.resolve()
  await incoming
  await waitForThoughtspaceIdle()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - left
  - middle
  - right
    - cat`)
})

it('keeps a failed rename visible without masking a remote move', async () => {
  store.dispatch(importText({ text: '- left\n  - cat\n- right' }))
  await waitForThoughtspaceIdle()
  const cat = contextToThought(store.getState(), ['left', 'cat'])!
  const right = contextToThought(store.getState(), ['right'])!
  const failure = new Error('disk write failed')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.spyOn(client.local, 'payload').mockRejectedValueOnce(failure)

  store.dispatch(editThought(['left', 'cat'], 'dog'))
  await expect(waitForTreecrdtWriteBarrier()).rejects.toBe(failure)
  await receiveRemote(peer => peer.local.move(remoteReplica, cat.id, right.id, { type: 'first' }))
  const payload = decodeThoughtPayload((await client.tree.getPayload(cat.id))!)
  await receiveRemote(peer =>
    peer.local.payload(
      remoteReplica,
      cat.id,
      encodeThoughtPayload({ ...payload, lastUpdated: payload.lastUpdated + 10000 }),
    ),
  )
  await waitForThoughtspaceIdle()
  // A normal pull must preserve the same pending intent as a materialization refresh.
  await store.dispatch(pull([HOME_TOKEN], { force: true, maxDepth: 3 }))

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - left
  - right
    - dog`)
  expect(store.getState().pendingThoughtWrites[cat.id].error).toBe(String(failure))
})

it('keeps a failed placement without losing a remote rename or inserted sibling', async () => {
  store.dispatch(importText({ text: '- left\n  - cat\n- right\n  - head' }))
  await waitForThoughtspaceIdle()
  const cat = contextToThought(store.getState(), ['left', 'cat'])!
  const right = contextToThought(store.getState(), ['right'])!
  const failure = new Error('disk write failed')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.spyOn(client.local, 'move').mockRejectedValueOnce(failure)

  store.dispatch(moveThought({ from: ['left', 'cat'], to: ['right', 'cat'], newRank: 1 }))
  await expect(waitForTreecrdtWriteBarrier()).rejects.toBe(failure)
  const payload = decodeThoughtPayload((await client.tree.getPayload(cat.id))!)
  await receiveRemote(peer =>
    peer.local.payload(remoteReplica, cat.id, encodeThoughtPayload({ ...payload, value: 'dog' })),
  )
  await receiveRemote(peer =>
    peer.local.insert(
      remoteReplica,
      right.id,
      createId(),
      { type: 'last' },
      encodeThoughtPayload({ ...payload, value: 'tail' }),
    ),
  )
  await waitForThoughtspaceIdle()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - left
  - right
    - head
    - dog
    - tail`)
  await expect(db.getThoughtById(cat.id)).resolves.toMatchObject({ parentId: cat.parentId, value: 'dog' })
  expect(store.getState().pendingThoughtWrites[cat.id].error).toBe(String(failure))
})

it('does not project a pending placement into a cycle after a remote move', async () => {
  store.dispatch(importText({ text: '- left\n  - cat\n- right' }))
  await waitForThoughtspaceIdle()
  const cat = contextToThought(store.getState(), ['left', 'cat'])!
  const right = contextToThought(store.getState(), ['right'])!
  const failure = new Error('disk write failed')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.spyOn(client.local, 'move').mockRejectedValueOnce(failure)

  store.dispatch(moveThought({ from: ['left', 'cat'], to: ['right', 'cat'], newRank: 0 }))
  await expect(waitForTreecrdtWriteBarrier()).rejects.toBe(failure)
  await receiveRemote(peer => peer.local.move(remoteReplica, right.id, cat.id, { type: 'first' }))
  await waitForThoughtspaceIdle()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - left
    - cat
      - right`)
  expect(store.getState().pendingThoughtWrites[cat.id].error).toBe(String(failure))
})

it('reads the final restored state when deletion and undo materializations are coalesced', async () => {
  store.dispatch(importText({ text: '- cat\n- dog' }))
  await waitForThoughtspaceIdle()

  store.dispatch(deleteThought(['cat']))
  store.dispatch(undo())
  await waitForThoughtspaceIdle()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - cat
  - dog`)
  store.dispatch(clear())
  await store.dispatch(pull([HOME_TOKEN], { maxDepth: 3 }))
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - cat
  - dog`)
})

it('removes the category after undoing a persisted categorization', async () => {
  store.dispatch(importText({ text: '- a\n- b\n- c' }))
  await waitForThoughtspaceIdle()
  store.dispatch([setCursor(['a']), addMulticursor(['a']), addMulticursor(['b']), addMulticursor(['c']), categorize()])
  await waitForThoughtspaceIdle()
  const category = contextToThought(store.getState(), [''])!

  store.dispatch(undo())
  expect(store.getState().thoughts.thoughtIndex[category.id]).toBeUndefined()
  await waitForThoughtspaceIdle()
  await expect(db.getThoughtById(category.id)).resolves.toBeUndefined()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b
  - c`)
})
