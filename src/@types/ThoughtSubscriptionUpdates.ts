import SubscriptionUpdate from './SubscriptionUpdate'
import Index from './IndexType'
import Thought from './Thought'
import Lexeme from './Lexeme'

interface ThoughtSubscriptionUpdates {
  thoughtIndex: Index<SubscriptionUpdate<Thought>>
  lexemeIndex: Index<SubscriptionUpdate<Lexeme>>
}

export default ThoughtSubscriptionUpdates
