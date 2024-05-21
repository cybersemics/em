import classNames from 'classnames'
import React, { useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import Index from '../@types/IndexType'
import State from '../@types/State'
import { toggleSidebarActionCreator as toggleSidebar } from '../actions/toggleSidebar'
import distractionFreeTypingStore from '../stores/distractionFreeTyping'
import fastClick from '../util/fastClick'

/** Basic menu with three horizontal lines. */
function Menu(props: { className?: string; width?: number; height?: number; strokeWidth?: number }) {
  const width = `${props.width || 36}px`
  const height = `${props.height || 30}px`
  const halfHeight = `${parseInt(height.replace('px', '')) / 2}px`
  const strokeWidth = props.strokeWidth || 2
  const halfStrokeWidth = `-${strokeWidth / 2}px`

  const styles: Index<React.CSSProperties> = {
    container: {
      width,
      height,
      position: 'relative',
    },
    lineBase: {
      display: 'block',
      height: `${strokeWidth}px`,
      width: '100%',
      position: 'absolute',
    },
    firstLine: {
      marginTop: halfStrokeWidth,
    },
    secondLine: {
      top: halfHeight,
      marginTop: halfStrokeWidth,
    },
    thirdLine: {
      marginTop: height,
    },
  }

  return (
    <div style={styles.container} className={props.className}>
      <span style={{ ...styles.lineBase, ...styles.firstLine }}></span>
      <span style={{ ...styles.lineBase, ...styles.secondLine }}></span>
      <span style={{ ...styles.lineBase, ...styles.thirdLine }}></span>
    </div>
  )
}

/** An options menu with three little bars that looks like a hamburger. */
const HamburgerMenu = () => {
  const distractionFreeTyping = distractionFreeTypingStore.useState()
  const dispatch = useDispatch()
  const fontSize = useSelector<State, number>((state: State) => state.fontSize)
  const hamburgerMenuRef = useRef<HTMLDivElement>(null)

  const width = fontSize * 1.3
  const paddingTop = 15 + fontSize * 0.1

  return (
    <CSSTransition
      nodeRef={hamburgerMenuRef}
      in={!distractionFreeTyping}
      timeout={600}
      classNames='fade-600'
      unmountOnExit
    >
      <div
        ref={hamburgerMenuRef}
        aria-label='menu'
        className={classNames({
          'hamburger-menu': true,
          'z-index-hamburger-menu': true,
        })}
        style={{
          padding: `${paddingTop}px 15px 10px 15px`,
          position: 'fixed',
          cursor: 'pointer',
          top: 0,
        }}
        {...fastClick(() => {
          // TODO: Why does the sidebar not open with fastClick or onTouchEnd without a setTimeout?
          // onClick does not have the same problem
          setTimeout(() => {
            dispatch(toggleSidebar({}))
          }, 10)
        })}
      >
        <Menu width={width} height={width * 0.7} strokeWidth={fontSize / 20} />
      </div>
    </CSSTransition>
  )
}

export default HamburgerMenu
