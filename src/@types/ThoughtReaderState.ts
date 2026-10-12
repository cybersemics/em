import State from './State'
import ThoughtspaceView from './ThoughtspaceView'

/** Editor state with structural thought reads, without requiring derived lexeme memberships. */
type ThoughtReaderState = Omit<State, 'thoughts'> & {
  thoughts: Pick<ThoughtspaceView, 'getThought' | 'getChildren' | 'getPosition'>
}

export default ThoughtReaderState
