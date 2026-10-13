import { useSelector } from 'react-redux'
import CommandId from '../@types/CommandId'
import { commandById } from '../commands'
import commandStateStore from '../stores/commandStateStore'

/** Subscribes to a command's formatting state and predicates without deciding how a surface presents them. */
const useCommandState = (commandId: CommandId) => {
  const command = commandById(commandId)
  const formattingActive = commandStateStore.useSelector(
    state => state[commandId as keyof typeof state] as boolean | undefined,
  )
  const active = useSelector(state => !command.isActive || command.isActive(state))
  const executable = useSelector(state => !command.canExecute || command.canExecute(state))
  const error = useSelector(state => (command.error ? command.error(state) : null))

  return { command, formattingActive, active, executable, error }
}

export default useCommandState
