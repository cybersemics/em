import _ from 'lodash'
import { shallowEqual } from 'react-redux'
import { Action, StoreEnhancer, StoreEnhancerStoreCreator, UnknownAction } from 'redux'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import ThoughtspaceView from '../@types/ThoughtspaceView'
import UiState from '../@types/UiState'
import * as commands from '../actions'
import { CACHED_SETTINGS, EM_TOKEN } from '../constants'
import db, { thoughtspaceRuntime } from '../data-providers/thoughtspace'
import contextToThoughtId from '../selectors/contextToThoughtId'
import expandThoughts from '../selectors/expandThoughts'
import { getChildrenRanked } from '../selectors/getChildren'
import simplifyPath from '../selectors/simplifyPath'
import debugLog from '../util/debugLog'
import isAttribute from '../util/isAttribute'
import storage from '../util/storage'
import undoRedoEnhancer from './undoRedoEnhancer'

/** Refreshes the read-only document view after a complete command and before recording its history. */
const projectThoughts = (state: State, transaction?: ThoughtspaceTransaction): State => {
  if (!transaction && !thoughtspaceRuntime.ready) return state
  const thoughts = transaction?.project() ?? db.project()
  const thoughtUi = _.pickBy(state.thoughtUi, (_, id) => !!thoughts.getThought(id as ThoughtId))
  const sameUi = _.isEqual(thoughtUi, state.thoughtUi)
  if (thoughts === state.thoughts && sameUi) return state
  const projected = { ...state, thoughts, thoughtUi: sameUi ? state.thoughtUi : thoughtUi }
  return { ...projected, expanded: expandThoughts(projected, projected.cursor) }
}

/** Caches first-paint settings only after a document transaction succeeds. */
const cacheSettings = (state: State) => {
  for (const name of CACHED_SETTINGS) {
    const settingsId = contextToThoughtId(state, [EM_TOKEN, 'Settings', name])
    const setting = getChildrenRanked(state, settingsId).find(child => !isAttribute(child.value))
    if ((setting?.value || null) === storage.getItem(`Settings/${name}`)) continue
    if (setting?.value) storage.setItem(`Settings/${name}`, setting.value)
    else storage.removeItem(`Settings/${name}`)
  }
}

/** Captures changed sibling positions while the previous reader is valid; only plain log values escape the scope. */
const collectThoughtMoves = (
  before: Omit<ThoughtspaceView, 'getLexeme' | 'revision'>,
  after: Omit<ThoughtspaceView, 'getLexeme' | 'revision'>,
  actionType: string,
  changes?: ReturnType<ThoughtspaceTransaction['getChanges']>,
) => {
  try {
    const ids = changes ? new Set(changes.thoughtIds) : new Set(Array.from(after.values(), thought => thought.id))
    changes?.childrenChangedIds.forEach(id => {
      before.getChildren(id).forEach(child => ids.add(child))
      after.getChildren(id).forEach(child => ids.add(child))
    })
    return Array.from(ids).flatMap(id => {
      const thought = after.getThought(id)
      const old = before.getThought(id)
      if (!thought || !old) return []
      const oldRank = before.getPosition(id)
      const newRank = after.getPosition(id)
      return oldRank !== newRank || old.parentId !== thought.parentId
        ? [
            {
              actionType,
              id,
              value: thought.value.length > 100 ? `${thought.value.slice(0, 100)}…` : thought.value,
              oldRank,
              newRank,
              ...(old.parentId !== thought.parentId
                ? { oldParentId: old.parentId, newParentId: thought.parentId }
                : { parentId: thought.parentId }),
            },
          ]
        : []
    })
  } catch {
    // Logging must never reject a command.
    return []
  }
}

