import * as murmurHash3 from 'murmurhash3js'
import globals from '../globals'
import { ID } from '../constants'

// util
import { escapeSelector } from './escapeSelector'
import { Context, ContextHash } from '../types'
import { normalizeThought } from './normalizeThought'

const SEPARATOR_TOKEN = '__SEP__'

/** Encode the thoughts (and optionally rank) as a string. */
export const hashContext = (thoughts: Context, rank?: number): ContextHash => (globals.disableThoughtHashing ? ID : murmurHash3.x64.hash128)(thoughts
  .map(thought => thought ? escapeSelector(normalizeThought(thought)) : '')
  .join(SEPARATOR_TOKEN)
  + (typeof rank === 'number' ? SEPARATOR_TOKEN + rank : '')) as ContextHash
