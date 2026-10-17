import { createRef } from 'react'
import toggleContextViewCommand from '../../commands/toggleContextView'
import PinnedCommandTooltip from '../Learning/PinnedCommandTooltip'
import ModalComponent from './ModalComponent'

/** How far the expanded ring reaches in from the screen edge in the live widget, fixed here so the snapshot does not depend on a ring. */
const RING_FOOTPRINT = 74.1

/** Modal used for the PinnedCommandTooltip snapshot test. Renders the open tooltip for Context View. */
const ModalTestPinnedCommandTooltip = () => (
  <ModalComponent id='testPinnedCommandTooltip' hideClose={true}>
    <PinnedCommandTooltip
      id='test-pinned-command-tooltip'
      command={toggleContextViewCommand}
      isOpen
      onClose={() => {}}
      onOpacityChange={() => {}}
      onReveal={() => {}}
      ringRef={createRef()}
      rowRef={createRef()}
      ringFootprint={RING_FOOTPRINT}
    />
  </ModalComponent>
)

export default ModalTestPinnedCommandTooltip
