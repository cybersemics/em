import { makeCompareByProp } from './makeCompareByProp'
import { ComparatorFunction, Index } from '../types'

export const compareByRank: ComparatorFunction<Index> = makeCompareByProp('rank')
