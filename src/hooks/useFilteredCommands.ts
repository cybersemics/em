import _ from 'lodash'
import { useMemo } from 'react'
import { useStore } from 'react-redux'
import Command from '../@types/Command'
import CommandId from '../@types/CommandId'
import State from '../@types/State'
import { isTouch } from '../browser'
import { gestureString, globalCommands } from '../commands'
import gestureStore from '../stores/gesture'

const visibleShortcuts = globalCommands.filter(shortcut => !shortcut.hideFromCommandPalette && !shortcut.hideFromHelp)

/** Returns true if the shortcut can be executed. */
const isExecutable = (state: State, shortcut: Command) =>
  (!shortcut.canExecute || shortcut.canExecute(state)) && (shortcut.allowExecuteFromModal || !state.showModal)

/** A hook that filters and sorts commands based on a search or the current gesture or keyboard input. */
const useFilteredCommands = (
  search: string,
  {
    platformShortcutsOnly,
    recentCommands,
    sortActiveCommandsFirst,
  }: {
    /** Only include commands that have shortcuts on the current platform (keyboard on desktop/gestures on mobile). */
    platformShortcutsOnly?: boolean
    recentCommands?: CommandId[]
    /** The search term to filter commands that match. */
    sortActiveCommandsFirst?: boolean
  },
) => {
  const gestureInProgress = gestureStore.useState()
  const store = useStore()

  const possibleShortcutsSorted = useMemo(() => {
    const possibleShortcuts = visibleShortcuts.filter(shortcut => {
      // gesture
      if (isTouch) {
        // only commands with gestures are visible
        return (
          (!platformShortcutsOnly || shortcut.gesture) &&
          gestureString(shortcut).startsWith(gestureInProgress as string)
        )
      }
      // keyboard
      else {
        // only commands with keyboard shortcuts are visible
        if (platformShortcutsOnly && !shortcut.keyboard) return false

        // if no query is entered, all commands with keyboard shortcuts are visible
        if (!search) return true

        const label = (
          sortActiveCommandsFirst && shortcut.labelInverse && shortcut.isActive?.(store.getState())
            ? shortcut.labelInverse!
            : shortcut.label
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
        shortcut.labelInverse && shortcut.isActive?.(store.getState()) ? shortcut.labelInverse : shortcut.label
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
            recentCommands &&
            recentCommands.length > 0 &&
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
  }, [gestureInProgress, sortActiveCommandsFirst, search, recentCommands, store, platformShortcutsOnly])

  return possibleShortcutsSorted
}

export default useFilteredCommands
