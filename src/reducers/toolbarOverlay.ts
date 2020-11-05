import _ from 'lodash'
import { State } from '../util/initialState'

/** Sets the toolbar overlay id. */
export const setToolbarOverlay = _.curry((state: State, { id }: { id: string | null }) => ({
  ...state,
  toolbarOverlay: id
}))

/** Sets scrollPrioritized. */
export const prioritizeScroll = _.curry((state: State, { val }: { val?: boolean }) => ({
  ...state,
  scrollPrioritized: val
}))
