import { SubscriptionUpdate } from './SubscriptionUpdate'
import { Index } from './IndexType'
import { Thought } from './Thought'
import { Lexeme } from './Lexeme'

export interface ThoughtSubscriptionUpdates {
  contextIndex: Index<SubscriptionUpdate<Thought>>
  thoughtIndex: Index<SubscriptionUpdate<Lexeme>>
}
