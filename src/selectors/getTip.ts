import State from '../@types/State'
import TipId from '../@types/TipId'

/** Gets the tip to be displayed. */
export const getTip = (state: State): TipId | undefined => state.tips[0]

export default getTip
