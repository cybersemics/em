import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'

const cached = new WeakMap<State['thoughtUi'][string], WeakMap<Thought, Thought>>()

/** Combines canonical document content with temporary editor fields, retaining unchanged object identities. */
const getThoughtById = (state: State, id: ThoughtId): Thought | undefined => {
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
