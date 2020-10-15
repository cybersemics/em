import { makeCompareByProp } from './makeCompareByProp'
import { ComparatorFunction, GenericObject } from '../types'

export const compareByRank: ComparatorFunction<GenericObject> = makeCompareByProp('rank')
