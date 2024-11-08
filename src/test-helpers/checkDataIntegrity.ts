import Index from '../@types/IndexType'
import State from '../@types/State'
import Thought from '../@types/Thought'
import { ROOT_PARENT_ID } from '../constants'
import hashThought from '../util/hashThought'

/**
 * Recurively get all the thought ids that are not available in the thoughtIndex.
 */
const recursiveCheckParent = (thoughtIndex: Index<Thought>, thoughtIds: string[]): string[] => {
  return thoughtIds.reduce<string[]>((accum, thoughtId) => {
    const thought = thoughtIndex[thoughtId]
    if (!thought) return [...accum, thoughtId]
    if (thought.parentId === ROOT_PARENT_ID) return []
    return [...accum, ...recursiveCheckParent(thoughtIndex, [thought.parentId])]
  }, [])
}

/** Checks if there exists a entry in lexemeIndex for each entry in thoughtIndex and vice versa, and returns the migging parent ids and missing lexemes values. */
const checkDataIntegrity = (state: State, max = 100000) => {
  const { thoughtIndex, lexemeIndex } = state.thoughts
  let missingParentIds: string[] = []
  let missingLexemeValues: string[] = []

  Object.keys(lexemeIndex)
    .slice(0, max)
    .forEach(key => {
      const lexeme = lexemeIndex[key]
      if (!lexeme.contexts) return
      missingParentIds = [...missingParentIds, ...recursiveCheckParent(thoughtIndex, lexeme.contexts)]
    })

  Object.keys(thoughtIndex)
    .slice(0, max)
    .forEach(key => {
      const thought = thoughtIndex[key]

      const thoughtHash = hashThought(thought.value)

      const lexemeParent = lexemeIndex[thoughtHash]

      if (!lexemeParent) missingLexemeValues = [...missingLexemeValues, thought.value]

      if (!thought.childrenMap) return

      Object.values(thought.childrenMap).forEach(childId => {
        const childThought = thoughtIndex[childId]

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
