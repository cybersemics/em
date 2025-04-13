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
  commands: (Command | null)[]
  viewType: 'table' | 'grid'
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
}) => {
  const modalClasses = modalTextRecipe()

  return (
    <div className={css({ position: 'relative', willChange: 'transform' })}>
      <h2
        className={css({
          ...modalClasses,
          ...(viewType === 'grid' && {
            fontSize: '1.3rem',
            borderBottom: 'none',
            position: 'sticky',
            top: '-1.5rem',
            background: 'linear-gradient(to bottom, {colors.bg} 85%, transparent)',
            padding: '0.7rem 0',
            margin: '0.5rem 0',
            zIndex: 1,
          }),
        })}
      >
        {title}
      </h2>
      <CommandTableOnly
        commands={commands}
        selectedCommand={selectedCommand}
        customize={customize}
        onSelect={onSelect}
        search={search}
        applyIndexInToolbar
        viewType={viewType}
      />
    </div>
  )
}

export default CommandsGroup
