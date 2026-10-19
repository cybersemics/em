import { FC } from 'react'
import { useDispatch } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import TipId from '../../@types/TipId'
import { dismissTipActionCreator as dismissTip } from '../../actions/dismissTip'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { isMac, isTouch } from '../../browser'
import { gestureString } from '../../commands'
import newSubthoughtCommand from '../../commands/newSubthought'
import useRemAsPx from '../../hooks/useRemAsPx'
import fastClick from '../../util/fastClick'
import GestureDiagram from '../GestureDiagram'
import Tip from './Tip'

/** A tip that explains how to add a new subthought. */
const NewSubthoughtTip: FC = () => {
  const dispatch = useDispatch()
  // Sized with the sentence it sits in.
  const diagramSize = useRemAsPx(1.875)

  const instructions = isTouch ? (
    <span>
      You can add a new subthought by swiping
      <GestureDiagram
        path={gestureString(newSubthoughtCommand)}
        size={diagramSize}
        color={token('colors.gray66')}
        className={css({ verticalAlign: 'middle' })}
      />
    </span>
  ) : (
    <span>
      You can add a new subthought by pressing {isMac ? '⌘' : 'Control'} + {isMac ? 'Return' : 'Enter'} on the keyboard.
      You can customize the toolbar in{' '}
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
