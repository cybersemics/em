import { FC } from 'react'
import { useDispatch } from 'react-redux'
import { css } from '../../../styled-system/css'
import { anchorButton } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import GesturePath from '../../@types/GesturePath'
import { dismissTipActionCreator as dismissTip } from '../../actions/dismissTip'
import { removeToolbarButtonActionCreator as removeToolbarButton } from '../../actions/removeToolbarButton'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { isMac, isTouch } from '../../browser'
import newSubthoughtShortcut from '../../shortcuts/newSubthought'
import fastClick from '../../util/fastClick'
import GestureDiagram from '../GestureDiagram'
import Tip from './Tip'

interface NewSubthoughtTipProps {
  display: boolean
}

/** A tip that explains how to add a new subthought. */
const NewSubthoughtTip: FC<NewSubthoughtTipProps> = ({ display }) => {
  const dispatch = useDispatch()

  const commandKey = isMac ? 'COMMAND' : 'CONTROL'
  const returnKey = isMac ? 'RETURN' : 'ENTER'
  const instructions = isTouch ? (
    <span>
      You can add a new subthought by swiping
      <GestureDiagram
        inGestureContainer
        path={newSubthoughtShortcut.gesture as GesturePath}
        size={30}
        color={token('colors.gray66')}
      />
    </span>
  ) : (
    `You can add a new subthought by pressing ${commandKey} + ${returnKey} on the keyboard`
  )
  return (
    <Tip display={display}>
      <p>
        <b>Tip</b>: {instructions}
      </p>
      <div>
        <div className={css({ display: 'flex', justifyContent: 'center', marginBottom: '0.5em' })}>
          <a
            className={anchorButton()}
            {...fastClick(() => {
              dispatch(dismissTip())
            })}
          >
            Okay
          </a>
        </div>
        <div className={css({ display: 'flex', justifyContent: 'center', marginBottom: '0.5em' })}>
          <a
            tabIndex={-1}
            {...fastClick(() => {
              dispatch([removeToolbarButton('newSubthought'), dismissTip()])
            })}
            className={anchorButton()}
          >
            Remove this icon from the toolbar
          </a>
        </div>
        <div>
          (you can customize the toolbar in{' '}
          <a
            {...fastClick(() => {
              dispatch([dismissTip(), showModal({ id: 'settings' })])
            })}
          >
            Settings
          </a>
          )
        </div>
      </div>
    </Tip>
  )
}

NewSubthoughtTip.displayName = 'NewSubthoughtTip'

export default NewSubthoughtTip
