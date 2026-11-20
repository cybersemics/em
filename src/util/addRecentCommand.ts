import CommandId from '../@types/CommandId'
import { MAX_RECENT_COMMANDS } from '../constants'
import storageModel from '../stores/storageModel'

/** Moves a command to the front of the recent commands in local storage, dropping any earlier entry for it. Reads the stored list rather than a cached copy, so that every command universe that executes commands writes to the same list. */
const addRecentCommand = (commandId: CommandId) =>
  storageModel.set('recentCommands', recent =>
    [commandId, ...recent.filter(id => id !== commandId)].slice(0, MAX_RECENT_COMMANDS),
  )

export default addRecentCommand
