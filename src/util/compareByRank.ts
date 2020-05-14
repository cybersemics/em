//@ts-nocheck

import { makeCompareByProp } from './makeCompareByProp'

export const compareByRank: ComparatorFunction<Object> = makeCompareByProp('rank')
