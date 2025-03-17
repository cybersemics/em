import { css } from '../../../styled-system/css'
import selectAllCommand from '../../commands/selectAll'
import PanelCommand from './PanelCommand'

/**
 * Component that displays the grid for the command menu.
 */
const PanelCommandGrid = () => {
  return (
    <div
      className={css({
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        padding: '1rem',
      })}
    >
      <PanelCommand command={selectAllCommand} size='medium' />
    </div>
  )
}

export default PanelCommandGrid
