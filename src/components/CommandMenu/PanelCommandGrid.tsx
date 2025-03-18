import { css } from '../../../styled-system/css'
import deleteCommand from '../../commands/delete'
import favorite from '../../commands/favorite'
import indent from '../../commands/indent'
import note from '../../commands/note'
import outdent from '../../commands/outdent'
import subcategorizeAll from '../../commands/subcategorizeAll'
import subcategorizeOne from '../../commands/subcategorizeOne'
import swapParent from '../../commands/swapParent'
import toggleDone from '../../commands/toggleDone'
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
        gap: '0.6rem',
        padding: '1.5rem 1.5rem 1rem',
        maxWidth: '100%',
        gridAutoRows: '1fr',
      })}
    >
      <PanelCommand command={{ ...toggleDone, label: 'Done' }} size='small' />
      <PanelCommand command={note} size='small' />
      <PanelCommand command={{ ...favorite, label: 'Favorite' }} size='small' />
      <PanelCommand command={deleteCommand} size='small' />
      <PanelCommand command={{ ...outdent, label: '' }} size='small' />
      <PanelCommand command={{ ...indent, label: '' }} size='small' />
      <PanelCommand command={swapParent} size='medium' />
      <PanelCommand command={subcategorizeOne} size='medium' />
      <PanelCommand command={subcategorizeAll} size='medium' />
    </div>
  )
}

export default PanelCommandGrid
