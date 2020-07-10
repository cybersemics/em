// util
import {
  isDocumentEditable,
} from '../util'

import newGrandChild from '../action-creators/newGrandChild'

// eslint-disable-next-line jsdoc/require-jsdoc
const exec = dispatch => dispatch(newGrandChild())

export default {
  id: 'newGrandChild',
  name: 'New Grand Child',
  description: 'Create a new grand child in the current thought. Add it to the first visible subthought.',
  gesture: 'rdrd',
  canExecute: () => isDocumentEditable(),
  exec
}
