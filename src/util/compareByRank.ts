import { makeCompareByProp } from './makeCompareByProp'
import { ComparatorFunction } from '../types'

export const compareByRank: ComparatorFunction<{ rank: number }> =
  makeCompareByProp('rank')
