import _ from 'lodash'
import { Suspense, lazy, useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { disableHelpGenieActionCreator as disableHelpGenie } from '../../actions/disableHelpGenie'

// The canvas brings in Pixi, which is only downloaded the first time the genie is let out. This keeps it out of the
// main bundle, and out of the JSDOM tests, which have no WebGL.
const GenieCanvas = lazy(() => import('./GenieCanvas'))

/**
 * Whether this browser can create a WebGL context, which the genie needs. Checked once, on first use, and the test
 * context is released straight away. Checked here rather than with Pixi, so a device without WebGL never downloads it.
 */
const hasWebGL = _.once(() => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  context?.getExtension('WEBGL_lose_context')?.loseContext()
  return !!context
})

/**
 * The help genie: a glowing orb with a tapering, sparkling trail that flies over the app.
 *
 * Redux decides when it appears and where it goes. The toggleHelpGenie action lets it out and puts it back, and the
 * genie buttons in the Command Universe header and the pinned command tooltip dispatch it. The moveHelpGenie action
 * sends it to a point. It also follows the pointer or a finger; whichever moved last is where it goes.
 *
 * It covers the whole viewport on the highest layer, above dialogs, and ignores pointer events, so it never blocks a
 * tap or a gesture.
 *
 * It screen-blends with the app, so it only ever adds light to what is beneath it. The blend is set here rather than on
 * the canvas: this element is fixed with a z-index, which makes it its own stacking context, and a blend inside it would
 * only mix with the empty overlay, letting the halo's near-black edge cover the app.
 *
 * If it cannot start on this device (no WebGL, its code fails to download, or it throws while running), it dispatches
 * disableHelpGenie, which puts it away and disables its buttons for the rest of the session.
 *
 * See GenieCanvas for how it is drawn, and docs/learning.md for the whole picture.
 */
const HelpGenie = () => {
  const dispatch = useDispatch()
  const visible = useSelector(state => state.helpGenie.visible)
  const target = useSelector(state => state.helpGenie.target)
  const canRun = visible && hasWebGL()

  useEffect(() => {
    if (visible && !canRun) {
      console.warn('The help genie needs WebGL, which is not available here.')
      dispatch(disableHelpGenie())
    }
  }, [canRun, dispatch, visible])

  return (
    canRun && (
      <div
        className={css({
          position: 'fixed',
          inset: 0,
          zIndex: 'helpGenie',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
        })}
      >
        <ErrorBoundary
          fallback={null}
          onError={error => {
            console.error('The help genie could not start.', error)
            dispatch(disableHelpGenie())
          }}
        >
          <Suspense fallback={null}>
            <GenieCanvas target={target} followPointer onUnavailable={() => dispatch(disableHelpGenie())} />
          </Suspense>
        </ErrorBoundary>
      </div>
    )
  )
}

export default HelpGenie
