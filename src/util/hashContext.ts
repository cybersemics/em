import * as murmurHash3 from 'murmurhash3js'
import Context from '../@types/Context'
import ContextHash from '../@types/ContextHash'
import globals from '../globals'
import { escapeSelector } from './escapeSelector'
import normalizeThought from './normalizeThought'

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
const hashContextFunction = globals.debugIds ? encodePlainContext : encodeHashedContext

// memoization overhead is too great
// strict equal has far fewer cache hits, so is the slowest
// deep equal is not noticeably different than unmemoized
// export const hashContext = moize(hashContextFunction, {
//   maxSize: 10000,
//   profileName: 'hashContext',
// })
const hashContext = hashContextFunction

export default hashContext
