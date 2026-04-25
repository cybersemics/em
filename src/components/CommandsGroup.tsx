import { FC } from 'react'
import { css, cx } from '../../styled-system/css'
import { modalTextRecipe } from '../../styled-system/recipes'
import Command from '../@types/Command'
import { CommandViewType } from '../@types/CommandViewType'
import CommandTableOnly from './CommandTableOnly'

interface CommandsGroupProps {
  customize?: boolean
  onSelect?: (command: Command | null) => void
  selectedCommand?: Command
  title: string
  search?: string
  commands: Command[]
  viewType: CommandViewType
  /** See: CommandItem['isMobileGestures']. */
  isMobileGestures: boolean
}
/**
 * A component that displays a group of commands for CommandTable or CommandGrid.
 */
const CommandsGroup: FC<CommandsGroupProps> = ({
  customize,
  onSelect,
  selectedCommand,
  commands,
  title,
  search,
  viewType = 'table',
  isMobileGestures,
}) => {
  const modalClasses = modalTextRecipe()

  return (
    <div className={css({ position: 'relative' })}>
      <h2
        className={cx(
          modalClasses.subtitle,
          css({
            ...(viewType === 'grid' && {
              fontSize: '1.15rem',
              borderBottom: 'none',
              padding: '0.5rem 0 1rem 0',
              margin: '0.444rem 0 0 0',
            }),
          }),
        )}
      >
        {title}
      </h2>
      <CommandTableOnly
        commands={commands}
        selectedCommand={selectedCommand}
        customize={customize}
        onSelect={onSelect}
        search={search}
        viewType={viewType}
        isMobileGestures={isMobileGestures}
      />
    </div>
  )
}

export default CommandsGroup
