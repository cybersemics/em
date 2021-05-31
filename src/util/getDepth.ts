import { hashContext } from '.'
import { Context } from '../types'
import { State } from './initialState'
import { unroot } from './unroot'

/** Get max depth of a visible context. */
export const getDepth = (state: State, context: Context): number => {
  const contextIndex = state.thoughts.contextIndex
  const contextEncoded = hashContext(context)
  const parentEntry = contextIndex[contextEncoded]
  const children = parentEntry?.children ?? []
  return children.length === 0
    ? context.length
    : Math.max(...children.map(child => {
      const contextNew = [...unroot(context), child.value]
      return getDepth(state, contextNew)
    }))
}
