import _ from 'lodash'
import type Index from '../../@types/IndexType'
import type Lexeme from '../../@types/Lexeme'
import type Thought from '../../@types/Thought'
import type ThoughtId from '../../@types/ThoughtId'
import type ThoughtIndices from '../../@types/ThoughtIndices'
import { registerReset } from '../../stores/ministore'

/*
 * Decides whether a thought read from TreeCRDT may replace the copy in Redux. It goes by TreeCRDT's own order of
 * changes, `headSeq`, which every read reports, instead of the wall-clock `lastUpdated` stamped by whichever device
 * wrote last.
 *
 * - A local edit is unconfirmed from the moment it is queued for persistence until its writes return. Until then Redux
 *   has a newer copy than storage can return, so reads of that thought are skipped.
 * - Once the writes return, the thought remembers how far storage had got. A read that saw less can predate the edit,
 *   so it is skipped too.
 * - A read that Redux takes moves the thought up to that read's headSeq, so an older read that resolves later is
 *   skipped.
 */

/** Queued local writes per thought that have not returned yet. */
const unconfirmed = new Map<ThoughtId, number>()

/** For each thought, the headSeq that its copy in Redux is known to be current at. */
const confirmedSeqs = new Map<ThoughtId, number>()

/** The same for Lexemes, by key. A Lexeme is read from the Lexeme index, which reports how far it had got. */
const unconfirmedLexemes = new Map<string, number>()
const confirmedLexemeSeqs = new Map<string, number>()

/** Called with the thoughts whose last queued write has returned or failed. */
const settledListeners = new Set<(ids: ThoughtId[]) => void>()

registerReset(() => {
  unconfirmed.clear()
  confirmedSeqs.clear()
  unconfirmedLexemes.clear()
  confirmedLexemeSeqs.clear()
})

/**
 * Attaches the headSeq a read saw to the array it returned. The property is not enumerable, so comparing the array, as
 * tests do, ignores it.
 */
export const withHeadSeq = <T extends unknown[]>(read: T, headSeq: number | undefined): T & { headSeq?: number } =>
  Object.defineProperty(read, 'headSeq', { value: headSeq, enumerable: false })

/** The lower of two read headSeqs, ignoring a read that reported none. A set of reads is as fresh as its oldest. */
export const minHeadSeq = (a: number | undefined, b: number | undefined): number | undefined =>
  a === undefined ? b : b === undefined ? a : Math.min(a, b)

/** Moves a key's known headSeq up to `headSeq`. */
const advance = <K>(seqs: Map<K, number>, key: K, headSeq: number) => {
  if (headSeq > (seqs.get(key) ?? -1)) seqs.set(key, headSeq)
}

/** Releases one queued write for each key and returns the keys that have none left. */
const release = <K>(counts: Map<K, number>, keys: K[]): K[] =>
  keys.filter(key => {
    const count = (counts.get(key) ?? 1) - 1
    if (count > 0) counts.set(key, count)
    else counts.delete(key)
    return count <= 0
  })

/** Releases one queued write for each thought and Lexeme, and notifies the listeners of the thoughts with none left. */
const settle = (ids: ThoughtId[], lexemeKeys: string[]) => {
  release(unconfirmedLexemes, lexemeKeys)
  const settled = release(unconfirmed, ids)
  if (settled.length > 0) settledListeners.forEach(listener => listener(settled))
}

/**
 * Marks the thoughts and Lexemes a local write changes as unconfirmed. Call it in the same dispatch as the edit, before
 * the write is queued, so that no read can resolve in between. Once the write's operations have returned, call
 * `confirm` with the headSeq storage has reached. If they fail, call `fail`: everything keeps the headSeq it had, so
 * the next read can show what storage has.
 */
export const beginLocalWrite = (ids: ThoughtId[], lexemeKeys: string[] = []) => {
  ids.forEach(id => unconfirmed.set(id, (unconfirmed.get(id) ?? 0) + 1))
  lexemeKeys.forEach(key => unconfirmedLexemes.set(key, (unconfirmedLexemes.get(key) ?? 0) + 1))
  return {
    confirm: (headSeq: number) => {
      ids.forEach(id => advance(confirmedSeqs, id, headSeq))
      // The Lexeme index applies the write only once its event is delivered, so a Lexeme read is fresh only once the
      // index has got this far.
      lexemeKeys.forEach(key => advance(confirmedLexemeSeqs, key, headSeq))
      settle(ids, lexemeKeys)
    },
    fail: () => settle(ids, lexemeKeys),
  }
}

