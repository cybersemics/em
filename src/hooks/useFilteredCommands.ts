import _ from 'lodash'
import { useLayoutEffect, useMemo } from 'react'
import { useStore } from 'react-redux'
import Command from '../@types/Command'
import CommandId from '../@types/CommandId'
import State from '../@types/State'
import { isTouch } from '../browser'
import { chainCommand, gestureString, globalCommands } from '../commands'
import gestureStore from '../stores/gesture'

const visibleCommands = globalCommands.filter(command => !command.hideFromCommandPalette && !command.hideFromHelp)

/** Returns true if the command can be executed. */
const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showGestureCheatsheet)

/** A hook that filters and sorts commands based on a search or the current gesture or keyboard input. */
const useFilteredCommands = (
  search: string,
  {
    platformCommandsOnly,
    recentCommands,
    sortActiveCommandsFirst,
  }: {
    /** Only include commands that have commands on the current platform (keyboard on desktop/gestures on mobile). */
    platformCommandsOnly?: boolean
    recentCommands?: CommandId[]
    /** The search term to filter commands that match. */
    sortActiveCommandsFirst?: boolean
  },
): Command[] => {
  const gestureInProgress = gestureStore.useSelector(state => state.gesture as string)
  // The chainable command that is in progress (including when there are no other swipes). Otherwise null.
  const chainableCommandInProgressInclusive: Command | undefined = visibleCommands.find(
    command => command.isChainable && gestureInProgress.startsWith(gestureString(command)),
  )
  const store = useStore()

  const possibleCommandsSorted = useMemo(() => {
    // if a chainable command is in progress, extend the command list with chained commands (first command + second command)
    const visibleCommandsChained = [
      ...visibleCommands,
      ...(chainableCommandInProgressInclusive
        ? [
            // append chainable commands
            ...visibleCommands
              .filter(command => chainableCommandInProgressInclusive.isChainable?.(command))
              .map(command => chainCommand(chainableCommandInProgressInclusive, command)),
          ]
        : []),
    ]

    const possibleCommands = visibleCommandsChained.filter(command => {
      // Always include help command in gesture mode
      if (isTouch && command.id === 'openGestureCheatsheet') return true
      // Always exclude gestureCheatsheet command in keyboard mode
      if (!isTouch && command.id === 'openGestureCheatsheet') return false
      // Show cancel command on touch devices when a gesture is in progress
      if (isTouch && command.id === 'cancel' && gestureInProgress) return true
      // Always exclude cancel command in keyboard mode
      if (!isTouch && command.id === 'cancel') return false

      // gesture
      if (isTouch) {
        const commandGesture = gestureString(command)
        // collapse duplicate swipes when the command starts with the same character that the chainable gesture ends with
        const chainedGesture = commandGesture.slice(
          chainableCommandInProgressInclusive &&
            gestureString(chainableCommandInProgressInclusive).endsWith(commandGesture[0])
            ? 1
            : 0,
        )
        return (!platformCommandsOnly || command.gesture) && chainedGesture.startsWith(gestureInProgress)
      }
      // keyboard
      else {
        // only commands with keyboard shortcuts are visible
        if (platformCommandsOnly && !command.keyboard) return false

        // if no query is entered, all commands with keyboard shortcuts are visible
        if (!search) return true

        const label = (
          sortActiveCommandsFirst && command.labelInverse && command.isActive?.(store.getState())
            ? command.labelInverse
            : command.label
        ).toLowerCase()
        const chars = search.toLowerCase().split('')

        return (
          // include commands with at least one included char and no more than three chars non-matching chars
          // fuzzy matching will prioritize the best commands
          chars.some(char => char !== ' ' && label.includes(char)) &&
          search.split('').filter(char => char !== ' ' && !label.includes(char)).length <= 3
        )
      }
    })

    // sorted commands
    const sorted = _.sortBy(possibleCommands, command => {
      const label = (
        command.labelInverse && command.isActive?.(store.getState()) ? command.labelInverse : command.label
      ).toLowerCase()

      // In gesture mode, help command should always be at the end
      if (isTouch && (command.id === 'openGestureCheatsheet' || command.id === 'cancel')) return '\x99'
      // always sort exact match to top
      if (gestureInProgress === command.gesture || search.trim().toLowerCase() === label) return '\x00'
      // sort inactive commands to the bottom alphabetically
      else if (sortActiveCommandsFirst && !isExecutable(store.getState(), command)) return `\x98${label}`
      // sort gesture by length and then label
      // no padding of length needed since no gesture exceeds a single digit
      // Commands with fewer swipes appear first (e.g., "New Thought" with 'rd' before "New Subthought" with 'rdr') by adding length number before the label
      else if (gestureInProgress) {
        const gestureLength = gestureString(command).length
        return `\x01${gestureLength}${label}`
      }

      return (
        // prepend \x01 to sort after exact match and before inactive commands
        '\x01' +
        [
          // recent commands
          !search &&
            recentCommands &&
            recentCommands.length > 0 &&
            (() => {
              const i = recentCommands.indexOf(command.id)
              // if not found, sort to the end
              // pad with zeros so that the sort is correct for multiple digits
              return i === -1 ? 'z' : i.toString().padStart(5, '0')
            })(),
          // startsWith
          search && label.startsWith(search.trim().toLowerCase()) ? 0 : 1,
          // contains (n chars)
          // subtract from a large value to reverse order, otherwise commands with fewer matches will be sorted to the top
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
  }, [
    gestureInProgress,
    sortActiveCommandsFirst,
    search,
    recentCommands,
    store,
    platformCommandsOnly,
    chainableCommandInProgressInclusive,
  ])

  // persist possible commands to gestureStore so that they can be accessed by the onGestureSegment in commands.ts
  useLayoutEffect(() => {
    if (isTouch) {
      gestureStore.update({ possibleCommands: possibleCommandsSorted })
    }
  }, [possibleCommandsSorted])

  return possibleCommandsSorted
}

export default useFilteredCommands
