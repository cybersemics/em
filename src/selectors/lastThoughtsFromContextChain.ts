import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtContext from '../@types/ThoughtContext'
import contextToPath from '../selectors/contextToPath'
import getLexeme from '../selectors/getLexeme'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'
import splice from '../util/splice'
import thoughtToContext from './thoughtToContext'

/** Generates path from the last segment of a context chain. */
const lastThoughtsFromContextChain = (state: State, contextChain: SimplePath[]): SimplePath => {
  if (contextChain.length === 1) return contextChain[0]
  const penult = contextChain[contextChain.length - 2]
  const lexeme = getLexeme(state, headValue(state, penult))

  // guard against missing lexeme (although this should never happen)
  if (!lexeme) {
    console.error('Lexeme not found', penult)
    return contextChain[0]
  }

  const ult = contextChain[contextChain.length - 1]
  const thought = lexeme.contexts.find(thought => thought === ult[0]) as ThoughtContext
  // MIGRATION_TODO: Write a function that returns path given the thought id.
  const path = contextToPath(state, thoughtToContext(state, thought)!)
  if (!path) throw new Error(`Path not found for thought id: ${thought}`)
  const pathPrepend = parentOf(path)
  return pathPrepend.concat(splice(ult, 1, 0, head(penult))) as SimplePath
}

export default lastThoughtsFromContextChain
