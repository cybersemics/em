import { SubscriptionUpdate } from './SubscriptionUpdate'
import { Index } from './IndexType'
import { Parent } from './Parent'
import { Lexeme } from './Lexeme'

export interface ThoughtSubscriptionUpdates {
  contextIndex: Index<SubscriptionUpdate<Parent>>
  thoughtIndex: Index<SubscriptionUpdate<Lexeme>>
}
