import ComparatorFunction from '../@types/ComparatorFunction'
import makeCompareByProp from './makeCompareByProp'

const compareByRank: ComparatorFunction<{ rank: number }> = makeCompareByProp('rank')

export default compareByRank
