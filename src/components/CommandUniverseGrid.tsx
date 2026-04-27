import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import nonNull from '../util/nonNull'
import CommandItem from './CommandItem'

interface CommandUniverseGridProps {
  commands: Command[]
  selectedCommand?: Command
  onSelect?: (command: Command | null) => void
  onHover?: (command: Command) => void
  /** Search text that will be highlighted within the matched command title. */
  search?: string
}

/** Renders a 2-column grid of commands for the Command Universe surfaces. Pure presentation: receives pre-filtered commands and renders them. Chrome (search bar, sort button) lives in the parent. */
const CommandUniverseGrid = ({ commands, selectedCommand, onSelect, onHover, search }: CommandUniverseGridProps) => {
  const fontSize = useSelector(state => state.fontSize)
  return (
    <table className={css({ fontSize: '14px' })}>
      <tbody
        className={css({
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: '0.75rem',
        })}
        // anchor all `em` units used in children to `fontSize`
        style={{ fontSize }}
      >
        {commands.filter(nonNull).map(command => {
          const selected = selectedCommand && command.id === selectedCommand.id
          return (
            <CommandItem
              viewType='grid'
              key={command.id}
              onClick={
                onSelect &&
                ((_, command) => {
                  onSelect(selected ? null : command)
                })
              }
              onHover={onHover}
              selected={selected}
              command={command}
              search={search}
              alwaysShowDescription
              tableMode
            />
          )
        })}
      </tbody>
    </table>
  )
}

export default CommandUniverseGrid
