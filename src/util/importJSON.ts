import { Path } from '../types'
import { State } from './initialState'
import { EM_TOKEN, ROOT_TOKEN } from '../constants'
import { getRankAfter, getThought, getThoughts, nextSibling } from '../selectors'

// util
import {
  addThought,
  contextOf,
  createId,
  equalPath,
  equalThoughtRanked,
  hashContext,
  hashThought,
  head,
  headRank,
  pathToContext,
  removeContext,
  rootedContextOf,
  timestamp,
  unroot,
} from '../util'
import { Block } from '../action-creators/importText'

interface ImportHtmlOptions {
  skipRoot? : boolean,
}
interface InsertThoughtOptions {
  indent?: boolean,
  outdent?: boolean,
  insertEmpty?: boolean,
}

/** Convert JSON to thought updates. */
export const importJSON = (state: State, thoughtsRanked: Path, thoughtsJSON: Block[], { skipRoot }: ImportHtmlOptions = { skipRoot: false }) => {
  /** Return number of contexts in ThoughtJSON array. */
  const getContextsNum = (thoughts: Block[]): number => {
    return thoughts.map(thought => thought.children.length > 0 ? 1 + getContextsNum(thought.children) : 1).reduce((acc, val) => acc + val, 0)
  }

  // allow importing directly into em context
  const numContexts = getContextsNum(thoughtsJSON)
  const destThought = head(thoughtsRanked)
  const destValue = destThought.value
  const destRank = destThought.rank
  const thoughtIndexUpdates: State['thoughts']['thoughtIndex'] = {}
  const contextIndexUpdates: State['thoughts']['contextIndex'] = {}
  const context = pathToContext(contextOf(thoughtsRanked))
  const destEmpty = destValue === '' && getThoughts(state, pathToContext(thoughtsRanked)).length === 0
  const thoughtIndex = { ...state.thoughts.thoughtIndex }
  const rankStart = getRankAfter(state, thoughtsRanked)
  const next = nextSibling(state, destValue, context, destRank) // paste after last child of current thought
  const rankIncrement = next ? (next.rank - rankStart) / (numContexts || 1) : 1 // prevent divide by zero

  // keep track of the last thought of the first level, as this is where the selection will be restored to
  let lastThoughtFirstLevel = destThought // eslint-disable-line fp/no-let

  // if the thought where we are pasting is empty, replace it instead of adding to it
  if (destEmpty) {
    const thought = getThought(state, '')
    // @ts-ignore
    thoughtIndexUpdates[hashThought('')] =
      thought &&
      thought.contexts &&
      thought.contexts.length > 1
        ? removeContext(thought, context, headRank(thoughtsRanked))
        : null
    const rootedContext = pathToContext(rootedContextOf(thoughtsRanked))
    const contextEncoded = hashContext(rootedContext)
    contextIndexUpdates[contextEncoded] = {
      ...contextIndexUpdates[contextEncoded],
      children: getThoughts(state, rootedContext)
        .filter(child => !equalThoughtRanked(child, destThought)),
      lastUpdated: timestamp(),
    }
  }

  // modified during parsing
  const importCursor: Path = equalPath(thoughtsRanked, [{ value: EM_TOKEN, rank: 0 }])
    ? [...thoughtsRanked] // clone thoughtsRanked since importCursor is modified
    : contextOf(thoughtsRanked)

  // the rank will increment by rankIncrement each thought
  let rank = rankStart // eslint-disable-line fp/no-let

  // when skipRoot is true, keep track if the root has been skipped
  let rootSkipped = false // eslint-disable-line fp/no-let

  /** Returns true if the import cursor is still at the starting level. */
  const importCursorAtStart = () =>
    unroot(importCursor).length === unroot(thoughtsRanked).length

  /** Insert the accumulated value at the importCursor. Reset and advance rank afterwards. Modifies contextIndex and thoughtIndex. */
  const flushThought = (value: string, options?: InsertThoughtOptions) => {

    // do not insert the first thought if skipRoot
    if (skipRoot && !rootSkipped) {
      rootSkipped = true
    }
    // insert thought with accumulated text
    else {
      insertThought(value, options)
      // rank += rankIncrement
    }
  }

  /** Insert the given value at the importCursor. Modifies contextIndex and thoughtIndex. */
  const insertThought = (value: string, { indent, outdent, insertEmpty }: InsertThoughtOptions = {}) => {
    if (!value && !insertEmpty) return

    value = value.trim()
    const id = createId()

    const context = importCursor.length > 0
      // ? pathToContext(importCursor).concat(isNote ? value : [])
      ? pathToContext(importCursor)
      : [ROOT_TOKEN]

    // increment rank regardless of depth
    // ranks will not be sequential, but they will be sorted since the parser is in order
    const thoughtNew = addThought(
      {
        thoughts: {
          thoughtIndex
        }
      },
      value,
      rank,
      id,
      context
    )

    // save the first imported thought to restore the selection to
    if (importCursor.length === thoughtsRanked.length - 1) {
      lastThoughtFirstLevel = { value, rank }
    }

    // update thoughtIndex
    // keep track of individual thoughtIndexUpdates separate from thoughtIndex for updating thoughtIndex sources
    thoughtIndex[hashThought(value)] = thoughtNew
    thoughtIndexUpdates[hashThought(value)] = thoughtNew

    // update contextIndexUpdates
    const contextEncoded = hashContext(context)
    const childrenUpdates = contextIndexUpdates[contextEncoded] ? contextIndexUpdates[contextEncoded].children : []
    contextIndexUpdates[contextEncoded] = {
      ...contextIndexUpdates[contextEncoded],
      children: [...childrenUpdates, {
        value,
        rank,
        id,
        lastUpdated: timestamp(),
      }],
      lastUpdated: timestamp(),
    }

    // indent or outdent
    if (indent) {
      importCursor.push({ value, rank }) // eslint-disable-line fp/no-mutating-methods
    }
    else if (outdent) {
      // guard against going above the starting importCursor
      if (!importCursorAtStart()) {
        importCursor.pop() // eslint-disable-line fp/no-mutating-methods
      }
    }
  }

  /** Iterates through ThoughtJSON array and saves thoughts in contextIndexUpdates and thoughtIndexUpdates. */
  const saveThoughts = (thoughts: Block[]) => {
    thoughts.forEach(thought => {
      flushThought(thought.scope,
        {
          indent: thought.children.length > 0,
          insertEmpty: thought.scope === ''
        })
      rank += rankIncrement
      if (thought.children.length > 0) {
        saveThoughts(thought.children)
      }
    })
    rank += rankIncrement
    importCursor.pop() // eslint-disable-line fp/no-mutating-methods
  }

  saveThoughts(thoughtsJSON)

  return {
    contextIndexUpdates,
    lastThoughtFirstLevel,
    thoughtIndexUpdates,
  }
}
