import * as murmurHash3 from 'murmurhash3js'
import globals from '../globals'
import { ID } from '../constants'

// util
import { escapeSelector } from './escapeSelector.js'
import { pathToContext } from './pathToContext'

const SEPARATOR_TOKEN = '__SEP__'

/** Encode the thoughts (and optionally rank) as a string. */
export const hashContext = (thoughts, rank) => (globals.disableThoughtHashing ? ID : murmurHash3.x64.hash128)(pathToContext(thoughts)
  .map(thought => thought ? escapeSelector(thought) : '')
  .join('__SEP__')
  + (rank != null ? SEPARATOR_TOKEN + rank : ''))
