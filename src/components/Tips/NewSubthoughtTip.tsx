import { FC } from 'react'
import { useDispatch } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import GesturePath from '../../@types/GesturePath'
import TipId from '../../@types/TipId'
import { dismissTipActionCreator as dismissTip } from '../../actions/dismissTip'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { isMac, isTouch } from '../../browser'
import { gestureString } from '../../commands'
import newSubthoughtCommand from '../../commands/newSubthought'
import fastClick from '../../util/fastClick'
import GestureDiagram from '../GestureDiagram'
import Tip from './Tip'

/** A tip that explains how to add a new subthought. */
const NewSubthoughtTip: FC = () => {
  const dispatch = useDispatch()

  const commandKey = isMac ? '⌘' : 'Control'
  const returnKey = isMac ? 'Return' : 'Enter'
  const instructions = isTouch ? (
    <span>
      You can add a new subthought by swiping
      <GestureDiagram
        path={gestureString(newSubthoughtCommand) as GesturePath}
        size={30}
        color={token('colors.gray66')}
        cssRaw={css.raw({ verticalAlign: 'middle' })}
      />
    </span>
  ) : (
    <span>
      You can add a new subthought by pressing {commandKey} + {returnKey} on the keyboard. You can customize the toolbar
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

  return <Tip tipId={TipId.NewSubthought}>{instructions}</Tip>
}

NewSubthoughtTip.displayName = 'NewSubthoughtTip'

export default NewSubthoughtTip
