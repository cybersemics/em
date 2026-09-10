import { nanoid } from 'nanoid'
import { PropsWithChildren, useCallback, useLayoutEffect, useReducer, useRef } from 'react'
import CommandUniversePage from '../../@types/CommandUniversePage'
import CommandUniversePageNavigator from '../../@types/CommandUniversePageNavigator'
import CommandUniverseContext from './CommandUniverseContext'

interface HistoryState {
  entries: { entryId: string; page: CommandUniversePage }[]
  index: number
}

type HistoryAction =
  | { type: 'navigate'; id: string; page: CommandUniversePage }
  | { type: 'back' | 'forward' }
  | { type: 'reset'; id: string; page: CommandUniversePage }

/** Updates visit history without reading the DOM or knowing what a page contains. */
const reduceHistory = (state: HistoryState, action: HistoryAction): HistoryState => {
  if (action.type === 'reset') {
    return { entries: [{ entryId: action.id, page: action.page }], index: 0 }
  }

  if (action.type === 'navigate') {
    // A new branch discards the redo entries. The outgoing page stays in the retained prefix.
    const entries = [...state.entries.slice(0, state.index + 1), { entryId: action.id, page: action.page }]
    return { entries, index: entries.length - 1 }
  }

  const index = state.index + (action.type === 'back' ? -1 : 1)
  return index < 0 || index >= state.entries.length ? state : { ...state, index }
}

/** Every session starts at the registered grid page. */
const initialPage: CommandUniversePage = { pageId: 'grid', props: {} }

/** Owns one session directly. Consumers read its navigator through useCommandUniverseNavigator. */
const CommandUniverseProvider = ({ isOpen, children }: PropsWithChildren<{ isOpen: boolean }>) => {
  const [state, dispatch] = useReducer(reduceHistory, {
    entries: [{ entryId: 'root', page: initialPage }],
    index: 0,
  })
  const wasOpen = useRef(isOpen)
  useLayoutEffect(() => {
    if (isOpen && !wasOpen.current) dispatch({ type: 'reset', id: nanoid(), page: initialPage })
    wasOpen.current = isOpen
  }, [isOpen])

  const open: CommandUniversePageNavigator['open'] = useCallback(
    (...args) => {
      if (!isOpen) return
      const [pageId, props] = args
      // The tuple union enforces the id/props relationship at the public boundary.
      dispatch({ type: 'navigate', id: nanoid(), page: { pageId, props } as CommandUniversePage })
    },
    [isOpen],
  )
  const back = useCallback(() => {
    if (isOpen) dispatch({ type: 'back' })
  }, [isOpen])
  const forward = useCallback(() => {
    if (isOpen) dispatch({ type: 'forward' })
  }, [isOpen])

  const navigator: CommandUniversePageNavigator = {
    entries: state.entries,
    activeEntryId: state.entries[state.index].entryId,
    isOpen,
    canGoBack: isOpen && state.index > 0,
    canGoForward: isOpen && state.index < state.entries.length - 1,
    back,
    forward,
    open,
  }
  return <CommandUniverseContext.Provider value={navigator}>{children}</CommandUniverseContext.Provider>
}

export default CommandUniverseProvider
