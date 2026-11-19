import type { MaterializationEvent } from '@treecrdt/interface/engine'
import _ from 'lodash'
import hashThought from '../../../util/hashThought'
import type { DataProvider } from '../../DataProvider'
import type { ThoughtspaceMaterializationBridge } from '../../thoughtspace'
import { isTreecrdtLocalMaterialization, waitForTreecrdtWriteBarrier } from '../writeBarrier'
import refreshThoughtsFromMaterializationChanges from './materializationThoughtUpdates'

export type MaterializationContext = {
  bridge: ThoughtspaceMaterializationBridge
  db: Pick<DataProvider, 'getThoughtById' | 'getLexemesByIds'>
  pending: { event: MaterializationEvent; keys: string[] }[]
  isActive: () => boolean
}

/** Publishes complete memberships after persistence; local thoughts keep their optimistic view. */
export const applyMaterializedThoughtsToStore = async ({ bridge, db, pending, isActive }: MaterializationContext) => {
  while (pending.length && isActive()) {
    // pushQueue queues each edit's write in the reducer that makes it, so once the wait ends storage has every edit this
    // snapshot shows.
    const snapshot = bridge.getSnapshot()
    await waitForTreecrdtWriteBarrier()
    const entries = pending.slice()
    const keys = [...new Set(entries.flatMap(entry => entry.keys))]
    const remoteChanges = entries.flatMap(({ event }) => (isTreecrdtLocalMaterialization(event) ? [] : event.changes))
    const thoughtIndexUpdates = await refreshThoughtsFromMaterializationChanges(remoteChanges, db)
    const values = await db.getLexemesByIds(keys)
    const { thoughtIndex, lexemeIndex } = bridge.getSnapshot()
    if (
      // A newer edit to a Lexeme this round reads or a thought it writes.
      keys.some(key => lexemeIndex[key] !== snapshot.lexemeIndex[key]) ||
      Object.keys(thoughtIndexUpdates).some(id => thoughtIndex[id] !== snapshot.thoughtIndex[id]) ||
      // A newer edit that renamed a listed thought into another Lexeme or deleted it. Only changed thoughts count, or a
      // remote rename this round publishes would restart it forever.
      values.some((lexeme, i) =>
        lexeme?.contexts.some(id => {
          const thought = thoughtIndex[id]
          return thought !== snapshot.thoughtIndex[id] && (!thought || hashThought(thought.value) !== keys[i])
        }),
      ) ||
      // An event indexed during the reads can split the thought reads, which also use the attribute index, or make a
      // Lexeme list a remote change Redux does not have yet. A local event can wait for the next round when this one
      // reads no thoughts, since the checks above cover its edit.
      pending
        .slice(entries.length)
        .some(({ event }) => remoteChanges.length > 0 || !isTreecrdtLocalMaterialization(event))
    )
      continue
    if (!isActive()) return

    for (const latest of _.compact(Object.values(thoughtIndexUpdates))) {
      const loading = thoughtIndex[latest.id]?.pending || thoughtIndex[latest.parentId]?.pending
      if (loading) thoughtIndexUpdates[latest.id] = { ...latest, pending: loading }
    }
    const lexemeIndexUpdates = Object.fromEntries(
      keys.flatMap((key, i) => (_.isEqual(values[i], snapshot.lexemeIndex[key]) ? [] : [[key, values[i] ?? null]])),
    )
    pending.splice(0, entries.length)
    if (Object.keys(lexemeIndexUpdates).length || Object.keys(thoughtIndexUpdates).length) {
      await bridge.apply({ thoughtIndex: thoughtIndexUpdates, lexemeIndex: lexemeIndexUpdates })
    }
  }
}
