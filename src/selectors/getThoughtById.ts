import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtReaderState from '../@types/ThoughtReaderState'

const cached = new WeakMap<ThoughtReaderState['thoughtUi'][string], WeakMap<Thought, Thought>>()

/** Combines canonical document content with temporary editor fields, retaining unchanged object identities. */
const getThoughtById = (state: ThoughtReaderState, id: ThoughtId): Thought | undefined => {
  const thought = state.thoughts.getThought(id)
  const ui = state.thoughtUi[id]
  if (!thought || !ui) return thought
  let thoughts = cached.get(ui)
  if (!thoughts) {
    thoughts = new WeakMap()
    cached.set(ui, thoughts)
  }
  let result = thoughts.get(thought)
  if (!result) {
    result = Object.freeze({ ...thought, ...ui })
    thoughts.set(thought, result)
  }
  return result
}

export default getThoughtById
