import { State } from '../util/initialState'

/** Sets the toolbar overlay id. */
export const setToolbarOverlay = (state: State, { id }: { id: string | null }) => ({
  ...state,
  toolbarOverlay: id
})

/** Sets scrollPrioritized. */
export const prioritizeScroll = (state: State, { val }: { val?: boolean }) => ({
  ...state,
  scrollPrioritized: val
})
