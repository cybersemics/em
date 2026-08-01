import { FC } from 'react'
import { css } from '../../styled-system/css'
import { modalTextRecipe } from '../../styled-system/recipes'
import Command from '../@types/Command'
import CommandTableOnly from './CommandTableOnly'

interface CommandsGroupProps {
  customize?: boolean
  onSelect?: (command: Command | null) => void
  selectedCommand?: Command
  title: string
  search?: string
  commands: Command[]
  /** See: CommandItem['isMobileGestures']. */
  isMobileGestures: boolean
}
/**
 * A group of commands within a CommandTable (Help and CustomizeToolbar).
 */
const CommandsGroup: FC<CommandsGroupProps> = ({
  customize,
  onSelect,
  selectedCommand,
  commands,
  title,
  search,
  isMobileGestures,
}) => {
  const modalClasses = modalTextRecipe()

  return (
    <div
      className={css({
        position: 'relative',
        // Layout/paint containment — preserves the existing rendering in the table view (CustomizeToolbar etc.) where removing it produced subpixel diffs.
        contain: 'layout paint',
      })}
    >
      <h2 className={modalClasses.subtitle}>{title}</h2>
      <CommandTableOnly
        commands={commands}
        selectedCommand={selectedCommand}
        customize={customize}
        onSelect={onSelect}
        search={search}
        isMobileGestures={isMobileGestures}
      />
    </div>
  )
}

export default CommandsGroup
