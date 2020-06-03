import * as murmurHash3 from 'murmurhash3js'
import globals from '../globals'
import { ID } from '../constants'

// util
import { escapeSelector } from './escapeSelector'
import { pathToContext } from './pathToContext'
import { Context, Path } from '../types'

const SEPARATOR_TOKEN = '__SEP__'

/** Encode the thoughts (and optionally rank) as a string. */
export const hashContext = (thoughts: Path | Context, rank?: number): string => (globals.disableThoughtHashing ? ID : murmurHash3.x64.hash128)(pathToContext(thoughts)
  .map(thought => thought ? escapeSelector(thought) : '')
  .join('__SEP__')
  + (typeof rank === 'number' ? SEPARATOR_TOKEN + rank : ''))