/** Runs synchronous document commands and publishes their completed editor/UI state. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const commandExecutionEnhancer: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <A extends Action<any>>(
    // Redux's enhancer signature accepts arbitrary state types; this app enhancer only receives State.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reducer: (state: any, action: A, transaction?: ThoughtspaceTransaction) => any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialState: any,
  ) => {
    const history = undoRedoEnhancer(reducer, { project: projectThoughts })
    let editorState: State = initialState
    const listeners = new Set<() => void>()
    const preparedState = Symbol('prepared UI state')
    type PreparedAction = A & { [preparedState]?: UiState }
    const store = createStore((state: UiState | undefined, action: PreparedAction): UiState => {
      if (preparedState in action) return action[preparedState]!
      if (state) return state
      editorState = editorState ?? reducer(undefined, action)
      const { thoughts: _thoughts, ...ui } = editorState
      return ui
    })
    let publishedCursorPath = editorState.cursor
      ? ([...simplifyPath(editorState, editorState.cursor)] as SimplePath)
      : null

    return {
      ...store,
      uiStore: store,
      getState: () => editorState,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
      dispatch: <T extends A>(action: T): T => {
        const state = editorState
        const handler = (commands as Index<{ requiresDocument?: boolean }>)[action.type]
        const needsDocument = handler?.requiresDocument || action.type === 'undo' || action.type === 'redo'
        let prepared: ReturnType<typeof history.prepare>
        let moves: ReturnType<typeof collectThoughtMoves> = []
        let operationCount = 0
        /** Publishes committed document and UI state before provider observers can start another command. */
        const publish = (next: State, persisted?: Promise<void>) => {
          prepared.commit()
          // The document is already committed. A best-effort first-paint cache must never prevent publication.
          try {
            if (next.thoughts !== state.thoughts) cacheSettings(next)
          } catch (error) {
            console.warn('Unable to cache first-paint settings', error)
          }
          if (moves.length <= 10) moves.forEach(move => debugLog.log('move', move))
          else debugLog.log('moveBatch', { actionType: action.type, count: moves.length, sample: moves.slice(0, 10) })
          if (persisted && next.thoughts !== state.thoughts) {
            if (debugLog.isEnabled()) debugLog.log('push', { operationCount })
            void persisted
              .then(() => debugLog.log('pushSynced'))
              .catch(error => {
                console.error('Thoughtspace persistence failed', error)
                debugLog.log('pushError', { error: String(error) })
              })
          }
          const { thoughts, ...ui } = next
          const sameUi = shallowEqual(store.getState(), ui)
          if (!sameUi || thoughts !== state.thoughts) {
            // Retain only the resolved cursor path before live reads advance or publication observers reenter.
            const cursorPath = next.cursor ? ([...simplifyPath(next, next.cursor)] as SimplePath) : null
            // Stage the combined read before Redux notifies UI subscribers, so a cursor never reads an older tree.
            editorState = next
            publishedCursorPath = cursorPath
          }
          if (!sameUi) store.dispatch(Object.assign({}, action, { [preparedState]: ui }))
          if (editorState !== state) Array.from(listeners).forEach(listener => listener())
        }
        if (needsDocument && thoughtspaceRuntime.ready) {
          db.transact(transaction => {
            const previous = debugLog.isEnabled() ? transaction.capturePrevious() : undefined
            prepared = history.prepare(state, action, transaction)
            const next = prepared.state
            operationCount = transaction.operationIds.length
            if (previous) moves = collectThoughtMoves(previous, next.thoughts, action.type, transaction.getChanges())
            return next
          }, publish)
        } else {
          prepared = history.prepare(
            state,
            action.type === 'replaceThoughts' ? { ...action, previousCursorPath: publishedCursorPath } : action,
          )
          const next = prepared.state
          const previous = (action as UnknownAction).previousThoughts as
            Omit<ThoughtspaceView, 'getLexeme' | 'revision'> | undefined
          if (debugLog.isEnabled() && previous) moves = collectThoughtMoves(previous, next.thoughts, action.type)
          publish(next)
        }
        return action
      },
    }
  }

export default commandExecutionEnhancer
