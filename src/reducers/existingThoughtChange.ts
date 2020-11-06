import _ from 'lodash'
import { treeChange } from '../util/recentlyEditedTree'
import { getThought, getAllChildren, getChildrenRanked } from '../selectors'
import updateThoughts from './updateThoughts'
import { State } from '../util/initialState'
import { Context, Index, Lexeme, Parent, SimplePath, Timestamp } from '../types'

// util
import {
  addContext,
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
  pathToContext,
  removeContext,
  rootedParentOf,
  timestamp,
  unroot,
} from '../util'

interface Payload {
  oldValue: string,
  newValue: string,
  context: Context,
  showContexts?: boolean,
  path: SimplePath,
  rankInContext?: number,
  contextChain?: SimplePath[],
}

interface RecursiveUpdateResult {
  newChild: Lexeme,
  context: Context,
  contextsOld: Context[],
  contextsNew: Context[],
}

/** Changes the text of an existing thought. */
const existingThoughtChange = (state: State, { oldValue, newValue, context, showContexts, path, rankInContext, contextChain }: Payload) => {
  if (oldValue === newValue || isDivider(oldValue)) return state

  const { cursor } = state
  // thoughts may exist for both the old value and the new value
  const thoughtIndex = { ...state.thoughts.thoughtIndex }
  const value = headValue(path)
  const rank = headRank(path)
  const oldKey = hashThought(oldValue)
  const newKey = hashThought(newValue)
  const thoughtOld = getThought(state, oldValue)
  const thoughtCollision = getThought(state, newValue)
  const thoughtParentOld = getThought(state, value)
  const thoughtsOld = unroot(context).concat(oldValue)
  const thoughtsNew = unroot(context).concat(newValue)
  const contextEncodedOld = hashContext(thoughtsOld)
  const contextEncodedNew = hashContext(thoughtsNew)
  const pathLiveOld = (showContexts
    ? parentOf(parentOf(path)).concat({ value: oldValue, rank: headRank(parentOf(path)) }).concat(head(path))
    : parentOf(path).concat({ value: oldValue, rank })) as SimplePath
  // find exact thought from thoughtIndex
  const exactThought = thoughtOld.contexts.find(thought => equalArrays(thought.context, context) && thought.rank === rank)
  const id = headId(path) || exactThought!.id as string
  const archived = exactThought ? exactThought.archived : null
  const cursorNew = cursor && parentOf(cursor).concat(head(cursor).value === oldValue && head(cursor).rank === (rankInContext || rank)
    ? { ...head(cursor), value: newValue }
    : head(cursor))
  const newPath = path.slice(0, path.length - 1).concat({ value: newValue, rank: rankInContext || rank })

  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  let recentlyEdited = state.recentlyEdited // eslint-disable-line fp/no-let
  try {
    recentlyEdited = treeChange(state.recentlyEdited, path, newPath)
  }
  catch (e) {
    console.error('existingThoughtChange: treeChange immer error')
    console.error(e)
  }

  // hasDescendantOfFloatingContext can be done in O(edges)
  // eslint-disable-next-line jsdoc/require-jsdoc
  const isThoughtOldOrphan = () => !thoughtOld.contexts || thoughtOld.contexts.length < 2
  // eslint-disable-next-line jsdoc/require-jsdoc
  const isThoughtOldSubthoughtless = () => getAllChildren(state, [oldValue]).length < 2

  // the old thought less the context
  const newOldThought = !isThoughtOldOrphan() || (showContexts && !isThoughtOldSubthoughtless())
    ? removeContext(thoughtOld, context, rank)
    : null

  // do not add floating thought to context
  const newThoughtWithoutContext = thoughtCollision || {
    value: newValue,
    contexts: [],
    created: timestamp(),
    lastUpdated: timestamp(),
  }
  const thoughtNew = thoughtOld.contexts.length > 0
    ? addContext(newThoughtWithoutContext, context, showContexts ? headRank(rootedParentOf(pathLiveOld)) : rank, id, archived as Timestamp)
    : newThoughtWithoutContext

  // update local thoughtIndex so that we do not have to wait for firebase
  thoughtIndex[newKey] = thoughtNew

  // do not do anything with old thoughtIndex if hashes match, as the above line already took care of it
  if (oldKey !== newKey) {
    if (newOldThought) {
      thoughtIndex[oldKey] = newOldThought
    }
    else {
      delete thoughtIndex[oldKey] // eslint-disable-line fp/no-delete
    }
  }

  // if context view, change the contexts of the current thought (which is rendered visually as the parent of the context since are in the context view)
  let thoughtParentNew // eslint-disable-line fp/no-let
  if (showContexts) {

    // eslint-disable-next-line fp/no-mutating-assign
    thoughtParentNew = Object.assign({}, thoughtParentOld, {
      contexts: removeContext(thoughtParentOld, parentOf(pathToContext(pathLiveOld)), rank).contexts.concat({
        context: thoughtsNew,
        id,
        rank,
        ...archived ? { archived } : {}
      }),
      created: thoughtParentOld.created,
      lastUpdated: timestamp(),
    })

    thoughtIndex[hashThought(value)] = thoughtParentNew
  }

  // preserve contextIndex
  const contextNew = showContexts ? thoughtsNew : context
  const contextNewEncoded = hashContext(contextNew)
  const thoughtNewSubthoughts = getAllChildren(state, contextNew)
    .filter(child =>
      !equalThoughtRanked(child, { value: oldValue, rank }) &&
      !equalThoughtRanked(child, { value: newValue, rank })
    )
    .concat({
      value: showContexts ? value : newValue,
      rank,
      id,
      lastUpdated: timestamp(),
      ...archived ? { archived } : {},
    })

  // preserve contextIndex
  const contextOld = showContexts ? thoughtsOld : context
  const contextOldEncoded = hashContext(contextOld)
  const thoughtOldSubthoughts = getAllChildren(state, contextOld)
    .filter(child => !equalThoughtRanked(child, head(pathLiveOld)))

  const contextParent = rootedParentOf(showContexts
    ? context
    : pathToContext(pathLiveOld)
  )
  const contextParentEncoded = hashContext(contextParent)

  const thoughtParentSubthoughts = showContexts ? getAllChildren(state, contextParent)
    .filter(child =>
      (newOldThought || !equalThoughtRanked(child, { value: oldValue, rank: headRank(rootedParentOf(pathLiveOld)) })) &&
      !equalThoughtRanked(child, { value: newValue, rank: headRank(rootedParentOf(pathLiveOld)) })
    )
    // do not add floating thought to context
    .concat(thoughtOld.contexts.length > 0 ? {
      value: newValue,
      id,
      rank: headRank(rootedParentOf(pathLiveOld)),
      lastUpdated: timestamp(),
      ...archived ? { archived } : {}
    } : [])
    : null

  /**
   * Recursive function to change thought within the context of all descendants.
   *
   * @param contextRecursive The list of additional ancestors built up in recursive calls that must be concatenated to thoughtsNew to get the proper context.
   */
  const recursiveUpdates = (context: Context, contextRecursive: Context = [], accumRecursive: Index<RecursiveUpdateResult> = {}): Index<RecursiveUpdateResult> => {

    return getChildrenRanked(state, context).reduce((accum, child) => {

      const hashedKey = hashThought(child.value)
      const childThought = getThought(state, child.value)

      // this should only happen if there is a thoughtIndex integrity violation
      if (!childThought) {
        // console.error(`Missing child ${child.value} in ${context}`)
        const accumNew = {
          ...accumRecursive,
          ...accum,
        }
        return {
          ...recursiveUpdates(context.concat(child.value), contextRecursive.concat(child.value), accumNew)
        }
      }

      // remove and add the new context of the child
      const contextNew = thoughtsNew.concat(showContexts ? value : []).concat(contextRecursive)
      const newChild = addContext(removeContext(childThought, context, child.rank), contextNew, child.rank, child.id!, child.archived!)

      // update local thoughtIndex so that we do not have to wait for firebase
      thoughtIndex[hashedKey] = newChild

      const accumNew = {
        // merge ancestor updates
        ...accumRecursive,
        // merge sibling updates
        // Order matters: accum must have precendence over accumRecursive so that contextNew is correct
        ...accum,
        // merge current thought updates
        [hashedKey]: {
          newChild,
          context,
          // return parallel lists so that the old contextIndex can be deleted and new contextIndex can be added
          // TODO: This could be improved by putting it directly into the form required by contextIndex to avoid later merging
          contextsOld: ((accumRecursive[hashedKey] || {}).contextsOld || []).concat([context]),
          contextsNew: ((accumRecursive[hashedKey] || {}).contextsNew || []).concat([contextNew])
        }
      }

      // merge all updates and pass them on to the recursive call
      return {
        ...accumNew,
        ...recursiveUpdates(context.concat(child.value), contextRecursive.concat(child.value), accumNew)
      }
    }, {} as Index<RecursiveUpdateResult>)
  }

  const descendantUpdatesResult = recursiveUpdates(pathToContext(pathLiveOld))
  const descendantUpdates = _.transform(descendantUpdatesResult, (accum, { newChild }, key) => {
    accum[key] = newChild
  }, {} as Index<Lexeme>)

  const contextIndexDescendantUpdates = _.transform(descendantUpdatesResult, (accum, result) => {
    const output = result.contextsOld.reduce((accumInner, contextOld, i) => {
      const contextNew = result.contextsNew[i]
      const contextOldEncoded = hashContext(contextOld)
      const contextNewEncoded = hashContext(contextNew)
      const thoughtsOld = getAllChildren(state, contextOld)
      const thoughtsNew = getAllChildren(state, contextNew)
      return {
        ...accumInner,
        [contextOldEncoded]: null,
        [contextNewEncoded]: {
          ...(state.thoughts.contextIndex || {})[contextOldEncoded],
          context: contextNew,
          children: [...thoughtsOld, ...thoughtsNew],
          lastUpdated: timestamp()
        }
      }
    }, {} as Index<Parent | null>)
    // eslint-disable-next-line fp/no-mutating-assign
    Object.assign(accum, output)
  }, {} as Index<Parent | null>)

  const thoughtIndexUpdates = {
    // if the hashes of oldValue and newValue are equal, thoughtNew takes precedence since it contains the updated thought
    [oldKey]: newOldThought,
    [newKey]: thoughtNew,
    ...descendantUpdates
  }

  const contextIndexUpdates = {
    [contextNewEncoded]: {
      context: contextNew,
      children: thoughtNewSubthoughts,
      lastUpdated: timestamp(),
    },
    ...showContexts ? {
      [contextOldEncoded]: {
        context: contextOld,
        children: thoughtOldSubthoughts,
        lastUpdated: timestamp(),
      },
      [contextParentEncoded]: {
        context: contextParent,
        children: thoughtParentSubthoughts,
        lastUpdated: timestamp(),
      }
    } : null,
    ...contextIndexDescendantUpdates
  }

  // preserve contextViews
  const contextViewsNew = { ...state.contextViews }
  if (state.contextViews[contextEncodedNew] !== state.contextViews[contextEncodedOld]) {
    contextViewsNew[contextEncodedNew] = state.contextViews[contextEncodedOld]
    delete contextViewsNew[contextEncodedOld] // eslint-disable-line fp/no-delete
  }

  // new state
  // do not bump data nonce, otherwise editable will be re-rendered
  const stateNew = {
    ...state,
    cursor: cursorNew,
    contextViews: contextViewsNew,
  }

  // @ts-ignore
  return updateThoughts(stateNew, { thoughtIndexUpdates, contextIndexUpdates, recentlyEdited, contextChain })
}

export default _.curryRight(existingThoughtChange)
