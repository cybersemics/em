import { hashThought } from '../util'
import { Index, Parent, State } from '../@types'
import { ROOT_PARENT_ID } from '../constants'
/**
 * Recurively get all the thought ids that are not available in the contextIndex.
 */
const recursiveCheckParent = (contextIndex: Index<Parent>, thoughtIds: string[]): string[] => {
  return thoughtIds.reduce<string[]>((accum, thoughtId) => {
    const thought = contextIndex[thoughtId]
    if (!thought) return [...accum, thoughtId]
    if (thought.parentId === ROOT_PARENT_ID) return []
    return [...accum, ...recursiveCheckParent(contextIndex, [thought.parentId])]
  }, [])
}

/** Checks if there exists a entry in thoughtIndex for each entry in contextIndex and vice versa, and returns the migging parent ids and missing lexemes values. */
const checkDataIntegrity = (state: State, max = 100000) => {
  const { contextIndex, thoughtIndex } = state.thoughts
  let missingParentIds: string[] = []
  let missingLexemeValues: string[] = []

  Object.keys(thoughtIndex)
    .slice(0, max)
    .forEach(key => {
      const lexeme = thoughtIndex[key]
      if (!lexeme.contexts) return
      missingParentIds = [...missingParentIds, ...recursiveCheckParent(contextIndex, lexeme.contexts)]
    })

  Object.keys(contextIndex)
    .slice(0, max)
    .forEach(key => {
      const parent = contextIndex[key]

      const thoughtHash = hashThought(parent.value)

      const lexemeParent = thoughtIndex[thoughtHash]

      if (!lexemeParent) missingLexemeValues = [...missingLexemeValues, parent.value]

      if (!parent.children) return

      parent.children.forEach(childId => {
        const thought = contextIndex[childId]

        if (!thought) return

        const thoughtHash = hashThought(thought.value)

        const lexeme = thoughtIndex[thoughtHash]

        if (!lexeme) missingLexemeValues = [...missingLexemeValues, thought.value]
      })
    })

  return { missingParentIds, missingLexemeValues }
}

export default checkDataIntegrity

export {}
