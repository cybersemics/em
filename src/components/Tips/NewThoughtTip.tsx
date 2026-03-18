import { FC } from 'react'
import { useDispatch } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import TipId from '../../@types/TipId'
import { dismissTipActionCreator as dismissTip } from '../../actions/dismissTip'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { isMac, isTouch } from '../../browser'
import { gestureString } from '../../commands'
import newThoughtCommand from '../../commands/newThought'
import fastClick from '../../util/fastClick'
import GestureDiagram from '../GestureDiagram'
import Tip from './Tip'

/** A tip that explains how to add a new thought. */
const NewThoughtTip: FC = () => {
  const dispatch = useDispatch()
  const instructions = isTouch ? (
    <span>
      You can add a new thought by swiping
      <GestureDiagram
        path={gestureString(newThoughtCommand)}
        size={30}
        color={token('colors.gray66')}
        cssRaw={css.raw({ verticalAlign: 'middle' })}
      />
    </span>
  ) : (
    <span>
      You can add a new thought by pressing {isMac ? 'Return' : 'Enter'} on the keyboard. You can customize the toolbar
      in{' '}
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

  return <Tip tipId={TipId.NewThought}>{instructions}</Tip>
}

NewThoughtTip.displayName = 'NewThoughtTip'

export default NewThoughtTip