/** True while a thought has a local write that has not returned. */
export const isUnconfirmed = (id: ThoughtId): boolean => unconfirmed.has(id)

/**
 * True if a thought read at `headSeq` may replace the copy in Redux: no local write of it is unconfirmed, and the read is
 * not older than that copy. A read without a headSeq, as from a mocked provider, is checked for unconfirmed writes only.
 */
export const isReadFresh = (id: ThoughtId, headSeq: number | undefined): boolean =>
  !unconfirmed.has(id) && (headSeq === undefined || headSeq >= (confirmedSeqs.get(id) ?? -1))

/** Records that the copy of a thought in Redux is current at `headSeq`, because Redux took it from that read. */
export const markRead = (id: ThoughtId, headSeq: number | undefined) => {
  if (headSeq !== undefined) advance(confirmedSeqs, id, headSeq)
}

/** Subscribes to thoughts whose last queued write has returned or failed. Returns the unsubscribe function. */
export const onWritesSettled = (listener: (ids: ThoughtId[]) => void): (() => void) => {
  settledListeners.add(listener)
  return () => settledListeners.delete(listener)
}

/**
 * Returns the Lexemes of a pulled chunk that may replace the copies in Redux: none that a local write has changed since,
 * and none read before the Lexeme index had applied such a write.
 */
export const freshPulledLexemes = ({ lexemeIndex: pulled, lexemeHeadSeq }: ThoughtIndices): Index<Lexeme> => {
  const fresh: Index<Lexeme> = {}
  for (const [key, lexeme] of Object.entries(pulled)) {
    if (unconfirmedLexemes.has(key)) continue
    if (lexemeHeadSeq !== undefined && lexemeHeadSeq < (confirmedLexemeSeqs.get(key) ?? -1)) continue
    if (lexemeHeadSeq !== undefined) advance(confirmedLexemeSeqs, key, lexemeHeadSeq)
    fresh[key] = lexeme
  }
  return fresh
}

/** Fields that exist only in Redux. A stored copy lacks them, so they are kept while the value is unchanged. */
const IN_MEMORY_FIELDS = ['pendingFormat', 'generating', 'generatingPlaceholder', 'splitSource'] as const

/** Returns the stored copy of a thought with the in-memory fields of the copy in Redux, while the value is unchanged. */
export const keepInMemoryFields = (current: Thought | undefined, stored: Thought): Thought =>
  current && current.value === stored.value
    ? { ...stored, ..._.omitBy(_.pick(current, IN_MEMORY_FIELDS), _.isUndefined) }
    : stored

/** Fields of a loaded thought that a pull can find changed in storage. Rank is em's own projection of the order. */
const STORED_FIELDS = ['value', 'created', 'lastUpdated', 'updatedBy', 'archived', 'parentId'] as const

/**
 * Returns the thoughts of a pulled chunk that may replace the copies in Redux. A pull fills in missing and pending
 * thoughts. It replaces a loaded thought only when the read is fresh and storage differs, as after a failed readback,
 * and then keeps the thought's rank while its parent is unchanged, since the readback owns sibling order.
 */
export const freshPulledThoughts = (
  thoughtIndex: Index<Thought>,
  { thoughtIndex: pulled, headSeq }: ThoughtIndices,
): Index<Thought> => {
  const fresh: Index<Thought> = {}
  for (const [key, thought] of Object.entries(pulled)) {
    const id = key as ThoughtId
    if (!isReadFresh(id, headSeq)) continue
    markRead(id, headSeq)

    const current = thoughtIndex[id]
    if (!current || current.pending) {
      fresh[id] = thought
      continue
    }
    if (
      STORED_FIELDS.every(field => current[field] === thought[field]) &&
      _.isEqual(current.childrenMap, thought.childrenMap)
    )
      continue
    const stored = keepInMemoryFields(current, thought)
    fresh[id] = current.parentId === stored.parentId ? { ...stored, rank: current.rank } : stored
  }
  return fresh
}

export default {
  beginLocalWrite,
  freshPulledLexemes,
  freshPulledThoughts,
  isReadFresh,
  isUnconfirmed,
  keepInMemoryFields,
  markRead,
  minHeadSeq,
  onWritesSettled,
  withHeadSeq,
}
