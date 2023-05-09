import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { clientId } from '../data-providers/yjs'
import updateThoughts from '../reducers/updateThoughts'
import { getAllChildren } from '../selectors/getChildren'
import getLexeme from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import createChildrenMap from '../util/createChildrenMap'
import createId from '../util/createId'
import hashThought from '../util/hashThought'
import head from '../util/head'
import keyValueBy from '../util/keyValueBy'
import normalizeThought from '../util/normalizeThought'
import timestamp from '../util/timestamp'

interface Payload {
  // directly adds children to thought.childrenMap with no additional validation
  children?: ThoughtId[]
  id?: ThoughtId
  /** Callback for when the updates have been synced with IDB. */
  idbSynced?: () => void
  path: Path
  rank: number
  splitSource?: ThoughtId
  value: string
}
/**
 * Creates a new thought with a known context and rank. Does not update the cursor. Use the newThought reducer for a higher level function.
 *
 * @param addAsContext Adds the given context to the new thought.
 */
const createThought = (state: State, { path, value, rank, id, idbSynced, children, splitSource }: Payload) => {
  id = id || createId()

  // create Lexeme if it does not exist
  const lexeme: Lexeme = {
    ...(getLexeme(state, value) || {
      lemma: normalizeThought(value),
      contexts: [],
      created: timestamp(),
      lastUpdated: timestamp(),
      updatedBy: clientId,
    }),
  }

  const parentId = head(path)
  const parent = getThoughtById(state, parentId)

  const thoughtIndexUpdates: Index<Thought> = {}

  if (path.length > 0) {
    const newValue = value

    const siblings = getAllChildren(state, parentId)
      .filter(child => child !== id)
      .concat(id)

    const thoughtNew: Thought = {
      id,
      parentId: parentId,
      // Do not use createChildrenMap since the thoughts must exist and createThought does not require the thoughts to exist.
      childrenMap: children ? keyValueBy(children || {}, id => ({ [id]: id })) : {},
      lastUpdated: timestamp(),
      rank,
      value: newValue,
      updatedBy: clientId,
      ...(splitSource ? { splitSource } : null),
    }
    thoughtIndexUpdates[id] = thoughtNew

    // insert the new thought into the state just for createChildrenMap
    // otherwise createChildrenMap will not be able to find the new child and thus not properly detect meta attributes which are stored differently
    const stateWithNewThought = {
      ...state,
      thoughts: { ...state.thoughts, thoughtIndex: { ...state.thoughts.thoughtIndex, [id]: thoughtNew } },
    }

    thoughtIndexUpdates[parentId] = {
      ...parent,
      id: parentId,
      childrenMap: createChildrenMap(stateWithNewThought, siblings),
      lastUpdated: timestamp(),
      updatedBy: clientId,
    }
  }

  // if adding as the context of an existing thought
  let lexemeNew: Lexeme | undefined // eslint-disable-line fp/no-let
  // if (addAsContext) {
  //   const lexemeOld = getLexeme(state, parent.value)
  //   lexemeNew = {
  //     ...lexemeOld!,
  //     contexts: (lexemeOld?.contexts || []).concat(id),
  //     created: lexemeOld?.created || timestamp(),
  //     lastUpdated: timestamp(),
  //     updatedBy: clientId,
  //   }
  // } else {
  lexeme.contexts = !lexeme.contexts
    ? []
    : // floating thought (no context)
    path.length > 0
    ? [...lexeme.contexts, id]
    : lexeme.contexts
  // }

  const lexemeIndexUpdates = {
    [hashThought(lexeme.lemma)]: lexeme,
    ...(lexemeNew
      ? {
          [hashThought(lexemeNew.lemma)]: lexemeNew,
        }
      : null),
  }

  return updateThoughts(state, { lexemeIndexUpdates, thoughtIndexUpdates, idbSynced })
}

export default _.curryRight(createThought)
