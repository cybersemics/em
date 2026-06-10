import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'
import { FC, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import { css } from '../../styled-system/css'
import { redoActionCreator as redo } from '../actions/redo'
import { undoActionCreator as undo } from '../actions/undo'
import FadeTransition from './FadeTransition'

/** Undo slider that can rewind edits.. */
const UndoSlider: FC = () => {
  const showUndoSlider = useSelector(state => !!state.showUndoSlider)
  const valuePrevRef = useRef(0)
  const dispatch = useDispatch()
  const maxSteps = useSelector(state => Math.min(10, state.undoPatches.length + state.redoPatches.length))

  return (
    <FadeTransition in={showUndoSlider} type='medium' unmountOnExit>
      <div
        className={css({
          position: 'fixed',
          width: `calc(100% - 6em)`,
          zIndex: 'toolbarContainer',
          margin: '3.5em 3em 0',
        })}
      >
        <Slider
          key={maxSteps}
          defaultValue={0}
          min={0}
          max={maxSteps}
          step={1}
          reverse
          style={{ width: `${(maxSteps / 10) * 100}%` }}
          // rc-slider defaults the handle to `touch-action: pan-x`. When the handle lands in the scroll zone (where the app
          // intentionally does not preventDefault touchmove), the browser intermittently claims the drag as a horizontal pan,
          // leaving the slider unresponsive until the touch is held long enough to disambiguate. Forcing `touch-action: none`
          // on the slider elements makes the browser deliver every touch move to rc-slider instead (#4329).
          styles={{
            handle: { touchAction: 'none' },
            rail: { touchAction: 'none' },
            track: { touchAction: 'none' },
          }}
          onChange={value => {
            // onChange is called with the same value multiple times on touchmove, so check if the value has changed to short circuit early
            if (value === valuePrevRef.current) {
              return
            } else if (typeof value !== 'number') {
              console.warn('UndoSlider received a non-number value:', value)
              return
            }

            const diff = valuePrevRef.current - value
            valuePrevRef.current = value

            dispatch(
              Array.from({ length: Math.abs(diff) }).map(() => {
                return diff < 0 ? undo() : redo()
              }),
            )
          }}
        />
      </div>
    </FadeTransition>
  )
}

export default UndoSlider
