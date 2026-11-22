import db, { thoughtspaceRuntime } from '../../data-providers/thoughtspace'
import thoughtToPath from '../../selectors/thoughtToPath'
import store from '../../stores/app'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import importToContext from '../../test-helpers/importToContext'
import initStore from '../../test-helpers/initStore'
import { moveThoughtAtFirstMatchActionCreator as moveThought } from '../../test-helpers/moveThoughtAtFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import hashThought from '../../util/hashThought'
import head from '../../util/head'
import { deleteThoughtActionCreator as deleteThought } from '../deleteThought'
import { pullActionCreator as pull } from '../pull'
import { redoActionCreator as redo } from '../redo'
import { undoActionCreator as undo } from '../undo'

beforeEach(initStore)
afterEach(() => vi.restoreAllMocks())

/** Resolves an unranked path in the current state. */
const pathTo = (pathUnranked: string[]) => contextToPathOrThrow(store.getState(), pathUnranked, 'pull test')

/** The contexts of the Lexeme in Redux for a value. */
const lexemeContexts = (value: string) => store.getState().thoughts.lexemeIndex[hashThought(value)]?.contexts ?? []

it('keeps an undo of a pending thought that lands while its pull reads', async () => {
  store.dispatch(importToContext('- a\n  - x\n    - y\n- b'))
  await vi.runAllTimersAsync()
  // Free y the way freeThoughts does, which leaves x pending until a pull loads y again.
  const [aId, xId, yId] = pathTo(['a', 'x', 'y'])
  store.dispatch(deleteThought({ thoughtId: yId, pathParent: [aId, xId], local: false, remote: false }))
  store.dispatch(moveThought({ from: ['a', 'x'], to: ['b', 'x'], newRank: 0 }))
  // Persist the move without running the pull queue timers, which would load x.
  await thoughtspaceRuntime.waitForIdle()

  // The undo lands after the pull read x under b, before the pull applies what it read.
  const getThoughtsByIds = db.getThoughtsByIds
  vi.spyOn(db, 'getThoughtsByIds').mockImplementationOnce(async ids => {
    const thoughts = await getThoughtsByIds(ids)
    store.dispatch(undo())
    return thoughts
  })
  await store.dispatch(pull([xId]))

  expect(thoughtToPath(store.getState(), xId)).toEqual(pathTo(['a', 'x']))

  // https://github.com/cybersemics/em/issues/5623
  store.dispatch(redo())
  await waitForThoughtspaceIdle()

  expect(await db.getThoughtById(xId)).toMatchObject({ parentId: head(pathTo(['b'])) })
})

it('keeps the Lexeme of a thought it adds when freeThoughts drops that Lexeme meanwhile', async () => {
  store.dispatch(importToContext('- a\n  - k\n- b\n  - x\n    - k'))
  await vi.runAllTimersAsync()
  const [aId, akId] = pathTo(['a', 'k'])
  const [bId, xId, xkId] = pathTo(['b', 'x', 'k'])
  // Free b/x/k the way freeThoughts does, which leaves x pending. Lexeme k stays, since a/k is still loaded.
  store.dispatch(deleteThought({ thoughtId: xkId, pathParent: [bId, xId], local: false, remote: false }))

  // freeThoughts frees a/k while the pull reads b/x/k, which drops Lexeme k.
  const getThoughtsByIds = db.getThoughtsByIds
  vi.spyOn(db, 'getThoughtsByIds').mockImplementation(async ids => {
    const thoughts = await getThoughtsByIds(ids)
    if (ids.includes(xkId)) {
      store.dispatch(deleteThought({ thoughtId: akId, pathParent: [aId], local: false, remote: false }))
    }
    return thoughts
  })
  await store.dispatch(pull([xId]))

  expect(store.getState().thoughts.thoughtIndex[xkId]?.value).toBe('k')
  expect(lexemeContexts('k')).toContain(xkId)
})

describe('Lexemes', () => {
  beforeEach(async () => {
    store.dispatch(importToContext('- a\n  - x\n- b'))
    await vi.runAllTimersAsync()
    store.dispatch(editThought(['a', 'x'], 'xy'))
    await vi.runAllTimersAsync()
    await waitForThoughtspaceIdle()
  })

  it('skips a Lexeme that changes while the pull reads it', async () => {
    const xId = head(pathTo(['a', 'xy']))

    // The undo lands after the pull read the Lexeme of xy, before the pull applies it.
    const getLexemesByIds = db.getLexemesByIds
    vi.spyOn(db, 'getLexemesByIds').mockImplementationOnce(async keys => {
      const lexemes = await getLexemesByIds(keys)
      store.dispatch(undo())
      return lexemes
    })
    await store.dispatch(pull([xId], { force: true }))

    expect(lexemeContexts('xy')).not.toContain(xId)
  })

  it('reads a Lexeme after the writes queued before the pull', async () => {
    const xId = head(pathTo(['a', 'xy']))

    // Hold the undo's write back, as a backlog of queued writes would.
    let release!: () => void
    const held = new Promise<void>(resolve => (release = resolve))
    const updateThoughts = db.updateThoughts
    vi.spyOn(db, 'updateThoughts').mockImplementationOnce(async updates => {
      await held
      return updateThoughts(updates)
    })
    store.dispatch(undo())
    const pulling = store.dispatch(pull([xId], { force: true }))
    // Give a pull that does not wait for the write the time to read storage before it.
    await vi.runAllTimersAsync()
    release()
    await pulling

    expect(lexemeContexts('xy')).not.toContain(xId)
  })
})
