import Index from '../../../src/@types/IndexType'
import Lexeme from '../../../src/@types/Lexeme'
import ThoughtId from '../../../src/@types/ThoughtId'

// Firebase omits empty arrays and objects, so account for that in the type.
type FirebaseLexeme = Omit<Lexeme, 'contexts'> & { contexts?: Index<ThoughtId> }

export default FirebaseLexeme
