import React, { useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import { css } from '../../styled-system/css'
import Index from '../@types/IndexType'
import { toggleSidebarActionCreator as toggleSidebar } from '../actions/toggleSidebar'
import distractionFreeTypingStore from '../stores/distractionFreeTyping'
import fastClick from '../util/fastClick'

const lineClassName = css({
  display: 'block',
  width: '100%',
  position: 'absolute',
  background: 'fg',
})

/** Basic menu with three horizontal lines. */
function Menu(props: { width?: number; height?: number; strokeWidth?: number }) {
  const width = `${props.width || 36}px`
  const height = `${props.height || 30}px`
  const halfHeight = `${parseInt(height.replace('px', '')) / 2}px`
  const strokeWidth = props.strokeWidth || 2
  const halfStrokeWidth = `-${strokeWidth / 2}px`

  const styles: Index<React.CSSProperties> = {
    container: {
      width,
      height,
    },
    lineBase: {
      height: `${strokeWidth}px`,
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
    <div style={styles.container} className={css({ position: 'relative' })}>
      <span className={lineClassName} style={{ ...styles.lineBase, ...styles.firstLine }}></span>
      <span className={lineClassName} style={{ ...styles.lineBase, ...styles.secondLine }}></span>
      <span className={lineClassName} style={{ ...styles.lineBase, ...styles.thirdLine }}></span>
    </div>
  )
}

/** An options menu with three little bars that looks like a hamburger. */
const HamburgerMenu = () => {
  const distractionFreeTyping = distractionFreeTypingStore.useState()
  const dispatch = useDispatch()
  const fontSize = useSelector(state => state.fontSize)
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
        className={css({
          zIndex: 'hamburgerMenu',
          userSelect: 'none',
          position: 'fixed',
          cursor: 'pointer',
          /* prevent long press to select */
          /* user-select is not inherited */
          '& *': {
            userSelect: 'none',
          },
          // On macOS, if the user cancels a drag and then switches tabs, upon returning mouseup will fire at coordinates (0,0), triggering fastClick on any element located at (0,0).
          // Therefore, position the HamburgerMenu at top: 1px so that the sidebar is not accidentally opened on tab change.
          top: 1,
        })}
        style={{
          padding: `${paddingTop}px 15px 10px 15px`,
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
