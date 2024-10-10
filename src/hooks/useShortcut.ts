import _ from 'lodash'
import { useMemo, useState } from 'react'
import { useStore } from 'react-redux'
import Shortcut from '../@types/Shortcut'
import ShortcutId from '../@types/ShortcutId'
import State from '../@types/State'
import { isTouch } from '../browser'
import { gestureString, globalShortcuts } from '../shortcuts'
import gestureStore from '../stores/gesture'
import storageModel from '../stores/storageModel'

/**********************************************************************
 * Helper Functions
 **********************************************************************/

/** Returns true if the shortcut can be executed. */
const isExecutable = (state: State, shortcut: Shortcut) =>
  (!shortcut.canExecute || shortcut.canExecute(() => state)) && (shortcut.allowExecuteFromModal || !state.showModal)

/** A hook that filters and sorts shortcuts based on the current gesture or keyboard input. */
const useShortcut = ({
  includeRecentCommand = false,
  sortActiveCommandsFirst = true,
}: {
  includeRecentCommand?: boolean
  sortActiveCommandsFirst?: boolean
}) => {
  const gestureInProgress = gestureStore.useState()
  const [search, setSearch] = useState('')
  const visibleShortcuts = globalShortcuts.filter(
    shortcut => !shortcut.hideFromCommandPalette && !shortcut.hideFromHelp,
  )
  const [recentCommands, setRecentCommands] = useState<ShortcutId[]>(storageModel.get('recentCommands'))
  const store = useStore()

  const possibleShortcutsSorted = useMemo(() => {
    const possibleShortcuts = visibleShortcuts.filter(shortcut => {
      // gesture
      if (isTouch) {
        // only commands with gestures are visible
        return shortcut.gesture && gestureString(shortcut).startsWith(gestureInProgress as string)
      }
      // keyboard
      else {
        // only commands with keyboard shortcuts are visible
        if (!shortcut.keyboard) return false

        // if no query is entered, all commands with keyboard shortcuts are visible
        if (!search) return true

        const label = (
          shortcut.labelInverse && shortcut.isActive?.(store.getState) ? shortcut.labelInverse! : shortcut.label
        ).toLowerCase()
        const chars = search.toLowerCase().split('')

        return (
          // include shortcuts with at least one included char and no more than three chars non-matching chars
          // fuzzy matching will prioritize the best shortcuts
          chars.some(char => char !== ' ' && label.includes(char)) &&
          search.split('').filter(char => char !== ' ' && !label.includes(char)).length <= 3
        )
      }
    })

    // sorted shortcuts
    const sorted = _.sortBy(possibleShortcuts, shortcut => {
      const label = (
        shortcut.labelInverse && shortcut.isActive?.(store.getState) ? shortcut.labelInverse : shortcut.label
      ).toLowerCase()

      // always sort exact match to top
      if (gestureInProgress === shortcut.gesture || search.trim().toLowerCase() === label) return '\x00'
      // sort inactive shortcuts to the bottom alphabetically
      else if (sortActiveCommandsFirst && !isExecutable(store.getState(), shortcut)) return `\x99${label}`
      // sort gesture by length and then label
      // no padding of length needed since no gesture exceeds a single digit
      else if (gestureInProgress) return `\x01${label}`

      return (
        // prepend \x01 to sort after exact match and before inactive shortcuts
        '\x01' +
        [
          // recent commands
          !search &&
            includeRecentCommand &&
            (() => {
              const i = recentCommands.indexOf(shortcut.id)
              // if not found, sort to the end
              // pad with zeros so that the sort is correct for multiple digits
              return i === -1 ? 'z' : i.toString().padStart(5, '0')
            })(),
          // startsWith
          search && label.startsWith(search.trim().toLowerCase()) ? 0 : 1,
          // contains (n chars)
          // subtract from a large value to reverse order, otherwise shortcuts with fewer matches will be sorted to the top
          search &&
            (
              9999 -
              search
                .toLowerCase()
                .split('')
                .filter(char => char !== ' ' && label.includes(char)).length
            )
              .toString()
              .padStart(5, '0'),
          // all else equal, sort by label
          label,
        ].join('\x00')
      )
    })
    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestureInProgress, sortActiveCommandsFirst, search, recentCommands, store, includeRecentCommand])

  return {
    possibleShortcutsSorted,
    search,
    setSearch,
    recentCommands,
    setRecentCommands,
  }
}

export default useShortcut
