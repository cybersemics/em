import { FC, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import GesturePath from '../@types/GesturePath'
import toMilliseconds from '../util/toMilliseconds'
import GestureDiagram from './GestureDiagram'

interface LatestShortcutsDiagramProps {
  position?: 'middle' | 'bottom'
}

/**
 * Shows latest activated shortcuts diagram.
 */
const LatestShortcutsDiagram: FC<LatestShortcutsDiagramProps> = ({ position = 'middle' }) => {
  const latestShortcuts = useSelector(state => state.latestShortcuts)

  const latestShortcutsRef = useRef(latestShortcuts)
  const latestShortcutsElRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    latestShortcutsRef.current = latestShortcuts
  }, [latestShortcuts])

  // Note: On exiting we don't want to abruptly remove everything, so using previous data until component unmounts
  const shortcutsList = latestShortcuts.length === 0 ? latestShortcutsRef.current : latestShortcuts

  return (
    <div className='latest-shortcuts-wrapper'>
      <CSSTransition
        nodeRef={latestShortcutsElRef}
        in={latestShortcuts.length > 0}
        classNames={{
          enter: css({ opacity: 0 }),
          enterActive: css({ opacity: 1, transition: `opacity ${token('durations.latestShortcutsOpacityDuration')}` }),
          exit: css({ opacity: 1 }),
          exitActive: css({ opacity: 0, transition: `opacity ${token('durations.latestShortcutsOpacityDuration')}` }),
        }}
        timeout={toMilliseconds(token('durations.latestShortcutsOpacityDuration'))}
        unmountOnExit
      >
        <div
          ref={latestShortcutsElRef}
          className={css({
            position: 'absolute',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 'latestShortcuts',
            pointerEvents: 'none',
            ...(position === 'middle' && { top: '30%' }),
            ...(position === 'bottom' && { bottom: '20%' }),
          })}
        >
          {shortcutsList.map((shortcut, index) => {
            return (
              <div key={shortcut.id} className='shortcut-tab-wrapper'>
                <div className='shortcut-tab'>
                  <GestureDiagram path={shortcut.gesture as GesturePath} size={30} color='white' strokeWidth={2} />
                </div>
              </div>
            )
          })}
        </div>
      </CSSTransition>
    </div>
  )
}

export default LatestShortcutsDiagram
