import { FC, useCallback } from 'react'
import { css } from '../../../styled-system/css'
import scrollTo from '../../device/scrollTo'
import usePositionFixed from '../../hooks/usePositionFixed'
import TutorialNavigationButton from './TutorialNavigationButton'

// approximate height of button in em used to animate in from out of view
const BUTTON_HEIGHT = 2

/** A button to scroll up to the tutorial. */
const TutorialScrollUpButton: FC<{ show: boolean }> = ({ show }) => {
  const positionFixedStyles = usePositionFixed()

  /** Scrolls smoothly to the top. */
  const scrollUp = useCallback(() => {
    scrollTo('top', 'smooth')
  }, [])

  return (
    <div
      style={{
        left: 0,
        // for some reason without the additional height the button gets cropped
        paddingBottom: `${BUTTON_HEIGHT}em`,
        // Turn off pointer events, otherwise this will block the close button.
        // The pointerEvents can be re-enabled for the button itself.
        pointerEvents: 'none',
        width: '100%',
        ...positionFixedStyles,
      }}
    >
      <div
        style={{
          opacity: show ? 1 : 0,
          width: '100%',
          transform: `translateY(${show ? 0.5 : -BUTTON_HEIGHT}em`,
          transition: 'opacity 0.25s ease-in-out, transform 0.25s ease-in-out',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <TutorialNavigationButton
          clickHandler={scrollUp}
          value='Scroll up for tutorial'
          classes={css({
            // enable pointer events on the button to override pointerEvents none on the div above
            pointerEvents: 'all',
          })}
        />
      </div>
    </div>
  )
}

export default TutorialScrollUpButton
