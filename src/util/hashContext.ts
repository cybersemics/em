import * as murmurHash3 from 'murmurhash3js'
import moize from 'moize'
import globals from '../globals'

// util
import { escapeSelector } from './escapeSelector'
import { Context, ContextHash } from '../@types'
import { normalizeThought } from './normalizeThought'

const SEPARATOR_TOKEN = '__SEP__'

/** Encodes the context as a string with no hashing. Useful for debugging purposes. */
const encodePlainContext = (context: Context, rank?: number): ContextHash =>
  (context.map(thought => (thought ? escapeSelector(normalizeThought(thought)) : '')).join(SEPARATOR_TOKEN) +
    (typeof rank === 'number' ? SEPARATOR_TOKEN + rank : '')) as ContextHash

/** Encodes the context (and optionally rank) as a string using MurmurHash. */
const encodeHashedContext = (context: Context, rank?: number): ContextHash => {
  return murmurHash3.x64.hash128(
    context.map(thought => (thought ? escapeSelector(normalizeThought(thought)) : '')).join(SEPARATOR_TOKEN) +
      (typeof rank === 'number' ? SEPARATOR_TOKEN + rank : ''),
  ) as ContextHash
}

/** Returns a hashContext function with or without hashing at compile-time for performance. */
const hashContextFunction = globals.disableThoughtHashing ? encodePlainContext : encodeHashedContext

export const hashContext = moize(hashContextFunction, {
  isDeepEqual: true,
  maxSize: 10000,
  profileName: 'hashContext',
})
