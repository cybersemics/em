import _ from 'lodash'
import { setCursor } from '../reducers'
import { rankThoughtsFirstMatch } from '../selectors'
import { State } from '../util/initialState'

/** A reducer that sets the cursor to the given unranked path. Uses rankThoughtsFirstMatch. */
const setCursorFirstMatch = (state: State, pathUnranked: string[]): State =>
  setCursor(state, {
    thoughtsRanked: rankThoughtsFirstMatch(state, pathUnranked),
  })

export default _.curryRight(setCursorFirstMatch)
