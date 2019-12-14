import * as murmurHash3 from 'murmurhash3js'
import globals from '../globals.js'

// util
import { escapeSelector } from './escapeSelector.js'

/** Encode the items (and optionally rank) as a string for use in a className. */
export const encodeItems = (items, rank) => (globals.disableThoughtHashing ? x => x : murmurHash3.x64.hash128)(items
  .map(item => item ? escapeSelector(item) : '')
  .join('__SEP__')
  + (rank != null ? '__SEP__' + rank : ''))
