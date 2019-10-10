import { equalItemsRanked } from '../util'

export const toggleCodeView = (state) => ({ value }) => ({
  codeView: equalItemsRanked(state.cursor, state.codeView) || value === false ? null : state.cursor
})