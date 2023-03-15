import classNames from 'classnames'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import Index from '../@types/IndexType'
import State from '../@types/State'
import toggleSidebar from '../action-creators/toggleSidebar'
import isTutorial from '../selectors/isTutorial'

/** Basic menu. */
function Menu(props: { className?: string; width?: number; height?: number; strokeWidth?: number }) {
  const width = `${props.width || 36}px`
  const height = `${props.height || 30}px`
  const halfHeight = `${parseInt(height.replace('px', '')) / 2}px`
  const strokeWidth = props.strokeWidth || 2
  const halfStrokeWidth = `-${strokeWidth / 2}px`

  /** Encodes translate3d. */
  const getTransformValue = (defaultPos: string | number, rotateVal: number) =>
    `translate3d(0,${defaultPos},0) rotate(0)`

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
      transform: getTransformValue(0, 45),
      marginTop: halfStrokeWidth,
    },
    secondLine: {
      top: halfHeight,
      marginTop: halfStrokeWidth,
    },
    thirdLine: {
      transform: getTransformValue(height, -45),
      marginTop: halfStrokeWidth,
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
  const showModal = useSelector((state: State) => state.showModal)
  const tutorial = useSelector(isTutorial)
  const error = useSelector((state: State) => state.error)
  const showSidebar = useSelector((state: State) => state.showSidebar)
  const distractionFreeTyping = useSelector((state: State) => state.distractionFreeTyping)
  const dispatch = useDispatch()
  const fontSize = useSelector<State, number>((state: State) => state.fontSize)

  const width = fontSize * 1.3
  const paddingTop = 15 + fontSize * 0.1

  return (
    <CSSTransition in={!distractionFreeTyping} timeout={600} classNames='fade-600' unmountOnExit>
      <div
        aria-label='menu'
        className={classNames({
          'hamburger-menu': true,
          // z-index of the wrapper is increased used to prevent sidebar swipeWidth component blocking the click events.
          [showSidebar || tutorial || error || showModal ? 'z-index-hide' : 'z-index-hamburger-menu']: true,
        })}
        style={{
          padding: `${paddingTop}px 15px 10px 15px`,
          position: 'fixed',
          cursor: 'pointer',
          // transisiton is used on z-index to only show up the hamburger menu after sidebar has properly closed.
          transition: showSidebar || tutorial || error || showModal ? '' : 'z-index 800ms linear',
          top: 0,
        }}
        onClick={() => {
          dispatch(toggleSidebar({}))
        }}
      >
        <Menu width={width} height={width * 0.7} strokeWidth={fontSize / 20} />
      </div>
    </CSSTransition>
  )
}

export default HamburgerMenu
