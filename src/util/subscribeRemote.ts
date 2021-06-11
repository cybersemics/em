import { firebaseChangeTypes, subscribe } from '../data-providers/firebase'
import { Lexeme, Parent } from '../types'
import { hashContext } from './hashContext'
import { hashThought } from './hashThought'
import { SessionType } from './sessionManager'
import { getMergeAndApplyUpdates, shouldIncludeUpdate, Updates } from './subscriptionUtils'

const firebaseChangeHandlers = {
  contextIndex: {
    [firebaseChangeTypes.create]: (change: Parent) => {
      return { contextIndexUpdates: change && shouldIncludeUpdate(change, SessionType.REMOTE) ? { [hashContext(change.context)]: change } : {} }
    },
    [firebaseChangeTypes.update]: (change: Parent) => {
      return { contextIndexUpdates: change && shouldIncludeUpdate(change, SessionType.REMOTE) ? { [hashContext(change.context)]: change } : {} }
    },
    [firebaseChangeTypes.delete]: (change: Parent) => {
      return { contextIndexUpdates: change && shouldIncludeUpdate(change, SessionType.REMOTE) ? { [hashContext(change.context)]: null } : {} }
    }
  },
  thoughtIndex: {
    [firebaseChangeTypes.create]: (change: Lexeme) => {
      return { thoughtIndexUpdates: change && shouldIncludeUpdate(change, SessionType.REMOTE) ? { [hashThought(change.value)]: change } : {} }
    },
    [firebaseChangeTypes.update]: (change: Lexeme) => {
      return { thoughtIndexUpdates: change && shouldIncludeUpdate(change, SessionType.REMOTE) ? { [hashThought(change.value)]: change } : {} }
    },
    [firebaseChangeTypes.delete]: (change: Lexeme) => {
      return { thoughtIndexUpdates: change && shouldIncludeUpdate(change, SessionType.REMOTE) ? { [hashThought(change.value)]: null } : {} }
    }
  },

}

/** Setup firebase subscriptions to handle local sync. */
export const initFirebaseSubscriptions = (userId: string) => {
  subscribe<Updates>(userId, getMergeAndApplyUpdates(), firebaseChangeHandlers)
}
