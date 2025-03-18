import { css } from '../../../styled-system/css'
import favorite from '../../commands/favorite'
import note from '../../commands/note'
import selectAll from '../../commands/selectAll'
import PanelCommand from './PanelCommand'
import deleteCommand from '../../commands/delete'
import indent from '../../commands/indent'
import outdent from '../../commands/outdent'
import swapParent from '../../commands/swapParent'
import subcategorizeOne from '../../commands/subcategorizeOne'
import subcategorizeAll from '../../commands/subcategorizeAll'

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
      <PanelCommand command={selectAll} size='medium' />
      <PanelCommand command={note} size='medium' />
      <PanelCommand command={favorite} size='medium' />
      <PanelCommand command={deleteCommand} size='medium' />
      <PanelCommand command={outdent} size='medium' />
      <PanelCommand command={indent} size='medium' />
      <PanelCommand command={swapParent} size='medium' />
      <PanelCommand command={subcategorizeOne} size='medium' />
      <PanelCommand command={subcategorizeAll} size='medium' />
    </div>
  )
}

export default PanelCommandGrid
