import toggleContextViewCommand from '../../commands/toggleContextView'
import PinnedCommandTooltip from '../Learning/PinnedCommandTooltip'
import ModalComponent from './ModalComponent'

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
    />
  </ModalComponent>
)

export default ModalTestPinnedCommandTooltip
