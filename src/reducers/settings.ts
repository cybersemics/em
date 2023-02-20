import _ from 'lodash'
import State from '../@types/State'
import { EM_TOKEN } from '../constants'
import findDescendant from '../selectors/findDescendant'
import toggleAttribute from './toggleAttribute'

/** Sets a setting thought. */
const settings = (state: State, { key, value }: { key: string; value: string }) => {
  const emContext = ['Settings', key, value]
  const exists = !!findDescendant(state, EM_TOKEN, emContext)
  return exists ? state : toggleAttribute(state, { path: [EM_TOKEN], values: emContext })
}

export default _.curryRight(settings)
