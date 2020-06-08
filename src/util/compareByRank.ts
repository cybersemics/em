import { makeCompareByProp } from './makeCompareByProp'
import { ComparatorFunction } from '../utilTypes'

export const compareByRank: ComparatorFunction<Object> = makeCompareByProp('rank')
