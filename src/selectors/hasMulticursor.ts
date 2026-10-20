import State from '../@types/State'

/** Returns true if there is a multicursor. */
const hasMulticursor = (state: Pick<State, 'multicursors'>) => !!Object.keys(state.multicursors).length

export default hasMulticursor
