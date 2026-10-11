import State from '../@types/State'
import getCommandState from '../util/getCommandState'
import pathToThought from './pathToThought'
import selectedPaths from './selectedPaths'

/** Returns true if the whole value of every selected thought has the given formatting, which is when the toolbar highlights it (see commandStateStore). */
const isSelectionFormatted = (
  state: State,
  command: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code',
): boolean => {
  const paths = selectedPaths(state)
  return (
    paths.length > 0 &&
    paths.every(path => {
      const thought = pathToThought(state, path)
      // An empty thought holds its formatting as a pending format until text is typed into it (see formatSelection).
      return !!getCommandState((thought?.value.length === 0 ? thought.pendingFormat : thought?.value) ?? '')[command]
    })
  )
}

export default isSelectionFormatted
