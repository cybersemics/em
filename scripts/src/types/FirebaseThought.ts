import Index from '../../../src/@types/IndexType'
import Thought from '../../../src/@types/Thought'
import ThoughtDb from '../../../src/@types/Thought'

// Firebase omits empty arrays and objects, so account for that in the type.
type FirebaseThought = Omit<ThoughtDb, 'children'> & { children?: Index<Thought> }

export default FirebaseThought
