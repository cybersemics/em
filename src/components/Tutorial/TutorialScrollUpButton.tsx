import { FC, useCallback } from 'react'
import { css, cx } from '../../../styled-system/css'
import scrollTo from '../../device/scrollTo'
import usePositionFixed from '../../hooks/usePositionFixed'
import TutorialNavigationButton from './TutorialNavigationButton'

/** A button to scroll up to the tutorial. */
const TutorialScrollUpButton: FC<{ show: boolean }> = ({ show }) => {
  const positionFixedStyles = usePositionFixed()

  /** Scrolls to the top of the window. */
  const scrollUp = useCallback(() => {
    scrollTo('top', 'smooth')
  }, [])

  /** Approximate height of button in em used to animate in from out of view. */
  const BUTTON_HEIGHT = 2

  return (
    <div
      className={css({
        left: 0,

        // Turn off pointer events, otherwise this will block the close button.
        // The pointerEvents can be re-enabled for the button itself.
        pointerEvents: 'none',
        width: '100%',
      })}
      style={positionFixedStyles}
    >
      <div
        className={css({
          opacity: show ? 1 : 0,
          width: '100%',
          // for some reason without the additional height the button gets cropped
          paddingBottom: `${BUTTON_HEIGHT}em`,
          transition: `opacity {durations.fastDuration} ease-in-out, transform {durations.fastDuration} ease-in-out`,
          display: 'flex',
          justifyContent: 'center',
        })}
        style={{
          transform: `translateY(${show ? 0.5 : -BUTTON_HEIGHT}em)`,
        }}
      >
        <TutorialNavigationButton
          clickHandler={scrollUp}
          value='Scroll up for tutorial'
          classes={cx(
            css({
              // enable pointer events on the button to override pointerEvents none on the div above
              pointerEvents: 'all',
            }),
          )}
        />
      </div>
    </div>
  )
}

export default TutorialScrollUpButton
