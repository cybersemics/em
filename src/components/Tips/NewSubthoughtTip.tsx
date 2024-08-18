import { FC } from 'react'
import { useSelector } from 'react-redux'
import GesturePath from '../../@types/GesturePath'
import { dismissTipActionCreator as dismissTip } from '../../actions/dismissTip'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { isMac, isTouch } from '../../browser'
import themeColors from '../../selectors/themeColors'
import newSubthoughtShortcut from '../../shortcuts/newSubthought'
import store from '../../stores/app'
import fastClick from '../../util/fastClick'
import removeToolbarButton from '../../util/removeToolbarButton'
import GestureDiagram from '../GestureDiagram'
import Tip from './Tip'

interface NewSubthoughtTipProps {
  display: boolean
}

/** A tip that explains how to add a new subthought. */
const NewSubthoughtTip: FC<NewSubthoughtTipProps> = ({ display }) => {
  const colors = useSelector(themeColors)
  const commandKey = isMac ? 'COMMAND' : 'CONTROL'
  const returnKey = isMac ? 'RETURN' : 'ENTER'
  const instructions = isTouch ? (
    <span className='gesture-container'>
      You can add a new subthought by swiping
      <GestureDiagram path={newSubthoughtShortcut.gesture as GesturePath} size={30} color={colors.gray66} />
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '0.5em',
          }}
        >
          <a
            className='button'
            {...fastClick(() => {
              store.dispatch(dismissTip())
            })}
          >
            Okay
          </a>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '0.5em',
          }}
        >
          <a
            tabIndex={-1}
            {...fastClick(() => {
              removeToolbarButton('newSubthought')
              store.dispatch(dismissTip())
            })}
            className='button'
          >
            Remove this icon from the toolbar
          </a>
        </div>
        <div>
          (you can customize the toolbar in{' '}
          <a
            {...fastClick(() => {
              store.dispatch([dismissTip(), showModal({ id: 'settings' })])
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
