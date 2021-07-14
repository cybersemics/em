import { SimplePath, State, ThoughtContext } from '../@types'
import { getLexeme, rankThoughtsFirstMatch } from '../selectors'
import { parentOf, head, headValue, splice } from '../util'

/** Generates path from the last segment of a context chain. */
const lastThoughtsFromContextChain = (state: State, contextChain: SimplePath[]): SimplePath => {
  if (contextChain.length === 1) return contextChain[0]
  const penult = contextChain[contextChain.length - 2]
  const lexeme = getLexeme(state, headValue(penult))

  // guard against missing lexeme (although this should never happen)
  if (!lexeme) {
    console.error('Lexeme not found', penult)
    return contextChain[0]
  }

  const ult = contextChain[contextChain.length - 1]
  const parent = lexeme.contexts.find(parent => head(parent.context) === ult[0].value) as ThoughtContext
  const pathPrepend = parentOf(rankThoughtsFirstMatch(state, parent?.context))
  return pathPrepend.concat(splice(ult, 1, 0, head(penult))) as SimplePath
}

export default lastThoughtsFromContextChain
