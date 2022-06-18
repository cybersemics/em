import makeCompareByProp from './makeCompareByProp'
import ComparatorFunction from '../@types/ComparatorFunction'

const compareByRank: ComparatorFunction<{ rank: number }> = makeCompareByProp('rank')

export default compareByRank
