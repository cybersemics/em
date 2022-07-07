import Index from '../../../src/@types/IndexType'
import Lexeme from '../../../src/@types/Lexeme'
import Thought from '../../../src/@types/Thought'
import ThoughtId from '../../../src/@types/ThoughtId'
import ThoughtWithChildren from '../../../src/@types/ThoughtWithChildren'
import FirebaseThought from './FirebaseThought'

interface Database {
  email: string
  lastClientId?: string
  lastUpdated?: string
  lexemeIndex: Index<any>
  schemaVersion?: number
  thoughtIndex: Index<any>
}

export default Database
