import Index from '../../../src/@types/IndexType'
import Thought from '../../../src/@types/Thought'
import ThoughtWithChildren from '../../../src/@types/Thought'

// Firebase omits empty arrays and objects, so account for that in the type.
type FirebaseThought = Omit<ThoughtWithChildren, 'children'> & { children?: Index<Thought> }

export default FirebaseThought
