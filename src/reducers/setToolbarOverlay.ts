import _ from 'lodash'
import State from '../@types/State'

/** Sets the toolbar overlay id. */
const setToolbarOverlay = _.curry((state: State, { id }: { id: string | null }) => ({
  ...state,
  toolbarOverlay: id,
}))

export default setToolbarOverlay
