import * as murmurHash3 from 'murmurhash3js'
import Context from '../@types/Context'
import ContextHash from '../@types/ContextHash'
import { escapeSelector } from './escapeSelector'
import normalizeThought from './normalizeThought'

const SEPARATOR_TOKEN = '__SEP__'

/** Encodes the context (and optionally rank) as a string using MurmurHash. */
const hashContext = (context: Context, rank?: number): ContextHash => {
  return murmurHash3.x64.hash128(
    context.map(thought => (thought ? escapeSelector(normalizeThought(thought)) : '')).join(SEPARATOR_TOKEN) +
      (typeof rank === 'number' ? SEPARATOR_TOKEN + rank : ''),
  ) as ContextHash
}

export default hashContext
