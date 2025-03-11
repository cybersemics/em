import { FC } from 'react'
import { css } from '../../styled-system/css'
import { modalTextRecipe } from '../../styled-system/recipes'
import Command from '../@types/Command'
import CommandGridOnly from './CommandGridOnly'
import CommandTableOnly from './CommandTableOnly'

interface CommandsGroupProps {
  customize?: boolean
  onSelect?: (command: Command | null) => void
  selectedCommand?: Command
  title: string
  search?: string
  commands: (Command | null)[]
  isGrid?: boolean
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
  isGrid = false,
}) => {
  const modalClasses = modalTextRecipe()

  return (
    <div>
      <h2
        className={css({
          ...modalClasses,
          ...(isGrid
            ? {
                fontSize: '1.3rem',
                borderBottom: 'none',
                position: 'sticky',
                top: '-1.5rem',
                background: 'linear-gradient(to bottom, {colors.bg} 85%, transparent)',
                padding: '0.5rem 0',
                zIndex: 1,
              }
            : {
                subtitle: modalClasses.subtitle,
              }),
        })}
      >
        {title}
      </h2>
      {isGrid ? (
        <CommandGridOnly
          commands={commands}
          selectedCommand={selectedCommand}
          customize={customize}
          onSelect={onSelect}
          search={search}
          applyIndexInToolbar
        />
      ) : (
        <CommandTableOnly
          commands={commands}
          selectedCommand={selectedCommand}
          customize={customize}
          onSelect={onSelect}
          search={search}
          applyIndexInToolbar
        />
      )}
    </div>
  )
}

export default CommandsGroup
