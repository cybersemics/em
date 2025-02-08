import { FC } from 'react'
import { useDispatch } from 'react-redux'
import { token } from '../../../styled-system/tokens'
import GesturePath from '../../@types/GesturePath'
import { dismissTipActionCreator as dismissTip } from '../../actions/dismissTip'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { isMac, isTouch } from '../../browser'
import { gestureString } from '../../commands'
import newThoughtCommand from '../../commands/newThought'
import fastClick from '../../util/fastClick'
import GestureDiagram from '../GestureDiagram'
import Tip from './Tip'

interface NewThoughtTipProps {
  display: boolean
}

/** A tip that explains how to add a new thought. */
const NewThoughtTip: FC<NewThoughtTipProps> = ({ display }) => {
  const dispatch = useDispatch()

  const returnKey = isMac ? 'Return' : 'Enter'
  const instructions = isTouch ? (
    <span>
      You can add a new thought by swiping
      <GestureDiagram
        inGestureContainer
        path={gestureString(newThoughtCommand) as GesturePath}
        size={30}
        color={token('colors.gray66')}
      />
    </span>
  ) : (
    <span>
      You can add a new thought by pressing {returnKey} on the keyboard. You can customize the toolbar in{' '}
      <a
        {...fastClick(() => {
          dispatch([dismissTip(), showModal({ id: 'settings' })])
        })}
      >
        Settings
      </a>
      .
    </span>
  )

  return <Tip display={display}>{instructions}</Tip>
}

NewThoughtTip.displayName = 'NewThoughtTip'

export default NewThoughtTip
