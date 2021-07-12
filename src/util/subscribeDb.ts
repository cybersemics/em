import { ICreateChange, IDeleteChange, IUpdateChange, IDatabaseChange } from 'dexie-observable/api'
import { dbChangeType, dbTables, getContextById, getThoughtById, subscribe } from '../data-providers/dexie'
import { Parent, Index, Lexeme } from '../types'
import { SessionType } from './sessionManager'
import { getSubscriptionUtils, Updates } from './subscriptionUtils'

/** Get db change handlers. */
const getDbChangeHandlers = ({
  getContextLocal,
  getThoughtLocal,
  getUpdatedObject,
  shouldIncludeUpdate,
}: ReturnType<typeof getSubscriptionUtils>) => ({
  [dbChangeType.created]: (change: IDatabaseChange) => {
    const { table, key, obj } = change as ICreateChange
    return {
      thoughtIndexUpdates:
        table === dbTables.thoughtIndex && shouldIncludeUpdate(obj, SessionType.LOCAL)
          ? { [key as string]: obj as Lexeme }
          : {},
      contextIndexUpdates:
        table === dbTables.contextIndex && shouldIncludeUpdate(obj, SessionType.LOCAL)
          ? { [key as string]: obj as Parent }
          : {},
    }
  },
  [dbChangeType.updated]: async (change: IDatabaseChange) => {
    const { key, table, mods: updates } = change as IUpdateChange

    /**
     * Dexie falsly sends null as a child value if a thought is removed from a context
     * We need to manually filter out such children that can cause the app to break.
     */
    const removeInvalidContexts = (thought: Lexeme): Lexeme => ({
      ...thought,
      contexts: thought.contexts.filter(c => c !== null),
    })

    /** Filter thoughts with null contexts. */
    const filterInvalidContexts = (context: Parent): Parent => ({
      ...context,
      children: context.children.filter(child => child !== null),
    })
    /** Get thought merged with updates. */
    const getThoughtUpdates = async (id: string, updates: Index) => {
      const thought = await getThoughtById(id)
      if (shouldIncludeUpdate({ ...(thought || (updates as Lexeme)) }, SessionType.LOCAL)) {
        const updatedThought = thought ? getUpdatedObject(thought, updates as Lexeme) : null
        return updatedThought ? { [key]: removeInvalidContexts(updatedThought) } : {}
      }
      return {}
    }
    /** Get context merged with updates. */
    const getContextUpdates = async (id: string, updates: Index) => {
      const context = await getContextById(id)
      if (shouldIncludeUpdate({ ...(context || (updates as Parent)) }, SessionType.LOCAL)) {
        const updatedContext = context ? getUpdatedObject(context, updates as Parent) : null
        return updatedContext ? { [key]: filterInvalidContexts(updatedContext) } : {}
      }
      return {}
    }

    return {
      thoughtIndexUpdates: table === dbTables.thoughtIndex ? await getThoughtUpdates(key, updates) : {},
      contextIndexUpdates: table === dbTables.contextIndex ? await getContextUpdates(key, updates) : {},
    }
  },
  [dbChangeType.deleted]: (change: IDatabaseChange) => {
    const { key, table, oldObj } = change as IDeleteChange
    return {
      thoughtIndexUpdates:
        table === dbTables.thoughtIndex &&
        oldObj &&
        oldObj.id &&
        shouldIncludeUpdate(oldObj, SessionType.LOCAL) &&
        getThoughtLocal(key)
          ? { [key as string]: null }
          : {},
      contextIndexUpdates:
        table === dbTables.contextIndex &&
        oldObj &&
        oldObj.id &&
        shouldIncludeUpdate(oldObj, SessionType.LOCAL) &&
        getContextLocal(key)
          ? { [key as string]: null }
          : {},
    }
  },
})

/** Setup db(dexie) subscriptions to handle local sync. */
export const initDbSubscription = (subscriptionUtils: ReturnType<typeof getSubscriptionUtils>) => {
  subscribe<Updates>(subscriptionUtils.getMergeAndApplyUpdates(), getDbChangeHandlers(subscriptionUtils))
}
