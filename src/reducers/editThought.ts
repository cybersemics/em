import _ from 'lodash'
import { treeChange } from '../util/recentlyEditedTree'
import { getLexeme, getAllChildren, getChildrenRanked, isPending, rootedParentOf, getParent } from '../selectors'
import updateThoughts from './updateThoughts'
import { Context, Index, Lexeme, Parent, Path, SimplePath, State, Timestamp } from '../@types'

// util
import {
  addContext,
  appendToPath,
  parentOf,
  equalArrays,
  equalThoughtRanked,
  hashContext,
  hashThought,
  head,
  headId,
  headRank,
  headValue,
  isDivider,
  keyValueBy,
  pathToContext,
  removeContext,
  timestamp,
  unroot,
} from '../util'

export interface editThoughtPayload {
  oldValue: string
  newValue: string
  context: Context
  showContexts?: boolean
  path: SimplePath
  rankInContext?: number
}

interface RecursiveUpdateResult {
  lexemeNew: Lexeme
  contextsOld: Context[]
  contextsNew: Context[]
  pending?: boolean
}

/** Changes the text of an existing thought. */
const editThought = (
  state: State,
  { oldValue, newValue, context, showContexts, path, rankInContext }: editThoughtPayload,
) => {
  if (oldValue === newValue || isDivider(oldValue)) return state

  const { cursor } = state
  // thoughts may exist for both the old value and the new value
  const thoughtIndex = { ...state.thoughts.thoughtIndex }
  // value is different than newValue in the context view
  const value = headValue(path)
  const rank = headRank(path)
  const oldKey = hashThought(oldValue)
  const newKey = hashThought(newValue)
  const lexemeOld = getLexeme(state, oldValue)
  const thoughtCollision = getLexeme(state, newValue)
  const thoughtParentOld = getLexeme(state, value)

  // guard against missing lexeme (although this should never happen)
  if (!lexemeOld) {
    console.error(`Lexeme not found: "${oldValue}"`)
    return state
  }

  const thoughtsOld = unroot(context).concat(oldValue)
  const thoughtsNew = unroot(context).concat(newValue)
  const contextEncodedOld = hashContext(thoughtsOld)
  const contextEncodedNew = hashContext(thoughtsNew)

  const grandParentPath = parentOf(parentOf(path))

  const pathLiveOld = showContexts
    ? appendToPath(
        grandParentPath,
        {
          id: hashContext(unroot([...pathToContext(grandParentPath), oldValue])),
          value: oldValue,
          rank: headRank(parentOf(path)),
        },
        head(path),
      )
    : appendToPath(parentOf(path), {
        id: hashContext(unroot([...pathToContext(parentOf(path)), oldValue])),
        value: oldValue,
        rank,
      })

  const pathLiveNew = showContexts
    ? appendToPath(
        parentOf(parentOf(path)),
        {
          id: hashContext(unroot([...pathToContext(grandParentPath), newValue])),
          value: newValue,
          rank: headRank(parentOf(path)),
        },
        head(path),
      )
    : appendToPath(parentOf(path), {
        id: hashContext(unroot([...pathToContext(parentOf(path)), newValue])),
        value: newValue,
        rank,
      })

  // find exact thought from thoughtIndex
  const exactThought = lexemeOld.contexts.find(
    thoughtContext => equalArrays(thoughtContext.context, context) && thoughtContext.rank === rank,
  )
  const id = headId(path) || exactThought!.id || null
  const archived = exactThought ? exactThought.archived : null
  const cursorNew =
    cursor &&
    appendToPath(
      parentOf(cursor),
      head(cursor).value === oldValue && head(cursor).rank === (rankInContext || rank)
        ? { ...head(cursor), value: newValue }
        : head(cursor),
    )

  const newPathParent = path.slice(0, path.length - 1) as Path

  const newPath = appendToPath(newPathParent, {
    id: hashContext(unroot([...pathToContext(newPathParent), newValue])),
    value: newValue,
    rank: rankInContext || rank,
  })

  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  let recentlyEdited = state.recentlyEdited // eslint-disable-line fp/no-let
  try {
    recentlyEdited = treeChange(state.recentlyEdited, path, newPath)
  } catch (e) {
    console.error('editThought: treeChange immer error')
    console.error(e)
  }

  // hasDescendantOfFloatingContext can be done in O(edges)
  // eslint-disable-next-line jsdoc/require-jsdoc
  const isThoughtOldOrphan = () => !lexemeOld.contexts || lexemeOld.contexts.length < 2
  // eslint-disable-next-line jsdoc/require-jsdoc
  const isThoughtOldSubthoughtless = () => getAllChildren(state, [oldValue]).length < 2

  // the old thought less the context
  const newOldThought =
    !isThoughtOldOrphan() || (showContexts && !isThoughtOldSubthoughtless())
      ? removeContext(lexemeOld, context, rank)
      : null

  // do not add floating thought to context
  const newThoughtWithoutContext = thoughtCollision || {
    value: newValue,
    contexts: [],
    created: timestamp(),
    lastUpdated: timestamp(),
  }
  const lexemeNew =
    lexemeOld.contexts.length > 0
      ? addContext(
          newThoughtWithoutContext,
          context,
          showContexts ? headRank(rootedParentOf(state, pathLiveOld)) : rank,
          id,
          archived as Timestamp,
        )
      : newThoughtWithoutContext

  // update local thoughtIndex so that we do not have to wait for firebase
  thoughtIndex[newKey] = lexemeNew

  // do not do anything with old thoughtIndex if hashes match, as the above line already took care of it
  if (oldKey !== newKey) {
    if (newOldThought) {
      thoughtIndex[oldKey] = newOldThought
    } else {
      delete thoughtIndex[oldKey] // eslint-disable-line fp/no-delete
    }
  }

  // if context view, change the contexts of the current thought (which is rendered visually as the parent of the context since are in the context view)
  let thoughtParentNew // eslint-disable-line fp/no-let
  if (showContexts) {
    thoughtParentNew = {
      value,
      ...thoughtParentOld,
      contexts: removeContext(thoughtParentOld!, parentOf(pathToContext(pathLiveOld)), rank).contexts.concat({
        context: thoughtsNew,
        rank,
        id: hashContext(unroot([...thoughtsNew, thoughtParentOld!.value])),
        ...(archived ? { archived } : {}),
      }),
      created: thoughtParentOld?.created || timestamp(),
      lastUpdated: timestamp(),
    }

    thoughtIndex[hashThought(value)] = thoughtParentNew
  }

  // preserve contextIndex
  const contextNew = showContexts ? thoughtsNew : context
  const contextNewEncoded = hashContext(contextNew)
  const thoughtNewSubthoughts = getAllChildren(state, contextNew)
    .filter(
      child =>
        !equalThoughtRanked(child, { value: oldValue, rank }) && !equalThoughtRanked(child, { value: newValue, rank }),
    )
    .concat({
      id: hashContext(unroot([...contextNew, showContexts ? value : newValue])),
      value: showContexts ? value : newValue,
      rank,
      lastUpdated: timestamp(),
      ...(archived ? { archived } : {}),
    })

  // preserve contextIndex
  const contextOld = showContexts ? thoughtsOld : context
  const contextOldEncoded = hashContext(contextOld)
  const thoughtOldSubthoughts = getAllChildren(state, contextOld).filter(
    child => !equalThoughtRanked(child, head(pathLiveOld)),
  )

  const contextParent = rootedParentOf(state, showContexts ? context : pathToContext(pathLiveOld))
  const contextParentEncoded = hashContext(contextParent)

  const thoughtParentSubthoughts = showContexts
    ? getAllChildren(state, contextParent)
        .filter(
          child =>
            (newOldThought ||
              !equalThoughtRanked(child, {
                value: oldValue,
                rank: headRank(rootedParentOf(state, pathLiveOld)),
              })) &&
            !equalThoughtRanked(child, {
              value: newValue,
              rank: headRank(rootedParentOf(state, pathLiveOld)),
            }),
        )
        // do not add floating thought to context
        .concat(
          lexemeOld.contexts.length > 0
            ? {
                id: hashContext(unroot([...contextParent, newValue])),
                value: newValue,
                rank: headRank(rootedParentOf(state, pathLiveOld)),
                lastUpdated: timestamp(),
                ...(id ? { id } : null),
                ...(archived ? { archived } : {}),
              }
            : [],
        )
    : []

  /**
   * Recursive function to change thought within the context of all descendants.
   *
   * @param contextRecursive The list of additional ancestors built up in recursive calls that must be concatenated to thoughtsNew to get the proper context.
   */
  const recursiveUpdates = (
    pathOld: Path,
    pathNew: Path,
    contextRecursive: Context = [],
    accumRecursive: Index<RecursiveUpdateResult> = {},
  ): Index<RecursiveUpdateResult> => {
    const context = pathToContext(pathOld)

    return getChildrenRanked(state, context).reduce((accum, child) => {
      const updatedAccum = {
        // merge ancestor updates
        ...accumRecursive,
        // merge sibling updates
        // Order matters: accum must have precendence over accumRecursive so that contextNew is correct
        ...accum,
      }

      const hashedKey = hashThought(child.value)
      // use updated thoughtIndex if available
      const childLexeme = updatedAccum[hashedKey]?.lexemeNew || getLexeme(state, child.value)
      const childOldPath = appendToPath(pathOld, child)
      const childNewPath = appendToPath(pathNew || pathOld, child)
      const childContext = [...context, child.value]

      // this should only happen if there is a thoughtIndex integrity violation
      if (!childLexeme) {
        // console.error(`Missing child ${child.value} in ${context}`)
        return {
          ...recursiveUpdates(childOldPath, childNewPath, contextRecursive.concat(child.value), updatedAccum),
        }
      }

      // remove and add the new context of the child
      const contextNew = thoughtsNew.concat(showContexts ? value : []).concat(contextRecursive)
      const lexemeNew = addContext(
        removeContext(childLexeme, context, child.rank),
        contextNew,
        child.rank,
        child.id ?? '',
        child.archived || timestamp(),
      )

      // update local thoughtIndex so that we do not have to wait for firebase
      thoughtIndex[hashedKey] = lexemeNew

      const accumNew = {
        ...updatedAccum,
        // merge current thought updates
        [hashedKey]: {
          lexemeNew,
          pending: isPending(state, childContext),
          // TODO: This could be improved by putting it directly into the form required by contextIndex to avoid later merging
          // use latest thoughtIndex here
          contextsOld: ((updatedAccum[hashedKey] || {}).contextsOld || []).concat([context]),
          contextsNew: ((updatedAccum[hashedKey] || {}).contextsNew || []).concat([contextNew]),
        } as RecursiveUpdateResult,
      }

      // merge all updates and pass them on to the recursive call
      return {
        ...accumNew,
        ...recursiveUpdates(childOldPath, childNewPath, contextRecursive.concat(child.value), accumNew),
      }
    }, {} as Index<RecursiveUpdateResult>)
  }

  // the lexeme updates made to the edited thought needs to be passed to the recursiveUdpates.
  const initialRecursiveUpdateIndex: Index<RecursiveUpdateResult> = {
    ...(newOldThought
      ? {
          [oldKey]: {
            lexemeNew: newOldThought,
            contextsOld: [],
            contextsNew: [],
            pending: isPending(state, contextOld),
          },
        }
      : {}),
    [newKey]: {
      lexemeNew: lexemeNew,
      contextsOld: [],
      contextsNew: [],
      pending: isPending(state, contextNew),
    },
  }

  const descendantUpdatesResult = recursiveUpdates(pathLiveOld, pathLiveNew, [], initialRecursiveUpdateIndex)
  const descendantUpdates = _.transform(
    descendantUpdatesResult,
    (accum, { lexemeNew }, key) => {
      accum[key] = lexemeNew
    },
    {} as Index<Lexeme>,
  )

  /* Unlike delete and move where we can resume on the pending thought, editThought should bail immediately if a pending thought is encountered and re-sync from the beginning after the pending descendants are loaded. This is because the editThought logic only works when starting on the edited thought itself; it won't work if it starts on a pending thought whose ancestor was edited. */
  let hitPending = false // eslint-disable-line fp/no-let

  const contextIndexDescendantUpdates = _.transform(
    descendantUpdatesResult,
    (accum, result) => {
      if (hitPending) return accum

      const output = keyValueBy(result.contextsOld, (contextOld, i) => {
        const contextNew = result.contextsNew[i]
        const contextOldEncoded = hashContext(contextOld)
        const contextNewEncoded = hashContext(contextNew)
        const thoughtsOld = getAllChildren(state, contextOld)
        const thoughtsNew = getAllChildren(state, contextNew)
        const isSameContext = hashContext(contextOld) === hashContext(contextNew)

        return {
          [contextOldEncoded]: null,
          [contextNewEncoded]: {
            ...(state.thoughts.contextIndex || {})[contextOldEncoded],
            context: contextNew,
            // if previous and new context is the same then do not duplicate children
            children: [...(isSameContext ? [] : thoughtsOld), ...thoughtsNew],
            lastUpdated: timestamp(),
          },
        }
      })

      if (result.pending) {
        hitPending = true
        return
      }

      // eslint-disable-next-line fp/no-mutating-assign
      Object.assign(accum, output)
    },
    {} as Index<Parent | null>,
  )

  if (hitPending) {
    return updateThoughts(state, {
      thoughtIndexUpdates: {},
      contextIndexUpdates: {},
      recentlyEdited: state.recentlyEdited,
      pendingEdits: [
        {
          context,
          oldValue,
          newValue,
          path,
          showContexts,
          rankInContext,
        },
      ],
    })
  }

  const thoughtIndexUpdates = {
    // if the hashes of oldValue and newValue are equal, lexemeNew takes precedence since it contains the updated thought
    [oldKey]: newOldThought,
    [newKey]: lexemeNew,
    ...descendantUpdates,
  }

  // @MIGRATION-FIX (Making Parent.id required)
  // The context will not be needed anymore to identify parent after independent editing. This is fix for migration.
  // Also way to handle thoughts edit inside context view will change later.
  const parentNew = getParent(state, contextNew)
  const parentOld = getParent(state, contextOld)
  const parent = getParent(state, contextParent)

  if (!parentNew || !parentOld || !parent) {
    console.error('Parent not found')
    return state
  }

  const contextIndexUpdates = {
    [contextNewEncoded]: {
      id: parentNew.id,
      value: head(contextNew),
      context: contextNew,
      children: thoughtNewSubthoughts,
      lastUpdated: timestamp(),
    },
    ...(showContexts
      ? {
          [contextOldEncoded]: {
            id: parentOld.id,
            value: head(contextOld),
            context: contextOld,
            children: thoughtOldSubthoughts,
            lastUpdated: timestamp(),
          },
          [contextParentEncoded]: {
            id: parent.id,
            value: head(contextParent),
            context: contextParent,
            children: thoughtParentSubthoughts,
            lastUpdated: timestamp(),
          },
        }
      : null),
    ...contextIndexDescendantUpdates,
  }

  // preserve contextViews
  const contextViewsNew = { ...state.contextViews }
  if (state.contextViews[contextEncodedNew] !== state.contextViews[contextEncodedOld]) {
    contextViewsNew[contextEncodedNew] = state.contextViews[contextEncodedOld]
    delete contextViewsNew[contextEncodedOld] // eslint-disable-line fp/no-delete
  }

  // new state
  // do not bump data nonce, otherwise editable will be re-rendered
  const stateNew: State = {
    ...state,
    cursor: cursorNew,
    contextViews: contextViewsNew,
  }

  return updateThoughts(stateNew, {
    thoughtIndexUpdates,
    contextIndexUpdates,
    recentlyEdited,
  })
}

export default _.curryRight(editThought)
