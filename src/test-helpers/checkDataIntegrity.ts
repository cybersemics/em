import { hashThought } from '../util'
import { Index, Thought, State } from '../@types'
import { ROOT_PARENT_ID } from '../constants'
/**
 * Recurively get all the thought ids that are not available in the contextIndex.
 */
const recursiveCheckParent = (contextIndex: Index<Thought>, thoughtIds: string[]): string[] => {
  return thoughtIds.reduce<string[]>((accum, thoughtId) => {
    const thought = contextIndex[thoughtId]
    if (!thought) return [...accum, thoughtId]
    if (thought.parentId === ROOT_PARENT_ID) return []
    return [...accum, ...recursiveCheckParent(contextIndex, [thought.parentId])]
  }, [])
}

/** Checks if there exists a entry in lexemeIndex for each entry in contextIndex and vice versa, and returns the migging parent ids and missing lexemes values. */
const checkDataIntegrity = (state: State, max = 100000) => {
  const { contextIndex, lexemeIndex } = state.thoughts
  let missingParentIds: string[] = []
  let missingLexemeValues: string[] = []

  Object.keys(lexemeIndex)
    .slice(0, max)
    .forEach(key => {
      const lexeme = lexemeIndex[key]
      if (!lexeme.contexts) return
      missingParentIds = [...missingParentIds, ...recursiveCheckParent(contextIndex, lexeme.contexts)]
    })

  Object.keys(contextIndex)
    .slice(0, max)
    .forEach(key => {
      const thought = contextIndex[key]

      const thoughtHash = hashThought(thought.value)

      const lexemeParent = lexemeIndex[thoughtHash]

      if (!lexemeParent) missingLexemeValues = [...missingLexemeValues, thought.value]

      if (!thought.children) return

      thought.children.forEach(childId => {
        const childThought = contextIndex[childId]

        if (!childThought) return

        const thoughtHash = hashThought(childThought.value)

        const lexeme = lexemeIndex[thoughtHash]

        if (!lexeme) missingLexemeValues = [...missingLexemeValues, childThought.value]
      })
    })

  return { missingParentIds, missingLexemeValues }
}

export default checkDataIntegrity

export {}
