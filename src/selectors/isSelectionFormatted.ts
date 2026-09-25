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
  return paths.length > 0 && paths.every(path => !!getCommandState(pathToThought(state, path)?.value ?? '')[command])
}

export default isSelectionFormatted
