import { isFunction } from 'lodash'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import { createThoughtActionCreator as createThought } from '../actions/createThought'
import { updateThoughtsActionCreator as updateThoughts } from '../actions/updateThoughts'
import { replicateThought } from '../data-providers/yjs/thoughtspace'
import getLexemeSelector from '../selectors/getLexeme'
import isContextViewActive from '../selectors/isContextViewActive'
import thoughtToPath from '../selectors/thoughtToPath'
import hashThought from '../util/hashThought'
import headValue from '../util/headValue'
import removeContext from '../util/removeContext'

/** Checks for and repairs data integrity issues that are detected after a thought is fully replicated. Namely, it can remove Lexeme contexts that no longer have a corresponding thought, and it can restore Lexeme context parent's that have been removed. Unfortunately, data integrity issues are quite possible given that Thoughts and Lexemes are stored in separate Docs. */
export const repairThoughtActionCreator =
  (id: ThoughtId, thought: Thought | undefined): Thunk =>
  (dispatch, getState) => {
    // Repair Lexeme with invalid context by removing cxid of missing thought.
    // This can happen if thoughts with the same value are rapidly created and deleted, though it is rare.
    const state = getState()
    const cursorValue = state.cursor ? headValue(state, state.cursor) : null
    const cursorLexeme =
      state.cursor && isContextViewActive(state, state.cursor) ? getLexemeSelector(state, cursorValue!) : null

    if (cursorLexeme?.contexts.includes(id)) {
      // check for missing context
      // a thought should never be undefined after IDB and the Websocket server have synced
      if (!thought) {
        console.warn(`Thought ${id} missing from IndexedDB and Websocket server.`)

        dispatch(
          updateThoughts({
            thoughtIndexUpdates: {},
            lexemeIndexUpdates: {
              [hashThought(cursorValue!)]: removeContext(state, cursorLexeme, id),
            },
          }),
        )
        console.warn(`Removed context ${id} from Lexeme with no corresponding thought.`, {
          cursorLexeme,
        })
      }
      // repair invalid parent
      else {
        // replicating the parent should use the cached synced promise
        replicateThought(thought.parentId, { background: true }).then(parent => {
          if (parent) {
            const childKey = isFunction(thought.value) ? thought.value : thought.id
            if (!parent.childrenMap[childKey]) {
              // restore thought to parent
              dispatch((dispatch, getState) => {
                dispatch([
                  // delete the thought from its Lexeme first, as it may be incorrect and it will be recreated in createThought
                  updateThoughts({
                    thoughtIndexUpdates: {},
                    lexemeIndexUpdates: {
                      [hashThought(cursorValue!)]: removeContext(getState(), cursorLexeme, id),
                    },
                  }),
                  // add the missing thought to its parent
                  createThought({
                    id: thought.id,
                    path: thoughtToPath(getState(), parent.id),
                    value: thought.value,
                    rank: thought.rank,
                  }),
                ])
              })
              console.warn(
                `Repaired invalid Lexeme context: Thought ${id} restored to its parent ${thought.parentId} after not found in providers.`,
              )
            }
          } else {
            console.error(`Thought ${id} has a missing parent ${thought.parentId}.`)
          }
        })
      }
    }
  }
