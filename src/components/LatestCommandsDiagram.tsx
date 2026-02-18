import { FC, useEffect, useRef } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { gestureString, globalCommands } from '../commands'
import FadeTransition from './FadeTransition'
import GestureDiagram from './GestureDiagram'

/**
 * Shows latest activated commands diagram.
 */
const LatestCommandsDiagram: FC<{ position?: 'middle' | 'bottom' }> = ({ position = 'middle' }) => {
  const latestCommands = globalCommands.slice(0, 2)

  const latestCommandsRef = useRef(latestCommands)

  useEffect(() => {
    latestCommandsRef.current = latestCommands
  }, [latestCommands])

  // Note: On exiting we don't want to abruptly remove everything, so using previous data until component unmounts
  const commandsList = latestCommands.length === 0 ? latestCommandsRef.current : latestCommands

  return (
    <div className={css({ position: 'absolute', height: '100vh', width: '100%' })}>
      <FadeTransition in={latestCommands.length > 0} type='medium' unmountOnExit>
        <div
          className={css({
            position: 'absolute',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 'latestCommands',
            pointerEvents: 'none',
            ...(position === 'middle' && { top: '30%' }),
            ...(position === 'bottom' && { bottom: '20%' }),
          })}
        >
          {commandsList.map(command => {
            return (
              <div key={command.id}>
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
                  <GestureDiagram path={gestureString(command)} size={30} color={token('colors.fg')} strokeWidth={2} />
                </div>
              </div>
            )
          })}
        </div>
      </FadeTransition>
    </div>
  )
}

export default LatestCommandsDiagram
