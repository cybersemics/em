// util
import {
  canShowHelper,
} from '../util.js'

export const showHelper = (state, { id, thoughtIndex }) =>
  canShowHelper(id, state)
    ? {
      showHelper: id,
      showHelperIcon: null,
      helperData: thoughtIndex || state.helperData
    }
    : {}
