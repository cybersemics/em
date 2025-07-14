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
    <div
      className={css({
        position: 'relative',
        // We need to create a new a stacking context for the sticky title – otherwise, there are some visual artifacts
        // when the title is sticky and the commands are scrolling on iOS.
        contain: 'layout paint',
      })}
    >
      <h2
        className={cx(
          modalClasses.subtitle,
          css({
            ...(viewType === 'grid' && {
              fontSize: '1.3rem',
              borderBottom: 'none',
              position: 'sticky',
              top: '-1.5rem',
              background: 'linear-gradient(to bottom, {colors.bg} 85%, transparent)',
              padding: '0.7rem 0',
              margin: '0.5rem 0 0 0',
              zIndex: 1,
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
