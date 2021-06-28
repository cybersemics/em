import classNames from 'classnames'
import React, { FC, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import { GesturePath } from '../types'
import { State } from '../util/initialState'
import GestureDiagram from './GestureDiagram'

interface LatestShortcutsDiagramProps {
  position?: 'middle' | 'bottom'
}

/**
 * Shows latest activated shorcuts diagram.
 */
const LatestShortcutsDiagram: FC<LatestShortcutsDiagramProps> = ({ position = 'middle' }) => {

  const latestShortcuts = useSelector((state: State) => state.latestShortcuts)

  const latestShortcutsRef = useRef(latestShortcuts)

  useEffect(() => {
    latestShortcutsRef.current = latestShortcuts
  }, [latestShortcuts])

  // Note: On exiting we don't want to abruptly remove everything, so using previous data until component unmounts
  const shortcutsList = latestShortcuts.length === 0 ? latestShortcutsRef.current : latestShortcuts

  return (
    <div className='latest-shortcuts-wrapper'>
      <CSSTransition in={latestShortcuts.length > 0} classNames={'latest-shortcuts-transition'} timeout={400} unmountOnExit={true}>
        <div className={classNames({
          'latest-shortcuts': true,
          [position]: true
        })}>
          {shortcutsList.map((shortcut, index) => {
            return (
              <div key={index} className='shortcut-tab-wrapper'>
                <div className='shortcut-tab'>
                  <GestureDiagram path={shortcut.gesture as GesturePath} size={30} color='white' strokeWidth={2}/>
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
