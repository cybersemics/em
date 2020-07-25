import * as murmurHash3 from 'murmurhash3js'
import globals from '../globals'
import { ID } from '../constants'
import _, { trim } from 'lodash'

// util
import { escapeSelector } from './escapeSelector'
import { pathToContext } from './pathToContext'
import { Context, Path } from '../types'
import { stripTags } from './stripTags'
import { stripEmojiWithText } from './stripEmojiWithText'
import { singularize } from './singularize'

const SEPARATOR_TOKEN = '__SEP__'

/** Converts a string to lowecase. */
const lower = (s: string) => s.toLowerCase()

/** Encode the thoughts (and optionally rank) as a string. */
export const hashContext = (thoughts: Context | Path, rank?: number): string => (globals.disableThoughtHashing ? ID : murmurHash3.x64.hash128)(pathToContext(thoughts)
  .map(thought => thought ? escapeSelector(thought) : '')
  .map(thought => _.flow([
    stripTags,
    lower,
    trim,
    stripEmojiWithText,
    singularize,
  ])(thought))
  .join('__SEP__')
  + (typeof rank === 'number' ? SEPARATOR_TOKEN + rank : ''))
