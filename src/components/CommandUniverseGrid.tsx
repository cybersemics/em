import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import nonNull from '../util/nonNull'
import CommandUniverseGridItem from './CommandUniverseGridItem'

interface CommandUniverseGridProps {
  commands: Command[]
  /** Search text that will be highlighted within the matched command title. */
  search?: string
}

/** Renders a 2-column grid of commands for the Command Universe surfaces. Pure presentation: receives pre-filtered commands and renders them. Chrome (search bar, sort button) lives in the parent. */
const CommandUniverseGrid = ({ commands, search }: CommandUniverseGridProps) => {
  const fontSize = useSelector(state => state.fontSize)
  return (
    <div className={css({ fontSize: '14px' })}>
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: '0.5rem',
        })}
        // anchor all `em` units used in children to `fontSize`.
        style={{ fontSize }}
      >
        {commands.filter(nonNull).map(command => (
          <CommandUniverseGridItem key={command.id} command={command} search={search} />
        ))}
      </div>
    </div>
  )
}

export default CommandUniverseGrid
