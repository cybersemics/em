import _ from 'lodash'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import { clientId } from '../data-providers/yjs'
import keyValueBy from '../util/keyValueBy'

interface Options {
  contextViews?: any
  cursor?: Path
  recentlyEdited?: Index<any>
  schemaVersion?: number
}

/** Merges recentlyEdited and schemaVersion into state. Do not invoke until clientId is ready. */
const loadLocalState = (state: State, { contextViews, cursor, recentlyEdited, schemaVersion }: Options) => ({
  ...state,
  contextViews: contextViews || state.contextViews,
  cursor: cursor || state.cursor,
  recentlyEdited: {
    ...state.recentlyEdited,
    ...recentlyEdited,
  },
  schemaVersion: schemaVersion || state.schemaVersion,
  // Set proper updatedBy now that clientId is ready.
  thoughts: {
    ...state.thoughts,
    thoughtIndex: {
      ...keyValueBy(state.thoughts.thoughtIndex, (id, thought) => ({
        [id]: thought.updatedBy
          ? thought
          : {
              ...thought,
              updatedBy: clientId,
            },
      })),
    },
    lexemeIndex: {
      ...keyValueBy(state.thoughts.lexemeIndex, (key, lexeme) => ({
        [key]: lexeme.updatedBy
          ? lexeme
          : {
              ...lexeme,
              updatedBy: clientId,
            },
      })),
    },
  },
})

export default _.curryRight(loadLocalState)
