import { ComparatorFunction } from '../@types'
import { makeCompareByProp } from './makeCompareByProp'

export const compareByRank: ComparatorFunction<{ rank: number }> = makeCompareByProp('rank')
