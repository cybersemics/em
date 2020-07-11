// util
import {
  isDocumentEditable,
} from '../util'

// eslint-disable-next-line jsdoc/require-jsdoc
const exec = dispatch => dispatch({ type: 'newGrandChild' })

export default {
  id: 'newGrandChild',
  name: 'New Grand Child',
  description: 'Create a new grand child in the current thought. Add it to the first visible subthought.',
  gesture: 'rdrd',
  canExecute: () => isDocumentEditable(),
  exec
}
