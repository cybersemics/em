import { useMemo } from 'react'
import Command from '../@types/Command'
import CommandId from '../@types/CommandId'
import { isTouch } from '../browser'
import { globalCommands } from '../commands'

/** A hook that sorts commands alphabetically by command.id. */
const useAlphabeticalCommands = (
  search: string,
  {
    platformCommandsOnly,
    recentCommands,
    sortActiveCommandsFirst,
  }: {
    platformCommandsOnly?: boolean
    recentCommands?: CommandId[]
    sortActiveCommandsFirst?: boolean
  } = {},
) => {
  const sortedCommands = useMemo(() => {
    if (!globalCommands) {
      return []
    }

    const filteredCommands = globalCommands.filter((command: Command) => {
      if (!command || !command.label || !command.id) {
        return false
      }

      if (command.id === 'help' || command.id === 'cancel') return false

      if (platformCommandsOnly) {
        if (isTouch && !command.gesture) return false
        if (!isTouch && !command.keyboard) return false
      }

      const label = command.label.toLowerCase()
      return search ? label.includes(search.toLowerCase()) : true
    })

    return filteredCommands.sort((a, b) => a.id.localeCompare(b.id))
  }, [search, platformCommandsOnly])

  return sortedCommands
}

export default useAlphabeticalCommands
