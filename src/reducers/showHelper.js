// util
import {
  canShowHelper,
} from '../util.js'

export const showHelper = (state, { id, data }) =>
  canShowHelper(id, state)
    ? {
      showHelper: id,
      showHelperIcon: null,
      helperData: data || state.helperData
    }
    : {}
