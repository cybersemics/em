import { firebaseChangeTypes, subscribe } from '../data-providers/firebase'
import { Lexeme, Parent } from '../types'
import { hashContext } from './hashContext'
import { hashThought } from './hashThought'
import { SessionType } from './sessionManager'
import { getSubscriptionUtils, Updates } from './subscriptionUtils'

/** Get Firebase change Handlers. */
const getFirebaseChangeHandlers = ({ shouldIncludeUpdate }: ReturnType<typeof getSubscriptionUtils>) => ({
  contextIndex: {
    [firebaseChangeTypes.create]: (change: Parent) => {
      return {
        contextIndexUpdates:
          change && shouldIncludeUpdate(change, SessionType.REMOTE) ? { [hashContext(change.context)]: change } : {},
      }
    },
    [firebaseChangeTypes.update]: (change: Parent) => {
      return {
        contextIndexUpdates:
          change && shouldIncludeUpdate(change, SessionType.REMOTE) ? { [hashContext(change.context)]: change } : {},
      }
    },
    [firebaseChangeTypes.delete]: (change: Parent) => {
      return {
        contextIndexUpdates:
          change && shouldIncludeUpdate(change, SessionType.REMOTE) ? { [hashContext(change.context)]: null } : {},
      }
    },
  },
  thoughtIndex: {
    [firebaseChangeTypes.create]: (change: Lexeme) => {
      return {
        thoughtIndexUpdates:
          change && shouldIncludeUpdate(change, SessionType.REMOTE) ? { [hashThought(change.value)]: change } : {},
      }
    },
    [firebaseChangeTypes.update]: (change: Lexeme) => {
      return {
        thoughtIndexUpdates:
          change && shouldIncludeUpdate(change, SessionType.REMOTE) ? { [hashThought(change.value)]: change } : {},
      }
    },
    [firebaseChangeTypes.delete]: (change: Lexeme) => {
      return {
        thoughtIndexUpdates:
          change && shouldIncludeUpdate(change, SessionType.REMOTE) ? { [hashThought(change.value)]: null } : {},
      }
    },
  },
})

/** Setup firebase subscriptions to handle local sync. */
export const initFirebaseSubscriptions = (
  userId: string,
  subscritpionUtils: ReturnType<typeof getSubscriptionUtils>,
) => {
  subscribe<Updates>(userId, subscritpionUtils.getMergeAndApplyUpdates(), getFirebaseChangeHandlers(subscritpionUtils))
}
