import { css } from '../../../styled-system/css'
import PanelCommand from './PanelCommand'
import selectAllCommand from '../../commands/selectAll'

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
