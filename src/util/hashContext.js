import * as murmurHash3 from 'murmurhash3js'
import globals from '../globals.js'
import { ID } from '../constants.js'
import _ from 'lodash'

// util
import { escapeSelector } from './escapeSelector.js'
import { pathToContext } from './pathToContext.js'

/** Encode the thoughts (and optionally rank) as a string. */
export const hashContext = _.memoize((thoughts, rank) => (globals.disableThoughtHashing ? ID : murmurHash3.x64.hash128)(pathToContext(thoughts)
  .map(thought => thought ? escapeSelector(thought) : '')
  .join('__SEP__')
  + (rank != null ? '__SEP__' + rank : ''))
)
