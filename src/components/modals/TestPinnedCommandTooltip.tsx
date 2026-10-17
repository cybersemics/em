import { createRef } from 'react'
import toggleContextViewCommand from '../../commands/toggleContextView'
import PinnedCommandTooltip from '../Learning/PinnedCommandTooltip'
import ModalComponent from './ModalComponent'

/** The clearance the live widget measures for the expanded ring, fixed here so the snapshot does not depend on a ring. */
const RING_CLEARANCE = 58

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
      ringClearance={RING_CLEARANCE}
    />
  </ModalComponent>
)

export default ModalTestPinnedCommandTooltip
