import Index from './IndexType'
import Lexeme from './Lexeme'
import SubscriptionUpdate from './SubscriptionUpdate'
import Thought from './Thought'

interface ThoughtSubscriptionUpdates {
  thoughtIndex: Index<SubscriptionUpdate<Thought>>
  lexemeIndex: Index<SubscriptionUpdate<Lexeme>>
}

export default ThoughtSubscriptionUpdates
