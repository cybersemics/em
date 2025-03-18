import { css } from '../../../styled-system/css'
import favorite from '../../commands/favorite'
import note from '../../commands/note'
import PanelCommand from './PanelCommand'
import deleteCommand from '../../commands/delete'
import indent from '../../commands/indent'
import outdent from '../../commands/outdent'
import swapParent from '../../commands/swapParent'
import subcategorizeOne from '../../commands/subcategorizeOne'
import subcategorizeAll from '../../commands/subcategorizeAll'
import toggleDone from '../../commands/toggleDone'

/**
 * Component that displays the grid for the command menu.
 */
const PanelCommandGrid = () => {
  return (
    <div
      className={css({
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.5rem',
        padding: '0.5rem',
        maxWidth: '100%',
      })}
    >
      <PanelCommand command={toggleDone} size='small' />
      <PanelCommand command={note} size='small' />
      <PanelCommand command={favorite} size='small' />
      <PanelCommand command={deleteCommand} size='small' />
      <PanelCommand command={outdent} size='small' />
      <PanelCommand command={indent} size='small' />
      <PanelCommand command={swapParent} size='medium' />
      <PanelCommand command={subcategorizeOne} size='medium' />
      <PanelCommand command={subcategorizeAll} size='medium' />
    </div>
  )
}

export default PanelCommandGrid
