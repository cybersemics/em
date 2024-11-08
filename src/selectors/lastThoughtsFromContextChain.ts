import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import getLexeme from '../selectors/getLexeme'
import appendToPath from '../util/appendToPath'
import headValue from '../util/headValue'
import getThoughtById from './getThoughtById'
import thoughtToPath from './thoughtToPath'

/** Generates a SimplePath from the last segment of a context chain. */
const lastThoughtsFromContextChain = (state: State, contextChain: SimplePath[]): SimplePath => {
  if (contextChain.length === 1) return contextChain[0]

  // the last path in the context chain is a context within a context view
  const simplePath = contextChain[contextChain.length - 1]

  // the second-to-last path in the context chain is the closest context view
  const pathContextView = contextChain[contextChain.length - 2]

  // get the contexts in the context view via the Lexeme
  const lexeme = getLexeme(state, headValue(state, pathContextView))

  if (!lexeme) {
    console.error('Lexeme not found', pathContextView)
    return contextChain[0]
  }

  // find the context whose parent matches path
  /*
    e.g.

    - a
      - m(1)
        - x
    - b
      - m(2)
        - y

    Context view is activated on /b/m
    Cursor is on /b/m/a
    contextChain is [['b', m'], ['a']]
    contexts of /b/m are [m(1), m(2)]

    This will find m(1) since its parent matches the cursor 'a'

  */
  const id = lexeme.contexts.find(cxid => getThoughtById(state, cxid)?.parentId === simplePath[0])!
  const contextPath = thoughtToPath(state, id)

  if (!contextPath) throw new Error(`SimplePath not found for thought: ${id}`)

  return appendToPath(contextPath, ...simplePath.slice(1))
}

export default lastThoughtsFromContextChain
