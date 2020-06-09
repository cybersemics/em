/**
 * @packageDocumentation
 * @module util.compareByRank
 */

import { makeCompareByProp } from './makeCompareByProp'
import { ComparatorFunction, GenericObject } from '../utilTypes'

export const compareByRank: ComparatorFunction<GenericObject> = makeCompareByProp('rank')
