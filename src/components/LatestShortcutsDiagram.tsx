import { FC, useEffect, useRef } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import GesturePath from '../@types/GesturePath'
import { globalShortcuts } from '../shortcuts'
import FadeTransition from './FadeTransition'
import GestureDiagram from './GestureDiagram'

interface LatestShortcutsDiagramProps {
  position?: 'middle' | 'bottom'
}

/**
 * Shows latest activated shortcuts diagram.
 */
const LatestShortcutsDiagram: FC<LatestShortcutsDiagramProps> = ({ position = 'middle' }) => {
  // const latestShortcuts = useSelector(state => state.latestShortcuts)
  const latestShortcuts = globalShortcuts.slice(0, 2)

  const latestShortcutsRef = useRef(latestShortcuts)
  const latestShortcutsElRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    latestShortcutsRef.current = latestShortcuts
  }, [latestShortcuts])

  // Note: On exiting we don't want to abruptly remove everything, so using previous data until component unmounts
  const shortcutsList = latestShortcuts.length === 0 ? latestShortcutsRef.current : latestShortcuts

  return (
    <div className={css({ position: 'absolute', height: '100vh', width: '100%' })}>
      <FadeTransition nodeRef={latestShortcutsElRef} in={latestShortcuts.length > 0} duration='medium' unmountOnExit>
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
          {shortcutsList.map(shortcut => {
            return (
              <div key={shortcut.id}>
                <div
                  className={css({
                    background: 'gestureDiagramWrapper',
                    borderRadius: '7px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: '0.7',
                    padding: '10px',
                    margin: '0 2px',
                  })}
                >
                  <GestureDiagram
                    path={shortcut.gesture as GesturePath}
                    size={30}
                    color={token('colors.fg')}
                    strokeWidth={2}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </FadeTransition>
    </div>
  )
}

export default LatestShortcutsDiagram
