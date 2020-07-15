import { isDocumentEditable } from '../util'

const newGrandChild = {
  id: 'newGrandChild',
  name: 'New Grand Child',
  description: 'Create a new grand child in the current thought. Add it to the first visible subthought.',
  gesture: 'rdrd',
  canExecute: () => isDocumentEditable(),
  exec: dispatch => dispatch({ type: 'newGrandChild' })
}

export default newGrandChild
