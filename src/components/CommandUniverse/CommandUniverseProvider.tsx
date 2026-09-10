import { nanoid } from 'nanoid'
import { PropsWithChildren, useCallback, useLayoutEffect, useReducer, useRef } from 'react'
import CommandUniversePage from '../../@types/CommandUniversePage'
import CommandUniversePageNavigator from '../../@types/CommandUniversePageNavigator'
import CommandUniverseContext from './CommandUniverseContext'

type Motion = Pick<NonNullable<CommandUniversePageNavigator['transition']>, 'zoom' | 'origin'>

interface HistoryState {
  entries: { entryId: string; page: CommandUniversePage; arrival: Motion | null }[]
  index: number
  transition: CommandUniversePageNavigator['transition']
}

type HistoryAction =
  | { type: 'navigate'; id: string; page: CommandUniversePage; motion: Motion }
  | { type: 'back' | 'forward'; id: string }
  | { type: 'finish'; id: string }
  | { type: 'reset'; id: string; page: CommandUniversePage }

/** Updates the history entries without reading the DOM or knowing what a page contains. A new entry replaces
 * any transition still running, so navigation is never blocked by an animation. */
const reduceHistory = (state: HistoryState, action: HistoryAction): HistoryState => {
  if (action.type === 'reset') {
    return { entries: [{ entryId: action.id, page: action.page, arrival: null }], index: 0, transition: null }
  }
  if (action.type === 'finish') {
    return state.transition?.id === action.id ? { ...state, transition: null } : state
  }

  if (action.type === 'navigate') {
    // A new branch discards redo entries. The outgoing page is still in the retained prefix.
    const entries = [
      ...state.entries.slice(0, state.index + 1),
      { entryId: action.id, page: action.page, arrival: action.motion },
    ]
    return {
      entries,
      index: entries.length - 1,
      transition: {
        id: action.id,
        fromEntryId: state.entries[state.index].entryId,
        toEntryId: action.id,
        ...action.motion,
      },
    }
  }

  const index = state.index + (action.type === 'back' ? -1 : 1)
  if (index < 0 || index >= state.entries.length) return state
  // Back reverses the edge that led to the current page. Forward replays the destination's edge.
  const motion = state.entries[action.type === 'back' ? state.index : index].arrival!
  return {
    ...state,
    index,
    transition: {
      id: action.id,
      fromEntryId: state.entries[state.index].entryId,
      toEntryId: state.entries[index].entryId,
      origin: motion.origin,
      zoom: action.type === 'back' ? (motion.zoom === 'in' ? 'out' : 'in') : motion.zoom,
    },
  }
}

/** Every session starts at the registered grid page. */
const initialPage: CommandUniversePage = { pageId: 'grid', props: {} }

/** Owns one session directly. Consumers read its navigator through useCommandUniverseNavigator. */
const CommandUniverseProvider = ({ isOpen, children }: PropsWithChildren<{ isOpen: boolean }>) => {
  const [state, dispatch] = useReducer(reduceHistory, {
    entries: [{ entryId: 'root', page: initialPage, arrival: null }],
    index: 0,
    transition: null,
  })
  const wasOpen = useRef(isOpen)
  useLayoutEffect(() => {
    if (isOpen && !wasOpen.current) dispatch({ type: 'reset', id: nanoid(), page: initialPage })
    wasOpen.current = isOpen
  }, [isOpen])

  const open: CommandUniversePageNavigator['open'] = useCallback(
    (...args) => {
      if (!isOpen) return
      const [pageId, props, options = {}] = args
      // The tuple union enforces the id/props relationship at the public boundary.
      const page = { pageId, props } as CommandUniversePage
      dispatch({
        type: 'navigate',
        id: nanoid(),
        page,
        motion: {
          zoom: options.zoom ?? 'in',
          origin: options.origin
            ? { x: options.origin.x, y: options.origin.y, width: options.origin.width, height: options.origin.height }
            : null,
        },
      })
    },
    [isOpen],
  )
  const back = useCallback(() => {
    if (isOpen) dispatch({ type: 'back', id: nanoid() })
  }, [isOpen])
  const forward = useCallback(() => {
    if (isOpen) dispatch({ type: 'forward', id: nanoid() })
  }, [isOpen])
  const finishTransition = useCallback((id: string) => dispatch({ type: 'finish', id }), [])

  const navigator: CommandUniversePageNavigator = {
    entries: state.entries,
    activeEntryId: state.entries[state.index].entryId,
    isOpen,
    transition: state.transition,
    // Navigation stays available mid-zoom so a mistaken tap can be undone without waiting it out.
    canGoBack: isOpen && state.index > 0,
    canGoForward: isOpen && state.index < state.entries.length - 1,
    back,
    forward,
    open,
    finishTransition,
  }
  return <CommandUniverseContext.Provider value={navigator}>{children}</CommandUniverseContext.Provider>
}

export default CommandUniverseProvider
