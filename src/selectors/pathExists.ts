import { State } from '../util/initialState'
import { ROOT_TOKEN } from '../constants'
import { hasChild } from '../selectors'

/** Returns true if every child in the path exists. */
const pathExists = (state: State, pathUnranked: string[]) =>
  pathUnranked.every((value, i) => hasChild(state, i === 0 ? [ROOT_TOKEN] : pathUnranked.slice(0, i), value))

export default pathExists
