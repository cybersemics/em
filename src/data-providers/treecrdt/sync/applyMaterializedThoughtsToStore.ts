import type { Change, MaterializationEvent } from '@treecrdt/interface/engine'
import _ from 'lodash'
import type ThoughtId from '../../../@types/ThoughtId'
import hashThought from '../../../util/hashThought'
import type { DataProvider } from '../../DataProvider'
import type { ThoughtspaceMaterializationBridge } from '../../thoughtspace'
import { isReadFresh, isUnconfirmed, keepInMemoryFields, markRead } from '../readFreshness'
import { isTreecrdtLocalMaterialization, waitForQueuedTreecrdtWrites } from '../writeBarrier'
import refreshThoughtsFromMaterializationChanges from './materializationThoughtUpdates'

export type MaterializationContext = {
  bridge: ThoughtspaceMaterializationBridge
  db: Pick<DataProvider, 'getThoughtsByIds' | 'getLexemesByIds'>
  pending: { event: MaterializationEvent; keys: string[] }[]
  /** Thoughts to read again in the next round, because a round skipped a read of them that was older than Redux. */
  reread: Set<ThoughtId>
  /** Thoughts to read again once their local writes return, because a round skipped them while those were unconfirmed. */
  rereadAfterWrites: Set<ThoughtId>
  isActive: () => boolean
}

/** Publishes complete memberships after persistence; local thoughts keep their optimistic view. */
export const applyMaterializedThoughtsToStore = async ({
  bridge,
  db,
  pending,
  reread,
  rereadAfterWrites,
  isActive,
}: MaterializationContext) => {
  while ((pending.length || reread.size) && isActive()) {
    // pushQueue queues each edit's write in the reducer that makes it, so once the writes queued by now are done, storage
    // has every edit this snapshot shows. Writes queued later are not waited for: their thoughts are unconfirmed until
    // the writes return, so the reads of them are skipped below.
    const snapshot = bridge.getSnapshot()
    await waitForQueuedTreecrdtWrites()
    const entries = pending.slice()
    const rereading = [...reread]
    const keys = [...new Set(entries.flatMap(entry => entry.keys))]
    const remoteChanges: Change[] = [
      ...entries.flatMap(({ event }) => (isTreecrdtLocalMaterialization(event) ? [] : event.changes)),
      // A payload change reads just the thought.
      ...rereading.map(id => ({ kind: 'payload' as const, node: id, payload: null })),
    ]
    const { thoughtIndexUpdates, headSeq } = await refreshThoughtsFromMaterializationChanges(remoteChanges, db)
    const values = await db.getLexemesByIds(keys)
    const { thoughtIndex, lexemeIndex } = bridge.getSnapshot()
    if (
      // A newer edit to a Lexeme this round reads.
      keys.some(key => lexemeIndex[key] !== snapshot.lexemeIndex[key]) ||
      // A newer edit that renamed a listed thought into another Lexeme or deleted it. The first check misses this if
      // Redux has no Lexeme for the value at both reads, as when it has not loaded that Lexeme.
      // Only changed thoughts count, or a remote rename this round publishes would restart it forever.
      values.some((lexeme, i) =>
        lexeme?.contexts.some(id => {
          const thought = thoughtIndex[id]
          return thought !== snapshot.thoughtIndex[id] && (!thought || hashThought(thought.value) !== keys[i])
        }),
      ) ||
      // An event indexed during the reads can split the thought reads or make a Lexeme list a remote change Redux does
      // not have yet. A local event can wait for the next round when this one reads no thoughts, since the checks above
      // cover its edit.
      pending
        .slice(entries.length)
        .some(({ event }) => remoteChanges.length > 0 || !isTreecrdtLocalMaterialization(event))
    )
      continue
    if (!isActive()) return

    rereading.forEach(id => reread.delete(id))
    for (const [id, latest] of Object.entries(thoughtIndexUpdates)) {
      if (!latest) continue
      // Redux has a newer copy: a local edit whose write has not returned, or a read newer than this one. Keep it, and
      // read the thought again once that is settled, or the change this round read would never reach Redux.
      if (!isReadFresh(latest.id, headSeq)) {
        delete thoughtIndexUpdates[id]
        ;(isUnconfirmed(latest.id) ? rereadAfterWrites : reread).add(latest.id)
        continue
      }
      markRead(latest.id, headSeq)
      const stored = keepInMemoryFields(thoughtIndex[latest.id], latest)
      const loading = thoughtIndex[latest.id]?.pending || thoughtIndex[latest.parentId]?.pending
      thoughtIndexUpdates[id] = loading ? { ...stored, pending: loading } : stored
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
