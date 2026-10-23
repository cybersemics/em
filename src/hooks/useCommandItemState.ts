import { ReactNode } from 'react'
import { useSelector } from 'react-redux'
import Command from '../@types/Command'
import IconType from '../@types/IconType'
import SettingsIcon from '../components/icons/SettingsIcon'
import isCommandExecutable from '../selectors/isCommandExecutable'

interface CommandItemState {
  label: string
  description: string | undefined
  disabled: boolean
  isActive: boolean
  Icon: (icon: IconType) => ReactNode
}

/** Derives reactive labels, descriptions, availability, and icons for command rows. */
const useCommandItemState = (command: Command): CommandItemState => {
  const isActive = useSelector(state => command.isActive?.(state) ?? false)
  const disabled = useSelector(state => !isCommandExecutable(state, command))
  const label = command.labelInverse && isActive ? command.labelInverse : command.label
  const description = useSelector(state => {
    const descriptionStringOrFunction = (isActive && command.descriptionInverse) || command.description
    return typeof descriptionStringOrFunction === 'function'
      ? descriptionStringOrFunction(state)
      : descriptionStringOrFunction
  })

  return {
    label,
    description,
    disabled,
    isActive,
    Icon: command.svg ?? SettingsIcon,
  }
}

export default useCommandItemState
