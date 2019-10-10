import { canShowHelper } from '../util'

export const showHelperIcon = (state) => ({ id, data }) =>
  canShowHelper(id, state)
    ? {
      showHelperIcon: id,
      helperData: data
    }
  : {}